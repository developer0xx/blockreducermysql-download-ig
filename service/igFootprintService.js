import {dbTblName, ig} from '../core/config'

const axios = require('axios');
const requirejs = require('requirejs');
import dbConn from '../core/dbConn';
import {sprintf} from 'sprintf-js';

const service = {
  lsClient: undefined,
  subscription: {
    'CHART:CS.D.BITCOIN.CFD.IP:TICK': undefined,
    'CHART:IX.D.NASDAQ.IFD.IP:TICK': undefined,
    'CHART:CC.D.NG.UNC.IP:TICK': undefined,
    'CHART:CC.D.FGBL.UMA.IP:TICK': undefined,
  },
  buffer: {
    'CHART:CS.D.BITCOIN.CFD.IP:TICK': [],
    'CHART:IX.D.NASDAQ.IFD.IP:TICK': [],
    'CHART:CC.D.NG.UNC.IP:TICK': [],
    'CHART:CC.D.FGBL.UMA.IP:TICK': [],
  },
  tables : {
    'CHART:CS.D.BITCOIN.CFD.IP:TICK': 'IBTCUSD',
    'CHART:IX.D.NASDAQ.IFD.IP:TICK': 'NASDAQ',
    'CHART:CC.D.NG.UNC.IP:TICK': 'NG',
    'CHART:CC.D.FGBL.UMA.IP:TICK': 'BUND'
  },
  saveTimeoutId: undefined,
  footprintTimeoutId: undefined,
  timeoutDelay: 30000,
  calcTimeoutId: undefined,
  ioServer: undefined,
  currentOrder : {
    IBTCUSD: {
      price: 0,
      side: null,
      size: 0
    },
    NASDAQ: {
      price: 0,
      side: null,
      size: 0
    },
    NG: {
      price: 0,
      side: null,
      size: 0
    },
    BUND: {
      price: 0,
      side: null,
      size: 0
    },
  }
};

// Subscribe to lightstreamer
service.subscribeToLightstreamer = (io, lsClient, {subscriptionMode, items, fields, maxFreq}) => {
  // console.log('items=====', items);
  /**
   * @param {string} subscriptionMode
   *  Permitted values are: MERGE, DISTINCT, RAW, COMMAND
   * @param {array} items
   *  Array of epics with format: 'L1:'+epics
   * @param {array} fields
   *  Permitted values are: MID_OPEN, HIGH, LOW, CHANGE, CHANGE_PCT, UPDATE_TIME, MARKET_DELAY, MARKET_STATE, BID, OFFER,
   *  STRIKE_PRICE, ODDS
   * @param {number} maxFreq
   *  Number of max updated per second
   */
  service.ioServer = io;
  service.lsClient = lsClient;
  if (Object.getOwnPropertyNames(service.lsClient).length === 0) {
    throw new Error('Lightstreamer is not connected');
  }

  // include the Lightstreamer Subscription module using requirejs
  requirejs(['Subscription'], function (Subscription) {

    let str = [];
    let timestamp = new Date();
    let colNames = ['RUN_TIME', 'EPIC'].concat(fields);
    str.push(colNames);
    // str.push(os.EOL);

    service.subscription[items] = new Subscription(subscriptionMode, items, fields);

    service.subscription[items].setRequestedMaxFrequency(maxFreq);

    // Set up Lightstreamer event listener
    service.subscription[items].addListener({

      onSubscription: function () {
        console.log('Subscribed to: ' + items);
      },

      onUnsubscription: function () {
        console.log('Unsubscribed');
      },

      onSubscriptionError: (code, message) => {
        console.log('Subscription failure: ' + code + ' message: ' + message);
      },

      onItemLostUpdates: () => {
        console.log('Update item lost');
      },

      onItemUpdate: updateInfo => {
        // console.log('footprint-------------', updateInfo);
        str = [];
        timestamp = new Date();
        timestamp = timestamp.toISOString();
        str.push(timestamp);
        let status = true;
        updateInfo.forEachField((fieldName, fieldPos, value) => {
          if (!value) status = false;
          str.push(Number(value));
        });
        // console.log('status==========', status, updateInfo.By, str)
        if (status) {
          let price = (Number(str[1]) + Number(str[2]))/2;
          let symbol = service.tables[updateInfo.By];
          symbol === 'NG' && console.log('compare=====', price < service.currentOrder[symbol].price);
          if (price !== service.currentOrder[symbol].price) {
            if (price < service.currentOrder[symbol].price) service.currentOrder[symbol].side = -1; // Sell
            if (price > service.currentOrder[symbol].price) service.currentOrder[symbol].side = 1;  // Buy
            service.currentOrder[symbol].price = price;
            service.currentOrder[symbol].size = str[3];
          }
          symbol === 'NG' && console.log('side===========', symbol, [str[0], service.currentOrder[symbol].price, service.currentOrder[symbol].side, service.currentOrder[symbol].size])
          service.buffer[updateInfo.By].push([str[0], service.currentOrder[symbol].price, service.currentOrder[symbol].side, service.currentOrder[symbol].size]);
          service.emitData(updateInfo.By, str);
        } else {
          // console.log('not working======', updateInfo.By)
        }
        //str.push(os.EOL);
        // updateInfo.By === 'CHART:CS.D.BITCOIN.CFD.IP:1MINUTE' && console.log(str.join(','));
      }
    });

    // Subscribe to Lightstreamer
    service.lsClient.subscribe(service.subscription[items]);

  });
};

