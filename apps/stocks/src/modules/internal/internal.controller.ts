import { parseJsonBody } from '@okaz/shared';
import type { Context } from 'hono';

import { stocksConfig } from '../../config/stocks.config.js';
import { reservationSchema } from '../stocks/stocks.schemas.js';
import { InsufficientStockError, stocksService } from '../stocks/stocks.service.js';

export const reserveStockController = async (c: Context) => {
  const parsed = await parseJsonBody(c, reservationSchema, {
    maxBytes: stocksConfig.requestMaxBytes
  });

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const result = await stocksService.reserve(parsed.data.items);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return c.json({ message: error.message, code: 'INSUFFICIENT_STOCK', shortages: error.shortages }, 409);
    }

    throw error;
  }
};

export const releaseStockController = async (c: Context) => {
  const parsed = await parseJsonBody(c, reservationSchema, {
    maxBytes: stocksConfig.requestMaxBytes
  });

  if (!parsed.success) {
    return parsed.response;
  }

  const result = await stocksService.release(parsed.data.items);
  return c.json(result, 200);
};
