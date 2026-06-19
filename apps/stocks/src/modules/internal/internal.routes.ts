import { Hono } from 'hono';

import { stocksConfig } from '../../config/stocks.config.js';
import { internalSecretMiddleware } from '../../middleware/internal-secret.middleware.js';
import { releaseStockController, reserveStockController } from './internal.controller.js';

const internalRoutes = new Hono();

internalRoutes.use('*', internalSecretMiddleware(stocksConfig.internalServiceSecret));
internalRoutes.post('/stocks/reserve', reserveStockController);
internalRoutes.post('/stocks/release', releaseStockController);

export { internalRoutes };
