import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Address } from '../../../../core/account/address.models';
import { AddressesService } from '../../../../core/account/addresses.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { UploadResult } from '../../../../core/media/media.models';
import { ImageUploadComponent } from '../../../../shared/image-upload/image-upload.component';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, ReactiveFormsModule, ImageUploadComponent],
  templateUrl: './profile.component.html',
  // styleUrl: './profile.component.css',
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly addressesService = inject(AddressesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly avatarError = signal('');

  readonly addresses = signal<Address[]>([]);
  readonly isSavingAddress = signal(false);
  readonly addressError = signal('');

  readonly addressForm = this.fb.group({
    label: [''],
    line1: ['', [Validators.required]],
    city: ['', [Validators.required]],
    postalCode: ['', [Validators.required]],
    country: ['', [Validators.required]],
  });

  constructor() {
    this.loadAddresses();
  }

  private loadAddresses() {
    this.addressesService.list().subscribe({
      next: (addresses) => this.addresses.set(addresses),
      error: () => this.addressError.set('Could not load your addresses.'),
    });
  }

  addAddress() {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    const raw = this.addressForm.getRawValue();
    const payload = {
      label: raw.label.trim() || undefined,
      line1: raw.line1.trim(),
      city: raw.city.trim(),
      postalCode: raw.postalCode.trim(),
      country: raw.country.trim(),
    };

    this.addressError.set('');
    this.isSavingAddress.set(true);
    this.addressesService
      .add(payload)
      .pipe(finalize(() => this.isSavingAddress.set(false)))
      .subscribe({
        next: (address) => {
          this.addresses.update((list) => [...list, address]);
          this.addressForm.reset({ label: '', line1: '', city: '', postalCode: '', country: '' });
        },
        error: (error) =>
          this.addressError.set(error?.error?.message ?? 'Could not save the address.'),
      });
  }

  removeAddress(id: string) {
    this.addressesService.remove(id).subscribe({
      next: () => this.addresses.update((list) => list.filter((address) => address.id !== id)),
      error: () => this.addressError.set('Could not delete the address.'),
    });
  }

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
