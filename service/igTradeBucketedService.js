import {dbTblName, ig} from '../core/config'

const axios = require('axios');
const requirejs = require('requirejs');
import dbConn from '../core/dbConn';
import {sprintf} from 'sprintf-js';

const service = {
  lsClient: undefined,
  subscription: {
    'CHART:CS.D.BITCOIN.CFD.IP:1MINUTE': undefined,
    'CHART:CS.D.BITCOIN.CFD.IP:5MINUTE': undefined,
    'CHART:CS.D.BITCOIN.CFD.IP:HOUR': undefined,
    'CHART:IX.D.NASDAQ.IFD.IP:1MINUTE': undefined,
    'CHART:IX.D.NASDAQ.IFD.IP:5MINUTE': undefined,
    'CHART:IX.D.NASDAQ.IFD.IP:HOUR': undefined,
    'CHART:CC.D.NG.UNC.IP:1MINUTE': undefined,
    'CHART:CC.D.NG.UNC.IP:5MINUTE': undefined,
    'CHART:CC.D.NG.UNC.IP:HOUR': undefined,
    'CHART:CC.D.FGBL.UMA.IP:1MINUTE': undefined,
    'CHART:CC.D.FGBL.UMA.IP:5MINUTE': undefined,
    'CHART:CC.D.FGBL.UMA.IP:HOUR': undefined,
  },
  buffer: {
    'CHART:CS.D.BITCOIN.CFD.IP:1MINUTE': [],
    'CHART:CS.D.BITCOIN.CFD.IP:5MINUTE': [],
    'CHART:CS.D.BITCOIN.CFD.IP:HOUR': [],
    'CHART:IX.D.NASDAQ.IFD.IP:1MINUTE': [],
    'CHART:IX.D.NASDAQ.IFD.IP:5MINUTE': [],
    'CHART:IX.D.NASDAQ.IFD.IP:HOUR': [],
    'CHART:CC.D.NG.UNC.IP:1MINUTE': [],
    'CHART:CC.D.NG.UNC.IP:5MINUTE': [],
    'CHART:CC.D.NG.UNC.IP:HOUR': [],
    'CHART:CC.D.FGBL.UMA.IP:1MINUTE': [],
    'CHART:CC.D.FGBL.UMA.IP:5MINUTE': [],
    'CHART:CC.D.FGBL.UMA.IP:HOUR': [],
  },
  tables : {
    'CHART:CS.D.BITCOIN.CFD.IP:1MINUTE': {symbol: 'IBTCUSD', binSize: '1m'},
    'CHART:CS.D.BITCOIN.CFD.IP:5MINUTE': {symbol: 'IBTCUSD', binSize: '5m'},
    'CHART:CS.D.BITCOIN.CFD.IP:HOUR': {symbol: 'IBTCUSD', binSize: '1h'},
    'CHART:IX.D.NASDAQ.IFD.IP:1MINUTE': {symbol: 'NASDAQ', binSize: '1m'},
    'CHART:IX.D.NASDAQ.IFD.IP:5MINUTE': {symbol: 'NASDAQ', binSize: '5m'},
    'CHART:IX.D.NASDAQ.IFD.IP:HOUR': {symbol: 'NASDAQ', binSize: '1h'},
    'CHART:CC.D.NG.UNC.IP:1MINUTE': {symbol: 'NG', binSize: '1m'},
    'CHART:CC.D.NG.UNC.IP:5MINUTE': {symbol: 'NG', binSize: '5m'},
    'CHART:CC.D.NG.UNC.IP:HOUR': {symbol: 'NG', binSize: '1h'},
    'CHART:CC.D.FGBL.UMA.IP:1MINUTE': {symbol: 'BUND', binSize: '1m'},
    'CHART:CC.D.FGBL.UMA.IP:5MINUTE': {symbol: 'BUND', binSize: '5m'},
    'CHART:CC.D.FGBL.UMA.IP:HOUR': {symbol: 'BUND', binSize: '1h'}
  },
  saveTimeoutId: undefined,
  footprintTimeoutId: undefined,
  timeoutDelay: 30000
}

// Subscribe to lightstreamer
service.subscribeToLightstreamer = (lsClient, {subscriptionMode, items, fields, maxFreq}) => {
  console.log('items========', items);
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
        // console.log('-------------', updateInfo.By);
        str = [];
        timestamp = new Date();
        updateInfo.By.includes('1MINUTE') && timestamp.setSeconds(0,0);
        updateInfo.By.includes('5MINUTE') && timestamp.setMinutes(Math.floor(timestamp.getMinutes() / 5) * 5, 0, 0);
        updateInfo.By.includes('HOUR') && timestamp.setMinutes(0, 0, 0);
        timestamp = timestamp.toISOString();
        str.push(timestamp);
        let status = true;
        updateInfo.forEachField((fieldName, fieldPos, value) => {
          if (!value) status = false;
          str.push(Number(value));
        });
        // console.log('status==========', status, updateInfo.By, str)
        if (status) {
          service.buffer[updateInfo.By].push(str);
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
  let sql = '';
  try {
    Object.keys(service.buffer).map(key => {
      // console.log('key=========', key, service.buffer[key]);
      const {symbol, binSize} = service.tables[key];
      if (service.buffer[key].length === 0) return;
        sql = sprintf("INSERT INTO `%s_%s_%s` VALUES ? ON DUPLICATE KEY UPDATE `open` = VALUES(`open`), `high` = VALUES(`high`), `low` = VALUES(`low`), `close` = VALUES(`close`);", dbTblName.tradeBucketed, symbol, binSize);
        dbConn.query(sql, [service.buffer[key]], (error, result, fields) => {
          if (error === null) service.buffer[key] = [];
          console.log('-------------', result, error, sql);
        });
    });
  } catch (e) {
    console.error('eeeeee', e);
  } finally {
    service.saveTimeoutId = setTimeout(service.saveBuffer, service.timeoutDelay)
  }
};


module.exports = service;
