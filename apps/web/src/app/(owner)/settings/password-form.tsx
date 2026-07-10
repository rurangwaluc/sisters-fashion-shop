'use client';

import { useActionState } from 'react';
import { changeOwnerPasswordAction } from '@/lib/settings/password-actions';

const inputClass =
  'h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]';

export function PasswordForm() {
  const [state, action, pending] = useActionState(changeOwnerPasswordAction, {});

  return (
    <form action={action} className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
        Owner password
      </p>
      <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
        Change your password
      </h3>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
        Use this when the owner password needs to be changed.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="currentPassword" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
            Current password
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="newPassword" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? (
        <div className="mt-4 rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3 text-sm font-bold text-[#8A5A00] dark:text-[#FFD45A]">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="mt-4 rounded-2xl border border-[#5F8A63]/40 bg-[#5F8A63]/10 px-4 py-3 text-sm font-bold text-[#5F8A63] dark:text-[#79C27D]">
          {state.success}
        </div>
      ) : null}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {pending ? 'Changing...' : 'Change password'}
        </button>
      </div>
    </form>
  );
}
