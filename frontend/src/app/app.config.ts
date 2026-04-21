import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

/**
 * Defines the core application configuration for the Snippet Vault frontend.
 *
 * This configuration object sets up essential application-wide providers, including
 * global error listeners, routing, and client hydration settings for Angular Universal
 * or server-side rendering (SSR) environments. It forms the base configuration used
 * to bootstrap the Angular application.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), provideClientHydration(withEventReplay())
  ]
};
