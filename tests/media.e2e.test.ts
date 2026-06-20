import { beforeAll, describe, expect, it } from 'vitest';

import { api, loginAdmin, registerCustomer, waitForReady, type TestUser } from './support/client.js';

let adminToken: string;
let customer: TestUser;

// 1x1 transparent PNG (70 bytes).
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

type PresignBody = { mediaId: string; upload: { method: string; url: string; headers: Record<string, string> } };

const presign = (token: string, body: Record<string, unknown>) =>
  api<PresignBody>('/media/uploads', { method: 'POST', token, body });

/**
 * Uploads the test bytes to the pre-signed URL. With real R2 this stores the
 * object; with the placeholder store the request fails and is ignored (the fake
 * store reports the object as present anyway).
 */
const putToStore = async (issued: PresignBody) => {
  try {
    await fetch(issued.upload.url, { method: 'PUT', headers: issued.upload.headers, body: TINY_PNG });
  } catch {
    // placeholder store has no real endpoint — ignore
  }
};

beforeAll(async () => {
  await waitForReady();
  adminToken = await loginAdmin();
  customer = await registerCustomer('media');
});

describe('media uploads (e2e)', () => {
  it('requires authentication', async () => {
    const result = await api('/media/uploads', {
      method: 'POST',
      body: { purpose: 'PROFILE_IMAGE', contentType: 'image/png', fileSize: 1000 }
    });
    expect(result.status).toBe(401);
  });

  it('issues a pre-signed upload for a profile image (customer)', async () => {
    const result = await presign(customer.token, {
      purpose: 'PROFILE_IMAGE',
      contentType: 'image/png',
      fileSize: 1000,
      fileName: 'avatar.png'
    });
    expect(result.status).toBe(201);
    expect(result.body.mediaId).toBeTypeOf('string');
    expect(result.body.upload.method).toBe('PUT');
    expect(result.body.upload.url).toBeTypeOf('string');
    expect(result.body.upload.headers['Content-Type']).toBe('image/png');
  });

  it('forbids a CUSTOMER from uploading a product image (403)', async () => {
    const result = await presign(customer.token, {
      purpose: 'PRODUCT_IMAGE',
      contentType: 'image/png',
      fileSize: 1000
    });
    expect(result.status).toBe(403);
  });

  it('allows ADMIN to pre-sign a product image (201)', async () => {
    const result = await presign(adminToken, {
      purpose: 'PRODUCT_IMAGE',
      contentType: 'image/jpeg',
      fileSize: 2000
    });
    expect(result.status).toBe(201);
  });

  it('rejects an unsupported content type (400)', async () => {
    const result = await presign(customer.token, {
      purpose: 'PROFILE_IMAGE',
      contentType: 'application/pdf',
      fileSize: 1000
    });
    expect(result.status).toBe(400);
  });

  it('rejects a file that is too large (413)', async () => {
    const result = await presign(customer.token, {
      purpose: 'PROFILE_IMAGE',
      contentType: 'image/png',
      fileSize: 999_999_999
    });
    expect(result.status).toBe(413);
  });

  it('completes an upload and returns a READY media with a cdnUrl', async () => {
    const issued = await presign(customer.token, {
      purpose: 'PROFILE_IMAGE',
      contentType: 'image/png',
      fileSize: TINY_PNG.length
    });
    expect(issued.status).toBe(201);

    await putToStore(issued.body);

    const completed = await api<{ status: string; cdnUrl: string }>(
      `/media/uploads/${issued.body.mediaId}/complete`,
      { method: 'POST', token: customer.token }
    );
    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe('READY');
    expect(completed.body.cdnUrl).toBeTypeOf('string');
  });

  it('scopes media to its owner', async () => {
    const issued = await presign(customer.token, {
      purpose: 'PROFILE_IMAGE',
      contentType: 'image/png',
      fileSize: TINY_PNG.length
    });
    await putToStore(issued.body);
    const other = await registerCustomer('media-other');

    // Another user cannot finalize or read someone else's media.
    expect(
      (await api(`/media/uploads/${issued.body.mediaId}/complete`, { method: 'POST', token: other.token }))
        .status
    ).toBe(404);

    await api(`/media/uploads/${issued.body.mediaId}/complete`, { method: 'POST', token: customer.token });

    expect((await api(`/media/${issued.body.mediaId}`, { token: other.token })).status).toBe(404);
    expect((await api(`/media/${issued.body.mediaId}`, { token: customer.token })).status).toBe(200);
  });
});
