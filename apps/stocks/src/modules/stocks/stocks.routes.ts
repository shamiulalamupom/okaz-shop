import { Hono } from 'hono';

import {
  adjustStockController,
  getProductStockController,
  listStocksController,
  upsertStockController
} from './stocks.controller.js';

const stocksRoutes = new Hono();

stocksRoutes.get('/', listStocksController);
stocksRoutes.get('/:productId', getProductStockController);
stocksRoutes.post('/', upsertStockController);
stocksRoutes.post('/adjust', adjustStockController);

export { stocksRoutes };
