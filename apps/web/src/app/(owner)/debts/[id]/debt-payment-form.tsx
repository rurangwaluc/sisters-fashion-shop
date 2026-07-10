'use client';

import { useActionState, useState } from 'react';
import { recordDebtPaymentAction } from '@/lib/debts/actions';

type DebtPaymentFormProps = {
  saleId: string;
  balanceAmount: string;
  hasOpenDrawer: boolean;
};

type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK' | 'CARD';

function money(value: string | number) {
  return `RWF ${Number(value).toLocaleString('en-US')}`;
}

export function DebtPaymentForm({ saleId, balanceAmount, hasOpenDrawer }: DebtPaymentFormProps) {
  const [state, action, pending] = useActionState(recordDebtPaymentAction, {});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const isCashPaymentLocked = paymentMethod === 'CASH' && !hasOpenDrawer;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="saleId" value={saleId} />

      <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-4 dark:border-[#343434] dark:bg-[#161616]">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
          Unpaid amount
        </p>
        <p className="mt-2 text-2xl font-black text-[#F2A71B]">
          {money(balanceAmount)}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
          Amount paid now
        </label>
        <input
          id="amount"
          name="amount"
          inputMode="decimal"
          placeholder="Example: 5000"
          className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-[#222222] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="paymentMethod" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
          Payment method
        </label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
          className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-black text-[#222222] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
        >
          <option value="CASH">Cash</option>
          <option value="MOBILE_MONEY">Mobile money</option>
          <option value="BANK">Bank</option>
          <option value="CARD">Card</option>
        </select>

        {isCashPaymentLocked ? (
          <p className="text-xs font-black text-[#E85D5D]">
            Open the cash drawer before saving a cash debt payment.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Optional"
          className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm font-semibold text-[#222222] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
        />
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3 text-sm font-black text-[#8a6413] dark:text-[#FFD45A]">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-2xl border border-[#5F8A63]/40 bg-[#5F8A63]/10 px-4 py-3 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]">
          {state.success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || isCashPaymentLocked}
        className="h-12 w-full rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:border disabled:border-[#E85D5D]/40 disabled:bg-[#343434] disabled:text-[#A3A3A3] disabled:shadow-none dark:disabled:bg-[#161616]"
      >
        {pending ? 'Saving...' : isCashPaymentLocked ? 'Open cash drawer first' : 'Save payment'}
      </button>
    </form>
  );
}
