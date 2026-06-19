import { parseJsonBody } from '@okaz/shared';
import type { Context } from 'hono';

import { stocksConfig } from '../../config/stocks.config.js';
import { adjustStockSchema, upsertStockSchema } from './stocks.schemas.js';
import { stocksService } from './stocks.service.js';

export const listStocksController = async (c: Context) => {
  const productId = c.req.query('productId');
  const storeId = c.req.query('storeId');

  const stocks = await stocksService.list({ productId, storeId });
  return c.json({ data: stocks }, 200);
};

export const getProductStockController = async (c: Context) => {
  const result = await stocksService.getByProduct(c.req.param('productId')!);
  return c.json(result, 200);
};

export const upsertStockController = async (c: Context) => {
  const parsed = await parseJsonBody(c, upsertStockSchema, {
    maxBytes: stocksConfig.requestMaxBytes
  });

  if (!parsed.success) {
    return parsed.response;
  }

  const stock = await stocksService.upsert(parsed.data);
  return c.json(stock, 200);
};

export const adjustStockController = async (c: Context) => {
  const parsed = await parseJsonBody(c, adjustStockSchema, {
    maxBytes: stocksConfig.requestMaxBytes
  });

  if (!parsed.success) {
    return parsed.response;
  }

  const stock = await stocksService.adjust(parsed.data);
  return c.json(stock, 200);
};
