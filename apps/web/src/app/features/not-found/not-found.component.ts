import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <p class="font-mono text-6xl font-semibold text-primary">404</p>
      <h1 class="font-heading text-2xl font-semibold tracking-tight">Page not found</h1>
      <p class="text-sm text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
      <a
        routerLink="/products"
        class="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-md ring-1 ring-foreground/5 transition-all hover:bg-primary/80 active:translate-y-px focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        Back to products
      </a>
    </section>
  `,
})
export class NotFoundComponent {}