service.saveBuffer = () => {
  if (service.saveTimeoutId) {
    clearTimeout(service.saveTimeoutId);
  }
  let symbol = '';
  let sql = '';
  try {
    Object.keys(service.buffer).map(key => {
      // console.log('key=========', key, service.buffer[key]);
      if (service.buffer[key].length === 0) {
        let sql1 = sprintf("UPDATE footprint_step SET `status` = 0 WHERE `symbol` = '%s'", symbol);
        dbConn.query(sql1, null, (e, r) => {
          // console.log('status reverse change====', r, e, sql1)
        });
        return;
      }
      symbol = service.tables[key];
      console.log('symbol========', symbol);
        sql = sprintf("INSERT INTO `%s_%s` VALUES ? ON DUPLICATE KEY UPDATE `price` = VALUES(`price`), `side` = VALUES(`side`), `size` = VALUES(`size`);", dbTblName.tradesBuffer, symbol);
        dbConn.query(sql, [service.buffer[key]], (error, result) => {
          if (error === null) service.buffer[key] = [];
          console.log('-----------', result, error, sql)
        });
      let sql1 = sprintf("UPDATE footprint_step SET `status` = 1 WHERE `symbol` = '%s'", symbol);
      dbConn.query(sql1, null, (e, r) => {
        // console.log('status change====', r, e, sql1)
      });
    });
  } catch (e) {
    console.error('eeeeee', e);
  } finally {
    service.saveTimeoutId = setTimeout(service.saveBuffer, service.timeoutDelay)
  }
};

