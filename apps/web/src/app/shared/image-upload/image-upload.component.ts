import { Component, computed, inject, input, output, signal } from '@angular/core';

import { MediaService } from '../../core/media/media.service';
import { MediaPurpose, UploadResult } from '../../core/media/media.models';

@Component({
  selector: 'app-image-upload',
  template: `
    <div class="flex items-center gap-4">
      <!-- Preview -->
      <div
        class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/5"
      >
        @if (displayUrl()) {
          <img [src]="displayUrl()" alt="Preview" class="size-full object-cover" />
        } @else {
          <span class="text-2xl text-muted-foreground">🖼️</span>
        }
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          class="inline-flex h-9 w-fit cursor-pointer items-center justify-center rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-all hover:bg-secondary/80 active:translate-y-px"
          [class.pointer-events-none]="isUploading()"
          [class.opacity-60]="isUploading()"
        >
          {{ isUploading() ? 'Uploading…' : displayUrl() ? 'Replace image' : 'Choose image' }}
          <input type="file" accept="image/*" class="hidden" (change)="onSelect($event)" [disabled]="isUploading()" />
        </label>
        @if (errorMessage()) {
          <p class="text-xs text-destructive">{{ errorMessage() }}</p>
        } @else {
          <p class="text-xs text-muted-foreground">JPEG, PNG or WebP.</p>
        }
      </div>
    </div>
  `,
})
export class ImageUploadComponent {
  private readonly mediaService = inject(MediaService);

  readonly purpose = input.required<MediaPurpose>();
  readonly linkedId = input<string | undefined>(undefined);
  readonly currentUrl = input<string | null>(null);
  readonly uploaded = output<UploadResult>();

  readonly isUploading = signal(false);
  readonly errorMessage = signal('');
  private readonly previewUrl = signal<string | null>(null);

  readonly displayUrl = computed(() => this.previewUrl() ?? this.currentUrl());

  onSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';

    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Please choose an image file.');
      return;
    }

    this.errorMessage.set('');
    this.isUploading.set(true);

    this.mediaService.upload(this.purpose(), file, this.linkedId()).subscribe({
      next: (result) => {
        this.isUploading.set(false);
        if (result.cdnUrl) {
          this.previewUrl.set(result.cdnUrl);
        }
        this.uploaded.emit(result);
      },
      error: (error) => {
        this.isUploading.set(false);
        this.errorMessage.set(error?.error?.message ?? 'Upload failed. Please try again.');
      },
    });
  }
}
