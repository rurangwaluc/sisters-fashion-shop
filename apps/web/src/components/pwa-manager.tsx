'use client';

import { useEffect } from 'react';

declare global {
  interface WindowEventMap {
    'sisters:pwa-update-ready': CustomEvent;
  }
}

export function PwaManager() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        if (registration.waiting) {
          window.dispatchEvent(
            new CustomEvent('sisters:pwa-update-ready'),
          );
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;

          if (!worker) return;

          worker.addEventListener('statechange', () => {
            if (
              worker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              window.dispatchEvent(
                new CustomEvent('sisters:pwa-update-ready'),
              );
            }
          });
        });
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }

    void registerServiceWorker();
  }, []);

  return null;
}
