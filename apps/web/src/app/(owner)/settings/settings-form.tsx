'use client';

import { useActionState } from 'react';
import { updateBusinessSettingsAction } from '@/lib/settings/actions';

type SettingsFormProps = {
  settings: {
    businessName: string;
    ownerName: string;
    phone: string;
    address: string;
    currency: string;
    lowStockAlertQuantity: string;
  };
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
      {children}
    </label>
  );
}

const inputClass =
  'h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]';

export function SettingsForm({ settings }: SettingsFormProps) {
  const [state, action, pending] = useActionState(updateBusinessSettingsAction, {});

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="businessName">Business name</FieldLabel>
          <input
            id="businessName"
            name="businessName"
            defaultValue={settings.businessName}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="ownerName">Owner name</FieldLabel>
          <input
            id="ownerName"
            name="ownerName"
            defaultValue={settings.ownerName}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="phone">Phone number</FieldLabel>
          <input
            id="phone"
            name="phone"
            defaultValue={settings.phone}
            placeholder="+250..."
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="currency">Currency</FieldLabel>
          <input
            id="currency"
            name="currency"
            value={settings.currency}
            readOnly
            className="h-12 w-full rounded-2xl border border-neutral-200 bg-[#FAFAFC] px-4 text-sm font-black text-[#6B7280] outline-none dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <FieldLabel htmlFor="lowStockAlertQuantity">Low stock warning</FieldLabel>
          <input
            id="lowStockAlertQuantity"
            name="lowStockAlertQuantity"
            type="number"
            min="1"
            defaultValue={settings.lowStockAlertQuantity}
            required
            className={inputClass}
          />
          <p className="text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
            The system warns you when a product reaches this quantity.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="address">Business address</FieldLabel>
        <textarea
          id="address"
          name="address"
          defaultValue={settings.address}
          rows={4}
          placeholder="Shop location or business address"
          className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
        />
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3 text-sm font-bold text-[#8A5A00] dark:text-[#FFD45A]">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-2xl border border-[#5F8A63]/40 bg-[#5F8A63]/10 px-4 py-3 text-sm font-bold text-[#5F8A63] dark:text-[#79C27D]">
          {state.success}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {pending ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}
