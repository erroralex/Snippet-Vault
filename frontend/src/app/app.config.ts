import {ApplicationConfig, provideBrowserGlobalErrorListeners} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';

/**
 * ──────────────────────────────────────────────
 * <h2>AppConfig</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Defines the core application configuration for the Snippet Vault frontend.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Configures application-wide providers necessary for bootstrapping the Angular application.</li>
 * <li>Sets up global error listeners for the browser environment.</li>
 * <li>Provides routing configuration based on defined application routes.</li>
 * <li>Enables client hydration and event replay for Server-Side Rendering (SSR) support.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> An Angular {@code ApplicationConfig} object that acts as the primary configuration registry when initializing the application using the standalone bootstrap API.</p>
 * ──────────────────────────────────────────────
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), provideClientHydration(withEventReplay())
  ]
};
