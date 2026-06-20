import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { UploadResult } from '../../../../core/media/media.models';
import { ImageUploadComponent } from '../../../../shared/image-upload/image-upload.component';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, ImageUploadComponent],
  templateUrl: './profile.component.html',
  // styleUrl: './profile.component.css',
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly avatarError = signal('');

  onAvatarUploaded(result: UploadResult) {
    if (!result.cdnUrl) {
      return;
    }

    this.avatarError.set('');
    this.authService
      .updateProfile({ avatarUrl: result.cdnUrl, avatarMediaId: result.mediaId })
      .subscribe({
        error: () => this.avatarError.set('Could not save your avatar.'),
      });
  }

  logout() {
    this.authService.logout();
    this.router.navigateByUrl('/products');
  }
}
