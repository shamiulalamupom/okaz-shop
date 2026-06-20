import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Media, MediaPurpose, PresignResponse, UploadResult } from './media.models';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Full upload flow: request a pre-signed POST from the API, upload the file
   * directly to R2, then call back to finalize and obtain the CDN URL.
   */
  upload(purpose: MediaPurpose, file: File, linkedId?: string) {
    const body = {
      purpose,
      contentType: file.type,
      fileSize: file.size,
      fileName: file.name,
      ...(linkedId ? { linkedId } : {}),
    };

    return this.http.post<PresignResponse>(`${this.apiUrl}/media/uploads`, body).pipe(
      switchMap((presign) => {
        // R2 pre-signed PUT: send the raw file body with the signed Content-Type.
        // Direct to R2 — cross-origin, no Authorization header (the interceptor
        // skips non-API URLs). Requires CORS to be configured on the bucket.
        return this.http
          .put(presign.upload.url, file, { headers: presign.upload.headers, observe: 'response' })
          .pipe(
            switchMap(() =>
              this.http.post<Media>(`${this.apiUrl}/media/uploads/${presign.mediaId}/complete`, {}),
            ),
            map<Media, UploadResult>((media) => ({ mediaId: presign.mediaId, cdnUrl: media.cdnUrl })),
          );
      }),
    );
  }
}
