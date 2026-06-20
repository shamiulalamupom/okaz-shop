import { randomUUID } from 'node:crypto';

import type { Media } from '../../../prisma/generated/client/index.js';
import { mediaConfig } from '../../config/media.config.js';
import { prisma } from '../../db/prisma.client.js';
import { objectStore } from '../../lib/store.js';
import type { CreateUploadInput } from './media.schemas.js';

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const prefixForPurpose = (purpose: CreateUploadInput['purpose']) =>
  purpose === 'PRODUCT_IMAGE' ? 'products' : 'profiles';

const linkedTypeForPurpose = (purpose: CreateUploadInput['purpose']) =>
  purpose === 'PRODUCT_IMAGE' ? 'PRODUCT' : 'USER';

const serializeMedia = (media: Media) => ({
  id: media.id,
  purpose: media.purpose,
  status: media.status,
  contentType: media.contentType,
  sizeBytes: media.sizeBytes,
  cdnUrl: media.cdnUrl,
  createdAt: media.createdAt
});

export type MediaDto = ReturnType<typeof serializeMedia>;

export const mediaService = {
  isContentTypeAllowed(contentType: string) {
    return mediaConfig.allowedTypes.includes(contentType);
  },

  /** Issues a pre-signed upload and records a PENDING metadata row. */
  async createUpload(ownerId: string, input: CreateUploadInput) {
    const extension = EXTENSION_BY_TYPE[input.contentType] ?? 'bin';
    const key = `${prefixForPurpose(input.purpose)}/${randomUUID()}.${extension}`;

    const upload = await objectStore.createPresignedUpload({
      key,
      contentType: input.contentType,
      expiresSeconds: mediaConfig.presignExpiresSeconds
    });

    const media = await prisma.media.create({
      data: {
        ownerId,
        purpose: input.purpose,
        status: 'PENDING',
        bucketKey: key,
        contentType: input.contentType,
        linkedType: linkedTypeForPurpose(input.purpose),
        linkedId: input.purpose === 'PROFILE_IMAGE' ? ownerId : (input.linkedId ?? null)
      }
    });

    return {
      mediaId: media.id,
      upload,
      maxBytes: mediaConfig.maxUploadBytes,
      expiresSeconds: mediaConfig.presignExpiresSeconds
    };
  },

  /**
   * Finalizes an upload: verifies the object exists in the store, then marks the
   * media READY and records its public CDN URL.
   */
  async complete(ownerId: string, mediaId: string) {
    const media = await prisma.media.findUnique({ where: { id: mediaId } });

    if (!media || media.ownerId !== ownerId) {
      return { notFound: true as const };
    }

    if (media.status === 'READY') {
      return { media: serializeMedia(media) };
    }

    const head = await objectStore.head(media.bucketKey);
    if (!head) {
      return { objectMissing: true as const };
    }

    // Enforce the real uploaded size (pre-signed PUT can't constrain it up front).
    if (head.sizeBytes > mediaConfig.maxUploadBytes) {
      await objectStore.delete(media.bucketKey).catch(() => undefined);
      await prisma.media.update({ where: { id: media.id }, data: { status: 'FAILED' } });
      return { tooLarge: true as const };
    }

    const updated = await prisma.media.update({
      where: { id: media.id },
      data: {
        status: 'READY',
        sizeBytes: head.sizeBytes,
        etag: head.etag,
        cdnUrl: objectStore.publicUrl(media.bucketKey)
      }
    });

    return { media: serializeMedia(updated) };
  },

  async getForOwner(mediaId: string, ownerId: string, isAdmin: boolean) {
    const media = await prisma.media.findUnique({ where: { id: mediaId } });

    if (!media || (media.ownerId !== ownerId && !isAdmin)) {
      return null;
    }

    return serializeMedia(media);
  }
};
