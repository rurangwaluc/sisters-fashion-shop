'use client';

import { Archive } from 'lucide-react';
import { archiveProductAction } from '@/lib/products/actions';

type HideItemButtonProps = {
  itemId: string;
  itemName: string;
};

export function HideItemButton({ itemId, itemName }: HideItemButtonProps) {
  return (
    <form
      action={archiveProductAction}
      onSubmit={(event) => {
        const shouldHide = window.confirm(`Hide "${itemName}" from the list?`);

        if (!shouldHide) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="productId" value={itemId} />
      <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-red-900 dark:hover:text-red-300">
        <Archive className="h-3.5 w-3.5" />
        Hide
      </button>
    </form>
  );
}
