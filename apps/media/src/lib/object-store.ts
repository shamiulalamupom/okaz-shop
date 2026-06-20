import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignedUpload {
  // Cloudflare R2 supports pre-signed PUT (not POST): the client PUTs the file
  // body to `url` with the given headers.
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
  key: string;
}

export interface HeadResult {
  sizeBytes: number;
  etag: string;
}

export interface ObjectStore {
  readonly configured: boolean;
  createPresignedUpload(input: {
    key: string;
    contentType: string;
    expiresSeconds: number;
  }): Promise<PresignedUpload>;
  head(key: string): Promise<HeadResult | null>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

export interface R2Config {
  endpoint?: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  publicBaseUrl?: string;
}

const joinUrl = (base: string, key: string) => `${base.replace(/\/$/, '')}/${key}`;

/** Cloudflare R2 (S3-compatible) object store. */
export class R2ObjectStore implements ObjectStore {
  private client?: S3Client;

  constructor(private readonly config: R2Config) {}

  get configured(): boolean {
    return Boolean(
      this.config.endpoint &&
        this.config.accessKeyId &&
        this.config.secretAccessKey &&
        this.config.bucket &&
        this.config.publicBaseUrl,
    );
  }

  private requireConfigured(): void {
    if (!this.configured) {
      throw new Error('R2 is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_BASE_URL.');
    }
  }

  private getClient(): S3Client {
    if (!this.client) {
      // The S3 endpoint must be host-only; tolerate a bucket path or trailing
      // slash accidentally included in R2_ENDPOINT by normalizing to the origin.
      const endpoint = this.config.endpoint ? new URL(this.config.endpoint).origin : undefined;
      this.client = new S3Client({
        region: this.config.region,
        endpoint,
        credentials: {
          accessKeyId: this.config.accessKeyId as string,
          secretAccessKey: this.config.secretAccessKey as string,
        },
        forcePathStyle: true,
      });
    }
    return this.client;
  }

  async createPresignedUpload(input: {
    key: string;
    contentType: string;
    expiresSeconds: number;
  }): Promise<PresignedUpload> {
    this.requireConfigured();

    const url = await getSignedUrl(
      this.getClient(),
      new PutObjectCommand({
        Bucket: this.config.bucket as string,
        Key: input.key,
        ContentType: input.contentType,
      }),
      { expiresIn: input.expiresSeconds },
    );

    return { method: 'PUT', url, headers: { 'Content-Type': input.contentType }, key: input.key };
  }

  async head(key: string): Promise<HeadResult | null> {
    this.requireConfigured();
    try {
      const result = await this.getClient().send(
        new HeadObjectCommand({ Bucket: this.config.bucket as string, Key: key }),
      );
      return { sizeBytes: result.ContentLength ?? 0, etag: (result.ETag ?? '').replaceAll('"', '') };
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404 || (error as Error).name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    this.requireConfigured();
    await this.getClient().send(new DeleteObjectCommand({ Bucket: this.config.bucket as string, Key: key }));
  }

  publicUrl(key: string): string {
    return joinUrl(this.config.publicBaseUrl as string, key);
  }
}

/**
 * Stand-in used when R2 credentials are absent (local dev without creds, and the
 * hermetic test suite). It does not store bytes — it just lets the metadata
 * pipeline run: presign returns a placeholder target and head() reports success.
 */
export class FakeObjectStore implements ObjectStore {
  readonly configured = false;

  constructor(private readonly publicBaseUrl: string) {}

  async createPresignedUpload(input: {
    key: string;
    contentType: string;
  }): Promise<PresignedUpload> {
    return {
      method: 'PUT',
      url: joinUrl(this.publicBaseUrl, '_fake-upload'),
      headers: { 'Content-Type': input.contentType },
      key: input.key,
    };
  }

  async head(): Promise<HeadResult> {
    return { sizeBytes: 1, etag: 'fake-etag' };
  }

  async delete(): Promise<void> {
    // no-op
  }

  publicUrl(key: string): string {
    return joinUrl(this.publicBaseUrl, key);
  }
}

export const createObjectStore = (config: R2Config): ObjectStore => {
  const store = new R2ObjectStore(config);
  if (store.configured) {
    return store;
  }
  // No credentials configured — fall back to the placeholder store so the service
  // still boots. Real uploads require the R2_* env vars.
  return new FakeObjectStore(config.publicBaseUrl ?? 'https://cdn.local.invalid');
};
