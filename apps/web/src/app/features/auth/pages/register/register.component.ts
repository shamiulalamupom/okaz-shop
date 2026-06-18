import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {

  // Form builder Angular
  private readonly fb = inject(NonNullableFormBuilder);

  // Service auth centralisé
  private readonly authService = inject(AuthService);

  // Navigation Angular
  private readonly router = inject(Router);

  // Loading state
  readonly isSubmitting = signal(false);

  // Error message
  readonly errorMessage = signal('');

  // Formulaire inscription
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/),
      ],
    ],
    confirmPassword: ['', [Validators.required]],
  });

  submit() {

    // Validation initiale
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.form.getRawValue();

    // Vérification confirmation mot de passe
    if (password !== confirmPassword) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    // Payload envoyé backend
    const payload = {
      email: this.form.getRawValue().email,
      password: this.form.getRawValue().password,
    };

    // Appel API register
    this.authService
      .register(payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          // Redirection après inscription
          this.router.navigateByUrl('/profile');
        },
        error: (error) => {

          // Gestion flexible des erreurs backend
          const backendMessage =
            error?.error?.error?.message ||
            error?.error?.message ||
            error?.message ||
            'Registration failed. Please try again.';

          this.errorMessage.set(backendMessage);
        },
      });
  }
}