import { Hono } from 'hono';

import { mediaConfig } from '../../config/media.config.js';
import { jwtAuthMiddleware } from '../../middleware/jwt-auth.middleware.js';
import {
  completeUploadController,
  createUploadController,
  getMediaController
} from './media.controller.js';

const mediaRoutes = new Hono();

// Every media route requires an authenticated user.
mediaRoutes.use('*', jwtAuthMiddleware(mediaConfig.jwt));

mediaRoutes.post('/uploads', createUploadController);
mediaRoutes.post('/uploads/:id/complete', completeUploadController);
mediaRoutes.get('/:id', getMediaController);

export { mediaRoutes };
