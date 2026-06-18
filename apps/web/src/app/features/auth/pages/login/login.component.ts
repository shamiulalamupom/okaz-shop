import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  // Builder de formulaire Angular
  private readonly fb = inject(NonNullableFormBuilder);

  // Service d’authentification central
  private readonly authService = inject(AuthService);

  // Router Angular pour navigation
  private readonly router = inject(Router);

  // Etat loading du formulaire
  readonly isSubmitting = signal(false);

  // Message d’erreur affiché
  readonly errorMessage = signal('');

  // Formulaire login avec validations
  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit() {
    // Bloque si formulaire invalide
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    // Appel API login
    this.authService
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          // Redirection après succès
          this.router.navigateByUrl('/profile');
        },
        error: (error) => {
          // Message erreur backend
          this.errorMessage.set(error?.error?.message ?? 'Login failed. Please try again.');
        },
      });
  }
}
