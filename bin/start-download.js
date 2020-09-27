import cluster from 'cluster';
import SocketIO from 'socket.io';
import app from '../app';
import http from 'http';
import {server} from '../core/config';

import LightStreamerConnect from '../service/LightStreamerConnect';
import igFootprintService from '../service/igFootprintService';
import igTradeBucketedService from '../service/igTradeBucketedService';


let port;
let httpServer;
let io;

if (cluster.isMaster) {
  cluster.fork();
  cluster.on('exit', function (worker, code, signal) {
    cluster.fork();
  });
}

if (cluster.isWorker) {
  port = normalizePort(server.port);
  httpServer = http.createServer(app);
  io = SocketIO(httpServer);
  httpServer.listen(port);

  let epics = [
    'CS.D.BITCOIN.CFD.IP',
    'IX.D.NASDAQ.IFD.IP',
    'CC.D.NG.UNC.IP',
    'CC.D.FGBL.UMA.IP'
  ];
  let scales = ['1MINUTE', '5MINUTE', 'HOUR'];

  LightStreamerConnect.connect(io);

  // setTimeout(() => {
  //   epics.map((epic, i) => {
  //     // footprint service
  //     let subscription = {
  //       subscriptionMode: 'DISTINCT',
  //       items: `CHART:${epic}:TICK`,
  //       fields: ['BID', 'OFR', 'LTV'],
  //       maxFreq: 10
  //     };
  //     setTimeout(() => igFootprintService.subscribeToLightstreamer(io, LightStreamerConnect.lsClient, subscription), 3000 * i);
  //
  //     // trade bucked service
  //     scales.map((scale, j) => {
  //       let subscription = {
  //         subscriptionMode: 'MERGE',
  //         items: `CHART:${epic}:${scale}`,
  //         fields: ['OFR_OPEN', 'OFR_HIGH', 'BID_LOW', 'BID_CLOSE'],
  //         maxFreq: 10
  //       };
  //       setTimeout(() => igTradeBucketedService.subscribeToLightstreamer(LightStreamerConnect.lsClient, subscription), (3000 * i) + 1000 * j);
  //     })
  //   });
  // }, 10000);
  // setTimeout(() => igFootprintService.saveBuffer(), 25000);
  // setTimeout(() => igFootprintService.calculateFootprint(), 30000)
  // setTimeout(() => igFootprintService.calculateVolume(), 35000)
  //
  // setTimeout(() => igTradeBucketedService.saveBuffer(), 35000);
  // setTimeout(LightStreamerConnect.disconnect, 30000)
}

function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