service.calculateFootprint = () => {
  if (service.footprintTimeoutId) {
    clearTimeout(service.footprintTimeoutId);
  }
  let symbols = ['IBTCUSD', 'NASDAQ', 'NG', 'BUND'];
  symbols.map(symbol => {
    let footprint_step = 1;
    let timestamp0, timestamp1;
    timestamp0 = new Date();
    timestamp0.setSeconds(0, 0);
    timestamp1 = new Date(timestamp0.getTime() - 5 * 60 * 60 * 1000);
    timestamp1 = timestamp1.toISOString();
    let sql = sprintf("DELETE FROM `%s_%s` WHERE `timestamp` < '%s';", dbTblName.tradesBuffer, symbol, timestamp1);
    dbConn.query(sql, null, (error, result, fields) => {
      console.log('delete=====', result, error, sql);
    });
    timestamp0 = new Date();
    timestamp0.setMinutes(Math.floor(timestamp0.getMinutes() / 5) * 5, 0, 0);
    timestamp1 = new Date(timestamp0.getTime() + 5 * 60 * 1000);
    timestamp0 = timestamp0.toISOString();
    timestamp1 = timestamp1.toISOString();
    try {
      sql = sprintf("SELECT '%s' `timestamp`, ABS(FLOOR(`price`/ '%f') * '%f') `price`, `side` `side`, SUM(`size`) `count`, COUNT(`size`) `count_num` FROM `%s_%s` WHERE `timestamp` > '%s' AND `timestamp` <= '%s' GROUP BY `price`, `side` ORDER BY `price`;", timestamp1, footprint_step, footprint_step, dbTblName.tradesBuffer, symbol, timestamp0, timestamp1, footprint_step, footprint_step);
      dbConn.query(sql, null, (error, rows, fields) => {
        symbol === 'NG' && console.log('select============', rows, error, sql);
        if (error || rows.length === 0) {
          return;
        }
        let data = [];
        for (let row of rows) {
          data.push([row['timestamp'], row['price'], row['side'], row['count'], row['count_num']]);
        }
        sql = sprintf("INSERT INTO `%s_%s` VALUES ? ON DUPLICATE KEY UPDATE `count` = VALUES(`count`), `count_num` = VALUES(`count_num`);", dbTblName.footprint5m, symbol);
        dbConn.query(sql, [data], (error, rows, fields) => {
          // console.log('save======', rows, error, sql);
          if (error) {

          } else {
          }
        });
      });

      timestamp0 = new Date();
      timestamp0.setMinutes(0,0,0);
      timestamp1 = new Date(timestamp0.getTime() + 60 * 60 * 1000);
      timestamp0 = timestamp0.toISOString();
      timestamp1 = timestamp1.toISOString();

      sql = sprintf("SELECT '%s' `timestamp`, `price` `price`, `side` `side`, SUM(`count`) `count`,SUM(`count_num`) `count_num` FROM `%s_%s` WHERE `timestamp` > '%s' AND `timestamp` <= '%s' GROUP BY `price`, `side` ORDER BY `price`;", timestamp0, dbTblName.footprint5m, symbol, timestamp0, timestamp1);

      dbConn.query(sql, null, (error, rows, fields) => {
        if (error) {
          // console.error(JSON.stringify(error));
          return;
        }
        if (rows.length === 0) return;
        let data = [];
        for (let row of rows) {
          data.push([row['timestamp'], row['price'], row['side'], row['count'], row['count_num']]);
        }

        sql = sprintf("INSERT INTO `%s_%s` VALUES ? ON DUPLICATE KEY UPDATE `count` = VALUES(`count`), `count_num` = VALUES(`count_num`);", dbTblName.footprint1h, symbol);
        dbConn.query(sql, [data], (error, rows, fields) => {
          // console.log('save======', rows, error, sql);
          if (error) {
            // console.error(error);
          } else {
          }
        });
      });

    } catch (e) {
      console.error('eeeee', e);
    }
  });

  service.footprintTimeoutId = setTimeout(service.calculateFootprint, service.timeoutDelay);
};

