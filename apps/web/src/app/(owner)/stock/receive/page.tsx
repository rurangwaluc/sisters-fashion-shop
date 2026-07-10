import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@dispensary/db/client';
import { products } from '@dispensary/db/schema';
import { ReceiveStockForm } from './receive-stock-form';

type ReceiveStockPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function ReceiveStockPage({ searchParams }: ReceiveStockPageProps) {
  const params = await searchParams;
  const error = params?.error || '';

  const stockProducts = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      customerType: products.customerType,
      size: products.size,
      color: products.color,
      quantity: products.quantity,
      unit: products.unit,
      supplierName: products.supplierName,
    })
    .from(products)
    .where(and(eq(products.status, 'ACTIVE'), eq(products.itemType, 'PRODUCT')))
    .orderBy(asc(products.name));

  return (
    <section className="space-y-5 sm:space-y-6">
      <section className="business-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">
              Stock
            </p>
            <h2 className="boutique-display mt-2 text-4xl font-bold leading-none text-[var(--text)] sm:text-5xl">
              Add stock.
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">
              Choose what came in and add it to what is already in the shop.
            </p>
          </div>

          <Link
            href="/stock"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Stock
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <ReceiveStockForm products={stockProducts} error={error} />

        <aside className="business-card rounded-3xl p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">
            What this does
          </p>
          <h3 className="boutique-display mt-2 text-3xl font-bold leading-none text-[var(--text)]">
            Stock increases automatically.
          </h3>

          <div className="mt-5 space-y-3 text-sm font-bold leading-6 text-[var(--muted)]">
            <p>The quantity left in the shop increases after saving.</p>
            <p>The latest cost and supplier can be updated from this form.</p>
            <p>The owner can see what came in later from the stock page.</p>
          </div>
        </aside>
      </section>
    </section>
  );
}
