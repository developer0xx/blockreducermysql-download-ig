import {ig} from '../core/config'

const axios = require('axios');
const requirejs = require('requirejs');
import igFootprintService from './igFootprintService';
import igTradeBucketedService from './igTradeBucketedService';

let epics = [
  'CS.D.BITCOIN.CFD.IP',
  'IX.D.NASDAQ.IFD.IP',
  'CC.D.NG.UNC.IP',
  'CC.D.FGBL.UMA.IP'
];
let scales = ['1MINUTE', '5MINUTE', 'HOUR'];

const service = {
  'lightstreamerEndpoint': '',
  'cst': '',
  'x-security-token': '',
  'currentAccountId': '',
  epic: 'CS.D.BITCOIN.CFD.IP',
  scale: '1MINUTE',
  lsClient: undefined,
  subscription: {
    'CHART:CS.D.BITCOIN.CFD.IP:TICK': undefined,
    'CHART:CS.D.BITCOIN.CFD.IP:1MINUTE' : undefined
  },
  buffer: {
    'CHART:CS.D.BITCOIN.CFD.IP:TICK' : [],
    'CHART:CS.D.BITCOIN.CFD.IP:1MINUTE': []
  },
  checkTimeoutId: undefined,
  timeoutDelay: 30000,
  ioClient: undefined,
  workingIf: false
};

service.connect = (io) => {
  service.ioClient = io;
  requirejs.config({
    deps: [process.cwd() + '/lib/lightstreamer.js'],
    // v6.2.6 build 1678 - https://labs.ig.com/lightstreamer-downloads
    // http://www.lightstreamer.com/repo/distros/Lightstreamer_Allegro-Presto-Vivace_6_0_1_20150730.zip%23/Lightstreamer/DOCS-SDKs/sdk_client_javascript/doc/API-reference/index.html
    nodeRequire: require
  });
  axios({
    method: 'post',
    url: `${ig.baseUrl}/session`,
    data: {
      identifier: ig.identifier,
      password: ig.password,
      encryptedPassword: ig.encryptedPassword
    },
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json; charset=UTF-8',
      'VERSION': 2,
      'X-IG-API-KEY': ig['X-IG-API-KEY']
    }
  }).then(res => {
    // console.log('---------------', res.headers)
    service['cst'] = res.headers['cst'];
    service['x-security-token'] = res.headers['x-security-token'];
    service['lightstreamerEndpoint'] = res.data['lightstreamerEndpoint'];
    service['currentAccountId'] = res.data['currentAccountId'];
    service.connectToLightstreamer();
    service.checkWorking();
  }).catch(e => {
    console.log('e===============', e);
  });
};

// Connect to lightstreamer
service.connectToLightstreamer = () => {

  // include the Lightstreamer LightstreamerClient module using requirejs
  requirejs(['LightstreamerClient'], function (LightstreamerClient) {

    // Instantiate Lightstreamer client instance
    service.lsClient = new LightstreamerClient(service['lightstreamerEndpoint']);

    // Set up login credentials
    service.lsClient.connectionDetails.setUser(service['currentAccountId']);
    service.lsClient.connectionDetails.setPassword('CST-' + service['cst'] + '|XST-' + service['x-security-token']);

    // Add connection event listener callback functions
    // Note: the Lightstreamer library will transparently attempt to reconnect a number of times
    // in the event of communicationss errors
    service.lsClient.addListener({
      onListenStart: () => {
        console.log('Attempting connection to Lightstreamer');
      },
      onStatusChange: status => {
        console.log('Lightstreamer connection status: ' + status);
      },
      onServerError: (errorCode, errorMessage) => {
        console.log('Lightstreamer error: ' + errorCode + ' message: ' + errorMessage);
      }
    });

    // Connect to Lightstreamer
    service.lsClient.connect();
  });
};
service.disconnect = () => {
  if (service.lsClient) {
    service.lsClient.disconnect();
    service.lsClient = undefined;
  }
  service.workingIf = false;
};
service.checkWorking = () => {
  if (service.checkTimeoutId) {
    clearInterval(service.checkTimeoutId)
  }
  axios.get(`${ig.baseUrl}/markets/${service.epic}`, {
    headers: {
      'X-IG-API-KEY': ig['X-IG-API-KEY'],
      'CST': service['cst'],
      'X-SECURITY-TOKEN': service['x-security-token'],
      'Content-Type': 'application/json',
      'Accept': 'application/json; charset=UTF-8',
      'VERSION': 2
    }
  }).then(result => {
    console.log('result=====', result.data.snapshot.marketStatus);
    if (result.data.snapshot.marketStatus === 'TRADEABLE' && !service.workingIf) service.startWorking();
    if (result.data.snapshot.marketStatus !== 'TRADEABLE' && service.workingIf) service.disconnect();
  }).finally(() => {
    service.checkTimeoutId = setTimeout(service.checkWorking, service.timeoutDelay)
  })
};
service.startWorking = () => {
  service.workingIf = true;
  setTimeout(() => {
    epics.map((epic, i) => {
      // footprint service
      let subscription = {
        subscriptionMode: 'DISTINCT',
        items: `CHART:${epic}:TICK`,
        fields: ['BID', 'OFR', 'LTV'],
        maxFreq: 10
      };
      setTimeout(() => igFootprintService.subscribeToLightstreamer(service.ioClient, service.lsClient, subscription), 3000 * i);

      // trade bucked service
      scales.map((scale, j) => {
        let subscription = {
          subscriptionMode: 'MERGE',
          items: `CHART:${epic}:${scale}`,
          fields: ['OFR_OPEN', 'OFR_HIGH', 'BID_LOW', 'BID_CLOSE'],
          maxFreq: 10
        };
        setTimeout(() => igTradeBucketedService.subscribeToLightstreamer(service.lsClient, subscription), (3000 * i) + 1000 * j);
      })
    });
  }, 10000);

  setTimeout(() => igFootprintService.saveBuffer(), 25000);
  setTimeout(() => igFootprintService.calculateFootprint(), 30000)
  setTimeout(() => igFootprintService.calculateVolume(), 35000)

  setTimeout(() => igTradeBucketedService.saveBuffer(), 35000);
};
module.exports = service;
