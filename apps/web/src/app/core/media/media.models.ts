export type MediaPurpose = 'PRODUCT_IMAGE' | 'PROFILE_IMAGE';

export interface PresignResponse {
  mediaId: string;
  upload: {
    method: 'PUT';
    url: string;
    headers: Record<string, string>;
    key: string;
  };
  maxBytes: number;
  expiresSeconds: number;
}

export interface Media {
  id: string;
  purpose: MediaPurpose;
  status: 'PENDING' | 'READY' | 'FAILED';
  contentType: string;
  sizeBytes: number | null;
  cdnUrl: string | null;
  createdAt: string;
}

export interface UploadResult {
  mediaId: string;
  cdnUrl: string | null;
}
