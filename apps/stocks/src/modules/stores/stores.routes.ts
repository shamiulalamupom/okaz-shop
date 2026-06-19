import { Hono } from 'hono';

import { createStoreController, getStoreController, listStoresController } from './stores.controller.js';

const storesRoutes = new Hono();

storesRoutes.get('/', listStoresController);
storesRoutes.get('/:id', getStoreController);
storesRoutes.post('/', createStoreController);

export { storesRoutes };
