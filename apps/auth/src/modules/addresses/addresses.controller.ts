import { parseJsonBody } from '@okaz/shared';
import type { Context } from 'hono';

import { authConfig } from '../../config/auth.config.js';
import { createAddressSchema } from './addresses.schemas.js';
import { addressesService } from './addresses.service.js';

export const listAddressesController = async (c: Context) => {
  const user = c.get('user');
  const addresses = await addressesService.list(user.id);
  return c.json({ data: addresses });
};

export const addAddressController = async (c: Context) => {
  const user = c.get('user');

  const parsed = await parseJsonBody(c, createAddressSchema, {
    maxBytes: authConfig.requestMaxBytes
  });
  if (!parsed.success) {
    return parsed.response;
  }

  const address = await addressesService.create(user.id, parsed.data);
  return c.json(address, 201);
};

export const deleteAddressController = async (c: Context) => {
  const user = c.get('user');
  const deleted = await addressesService.delete(user.id, c.req.param('id')!);

  if (!deleted) {
    return c.json({ message: 'Address not found' }, 404);
  }

  return c.json({ deleted: true });
};
