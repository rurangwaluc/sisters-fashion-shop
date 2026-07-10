'use client';

import { Download, RefreshCw, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
  }>;
};

function detectInstalledMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function InstallAppCard() {
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);

  const [isInstalled, setIsInstalled] = useState(detectInstalledMode);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }

    function handleInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    function handleUpdate() {
      setUpdateReady(true);
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleInstallPrompt,
    );

    window.addEventListener(
      'appinstalled',
      handleInstalled,
    );

    window.addEventListener(
      'sisters:pwa-update-ready',
      handleUpdate,
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleInstallPrompt,
      );

      window.removeEventListener(
        'appinstalled',
        handleInstalled,
      );

      window.removeEventListener(
        'sisters:pwa-update-ready',
        handleUpdate,
      );
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();

    const result = await installPrompt.userChoice;

    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Smartphone
              className="h-5 w-5"
              aria-hidden="true"
            />
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Shop app
            </p>

            <h3 className="mt-1 text-2xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
              Install Sisters Fashion Shop
            </h3>

            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              Add the system to this phone or computer for quick access.
              Internet is still required for sales and business records.
            </p>
          </div>
        </div>

        {isInstalled ? (
          <span className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--success)] px-4 text-xs font-black text-[var(--success)]">
            Installed
          </span>
        ) : installPrompt ? (
          <button
            type="button"
            onClick={installApp}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 text-xs font-black text-white transition hover:bg-[var(--primary-strong)]"
          >
            <Download
              className="h-4 w-4"
              aria-hidden="true"
            />
            Install app
          </button>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--border)] px-4 text-center text-xs font-black text-[var(--muted)]">
            Use browser menu to install
          </span>
        )}
      </div>

      {updateReady ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-neutral-100 pt-4 dark:border-[#343434] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-[var(--text)]">
            A newer version of the shop system is ready.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] px-4 text-xs font-black text-[var(--text)]"
          >
            <RefreshCw
              className="h-4 w-4"
              aria-hidden="true"
            />
            Refresh now
          </button>
        </div>
      ) : null}
    </section>
  );
}
