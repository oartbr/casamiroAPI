const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const garantiaRoute = require('./garantia.route');
const messagingRoute = require('./messaging.route');
const docsRoute = require('./docs.route');
const filesRoute = require('./files.route');
const qrcodeRoute = require('./qrcode.route');
const skuRoute = require('./sku.route');
const callRoute = require('./call.route');
const config = require('../../config/config');
const logger = require('../../config/logger');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/garantia',
    route: garantiaRoute,
  },
  {
    path: '/messaging',
    route: messagingRoute,
  },
  {
    path: '/files',
    route: filesRoute,
  },
  {
    path: '/QRcode',
    route: qrcodeRoute,
  },
  {
    path: '/sku',
    route: skuRoute,
  },
  {
    path: '/call',
    route: callRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

logger.info(`starting router`);
module.exports = router;
