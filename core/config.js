module.exports = {
  server: {
    port: 802
  },
  mysql: {
    connectionLimit: 10,
    host: '104.238.184.18',
    user: 'testuser',
    password: 'testuser',
    database: 'blockreducer2',
    port: 3306,
    connectTimeout: 15000
  },
  dbTblName: {
    tradeBucketed: 'trade_bucketed',
    tradeBucketed1m: 'trade_bucketed_1m',
    tradeBucketed5m: 'trade_bucketed_5m',
    tradeBucketed1h: 'trade_bucketed_1h',

    fft: 'fft',
    fft5m: 'fft_5m',
    fft1h: 'fft_1h',

    tradesBuffer: 'trades_buffer',
    volume: 'volume',
    volume1m: 'volume_1m',
    volume5m: 'volume_5m',
    volume1h: 'volume_1h',

    vwap1m: 'vwap_1m',
    vwap5m: 'vwap_5m',
    vwap1h: 'vwap_1h',

    vwap1m_ethusd: 'vwap_1m_ETHUSD',
    vwap5m_ethsud: 'vwap_5m_ETHUSD',
    vwap1h_ethsud: 'vwap_1h_ETHUSD',

    id0: 'id0',
    id0_1m: 'id0_1m',
    id0_5m: 'id0_5m',
    id0_1h: 'id0_1h',

    interestedNValue1m: 'interested_n_value_1m',
    interestedNValue5m: 'interested_n_value_5m',
    interestedNValue1h: 'interested_n_value_1h',

    interestedTValue1m: 'interested_t_value_1m',
    interestedTValue5m: 'interested_t_value_5m',
    interestedTValue1h: 'interested_t_value_1h',

    interestedEValue1m: 'interested_e_value_1m',
    interestedEValue5m: 'interested_e_value_5m',
    interestedEValue1h: 'interested_e_value_1h',

    deribitInstruments: 'deribit_instruments',
    deribitInstruments2: 'deribit_instruments2',

    footprint: 'footprint',
    footprint1m: 'footprint_1m',
    footprint5m: 'footprint_5m',
    footprint20m: 'footprint_20m',
    footprint1h: 'footprint_1h',
    footprint_hidden_orders: 'footprint_hidden_orders',
    footprint_oi: 'footprint_oi',
    hidden_orders: 'hidden_orders',

    fftFixTask: 'fft_fix_task',
  },
  bitmex: {
    testnet: false,
    baseUrlRealnet: 'https://www.bitmex.com/api/v1',
    baseUrlTestnet: 'https://testnet.bitmex.com/api/v1',
    wsUrlTestnet: 'wss://testnet.bitmex.com/realtime',
    wsUrlRealnet: 'wss://www.bitmex.com/realtime',
    bufferSize: 750,
    pathTradeBucketed: '/trade/bucketed',
    pathInstrument: '/instrument',
  },
  deribit: {
    testnet: false,
    baseUrlTestnet: 'https://test.deribit.com',
    baseUrlRealnet: 'https://www.deribit.com',
    wsUrlTestnet: 'wss://www.deribit.com/ws/api/v2',
    wsUrlRealnet: 'wss://www.deribit.com/ws/api/v2',
    pathInstruments: '/api/v2/public/get_instruments',
    pathTicker: '/api/v2/public/ticker',
    pathInterest: '/api/v2/public/get_book_summary_by_instrument'
  },
  bitfinex: {
    testnet: false,
    baseUrlPublic: 'https://api-pub.bitfinex.com/v2',
    baseUrlPrivate: 'https://pub.bitfinex.com/v2',
    wsUrlPublic: 'wss://api-pub.bitfinex.com/ws/2',
    wsUrlPrivate: 'wss://api.bitfinex.com/ws/2',
    bufferSize: 750,
    pathCandleTrade: '/candles/trade',
  },
  bybit: {
    testnet: false,
    wsUrlTestnet: 'wss://stream-testnet.bybit.com/realtime',
    wsUrlRealnet: 'wss://stream.bybit.com/realtime',
    interestUrlTestnet: 'https://api-testnet.bybit.com/v2/public/tickers',
    interestUlrMainnet: 'https://api.bybit.com/v2/public/tickers'
  },
  ig: {
    identifier: 'supertest333',
    password: '12345btcBTC',
    encryptedPassword: false,
    baseUrl: 'https://demo-api.ig.com/gateway/deal',
    'X-IG-API-KEY': 'de1a53f1fc93308cabf377ef40d63df61cdf603f'
  }
};
