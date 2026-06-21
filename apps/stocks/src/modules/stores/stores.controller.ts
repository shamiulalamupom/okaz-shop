import { parseJsonBody } from '@okaz/shared';
import type { Context } from 'hono';

import { stocksConfig } from '../../config/stocks.config.js';
import { createStoreSchema, updateStoreSchema } from './stores.schemas.js';
import { storesService } from './stores.service.js';

export const listStoresController = async (c: Context) => {
  const stores = await storesService.list();
  return c.json({ data: stores }, 200);
};

export const getStoreController = async (c: Context) => {
  const store = await storesService.getById(c.req.param('id')!);

  if (!store) {
    return c.json({ message: 'Store not found' }, 404);
  }

  return c.json(store, 200);
};

export const createStoreController = async (c: Context) => {
  const parsed = await parseJsonBody(c, createStoreSchema, {
    maxBytes: stocksConfig.requestMaxBytes
  });

  if (!parsed.success) {
    return parsed.response;
  }

  const store = await storesService.create(parsed.data);
  return c.json(store, 201);
};

export const updateStoreController = async (c: Context) => {
  const parsed = await parseJsonBody(c, updateStoreSchema, {
    maxBytes: stocksConfig.requestMaxBytes
  });

  if (!parsed.success) {
    return parsed.response;
  }

  const store = await storesService.update(c.req.param('id')!, parsed.data);

  if (!store) {
    return c.json({ message: 'Store not found' }, 404);
  }

  return c.json(store, 200);
};
