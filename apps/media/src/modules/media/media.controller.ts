import { parseJsonBody } from '@okaz/shared';
import type { Context } from 'hono';

import { mediaConfig } from '../../config/media.config.js';
import { createUploadSchema } from './media.schemas.js';
import { mediaService } from './media.service.js';

export const createUploadController = async (c: Context) => {
  const user = c.get('user');

  const parsed = await parseJsonBody(c, createUploadSchema, {
    maxBytes: mediaConfig.requestMaxBytes
  });
  if (!parsed.success) {
    return parsed.response;
  }

  const input = parsed.data;

  // Product images may only be uploaded by store managers / admins.
  if (input.purpose === 'PRODUCT_IMAGE') {
    const canManage = user.roles.some((role) => role === 'STORE_MANAGER' || role === 'ADMIN');
    if (!canManage) {
      return c.json({ message: 'Forbidden' }, 403);
    }
  }

  if (!mediaService.isContentTypeAllowed(input.contentType)) {
    return c.json({ message: 'Unsupported content type', allowed: mediaConfig.allowedTypes }, 400);
  }

  if (input.fileSize > mediaConfig.maxUploadBytes) {
    return c.json({ message: 'File too large', maxBytes: mediaConfig.maxUploadBytes }, 413);
  }

  const result = await mediaService.createUpload(user.id, input);
  return c.json(result, 201);
};

export const completeUploadController = async (c: Context) => {
  const user = c.get('user');
  const result = await mediaService.complete(user.id, c.req.param('id')!);

  if ('notFound' in result) {
    return c.json({ message: 'Media not found' }, 404);
  }

  if ('objectMissing' in result) {
    return c.json({ message: 'Uploaded object not found in store' }, 422);
  }

  if ('tooLarge' in result) {
    return c.json({ message: 'Uploaded file exceeds the maximum size', maxBytes: mediaConfig.maxUploadBytes }, 413);
  }

  return c.json(result.media, 200);
};

export const getMediaController = async (c: Context) => {
  const user = c.get('user');
  const isAdmin = user.roles.includes('ADMIN');
  const media = await mediaService.getForOwner(c.req.param('id')!, user.id, isAdmin);

  if (!media) {
    return c.json({ message: 'Media not found' }, 404);
  }

  return c.json(media, 200);
};