service.calculateVolume = () => {
  if (service.calcTimeoutId) {
    clearTimeout(service.calcTimeoutId);
  }

  let sql;
  let timestamp1;
  let timestamp2;
  timestamp1 = new Date();
  timestamp1.setSeconds(0, 0);
  timestamp2 = new Date(timestamp1.getTime() - 5 * 60 * 60 * 1000);
  timestamp1 = timestamp1.toISOString();
  timestamp2 = timestamp2.toISOString();

  const symbols = ['IBTCUSD', 'NASDAQ', 'NG', 'BUND'];
  for (let symbol of symbols) {
    sql = sprintf("DELETE FROM `%s_%s` WHERE `timestamp` < '%s';", dbTblName.tradesBuffer, symbol, timestamp2);
    dbConn.query(sql, null, (error, result, fields) => {
    });

    timestamp1 = new Date();
    timestamp1.setSeconds(0, 0);
    timestamp2 = new Date(timestamp1.getTime() - 60 * 1000);
    timestamp1 = timestamp1.toISOString();
    timestamp2 = timestamp2.toISOString();
    sql = sprintf("SELECT IFNULL(SUM(`side` * `size`), 0) `volume` FROM `%s_%s` WHERE `timestamp` > '%s' AND `timestamp` <= '%s';", dbTblName.tradesBuffer, symbol, timestamp2, timestamp1);
    const volumeTimestamp1m = timestamp1;
    dbConn.query(sql, null, (error, rows, fields) => {
      console.log('select===========', symbol, rows, error)
      if (error) {
        // console.error(JSON.stringify(error));
        return;
      }
      const volume = rows[0]['volume'];
      console.log('volume------------', symbol, volume);
      sql = sprintf("INSERT INTO `%s_%s`(`timestamp`, `volume`) VALUES('%s', '%s') ON DUPLICATE KEY UPDATE `volume` = VALUES(`volume`);", dbTblName.volume1m, symbol, volumeTimestamp1m, volume);
      dbConn.query(sql, null, (error, rows, fields) => {
        // console.log('volume=======', rows, error, sql);
      });
    });

    timestamp1 = new Date();
    timestamp1.setMinutes(Math.floor(timestamp1.getMinutes() / 5) * 5, 0, 0);
    timestamp2 = new Date(timestamp1.getTime() - 5 * 60 * 1000);
    timestamp1 = timestamp1.toISOString();
    timestamp2 = timestamp2.toISOString();
    sql = sprintf("SELECT IFNULL(SUM(`side` * `size`), 0) `volume` FROM `%s_%s` WHERE `timestamp` > '%s' AND `timestamp` <= '%s';", dbTblName.tradesBuffer, symbol, timestamp2, timestamp1);
    const volumeTimestamp5m = timestamp1;
    dbConn.query(sql, null, (error, rows, fields) => {
      if (error) {
        // console.error(JSON.stringify(error));
        return;
      }
      const volume = rows[0]['volume'];
      sql = sprintf("INSERT INTO `%s_%s`(`timestamp`, `volume`) VALUES('%s', '%s') ON DUPLICATE KEY UPDATE `volume` = VALUES(`volume`);", dbTblName.volume5m, symbol, volumeTimestamp5m, volume);
      dbConn.query(sql, null, (error, rows, fields) => {
      });
    });

    timestamp1 = new Date();
    timestamp1.setMinutes(0, 0, 0);
    timestamp2 = new Date(timestamp1.getTime() - 60 * 60 * 1000);
    timestamp1 = timestamp1.toISOString();
    timestamp2 = timestamp2.toISOString();
    sql = sprintf("SELECT IFNULL(SUM(`side` * `size`), 0) `volume` FROM `%s_%s` WHERE `timestamp` > '%s' AND `timestamp` <= '%s';", dbTblName.tradesBuffer, symbol, timestamp2, timestamp1);
    const volumeTimestamp1h = timestamp1;
    dbConn.query(sql, null, (error, rows, fields) => {
      if (error) {
        // console.error(JSON.stringify(error));
        return;
      }
      const volume = rows[0]['volume'];
      sql = sprintf("INSERT INTO `%s_%s`(`timestamp`, `volume`) VALUES('%s', '%s') ON DUPLICATE KEY UPDATE `volume` = VALUES(`volume`);", dbTblName.volume1h, symbol, volumeTimestamp1h, volume);
      dbConn.query(sql, null, (error, rows, fields) => {
      });
    });
  }

  service.calcTimeoutId = setTimeout(service.calculateVolume, service.timeoutDelay);
  //console.log('bitmexCalculateVolume', service.tradeLastTimestamp);
};

service.emitData = (event, data) => {
  if (service.ioServer !== undefined) {
    // console.log('socket=======>', event, data);
    service.ioServer.sockets.emit(event, data);
  }
};

module.exports = service;
