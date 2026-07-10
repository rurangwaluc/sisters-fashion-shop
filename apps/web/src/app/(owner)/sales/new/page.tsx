import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@dispensary/db/client';
import { cashDrawers, customers, products } from '@dispensary/db/schema';
import { SaleForm } from '../sale-form';

export default async function NewSalePage() {
  const items = await db
    .select({
      id: products.id,
      name: products.name,
      itemType: products.itemType,
      category: products.category,
      customerType: products.customerType,
      size: products.size,
      color: products.color,
      buyingPrice: products.buyingPrice,
      sellingPrice: products.sellingPrice,
      wholesalePrice: products.wholesalePrice,
      wholesaleMinQuantity: products.wholesaleMinQuantity,
      quantity: products.quantity,
      unit: products.unit,
    })
    .from(products)
    .where(eq(products.status, 'ACTIVE'))
    .orderBy(asc(products.name));

  const customerList = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
    })
    .from(customers)
    .where(eq(customers.status, 'ACTIVE'))
    .orderBy(asc(customers.name));

  const openDrawer = await db.query.cashDrawers.findFirst({
    where: eq(cashDrawers.status, 'OPEN'),
  });

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
        <div className="flex flex-col gap-4 border-b border-neutral-100 pb-4 dark:border-[#343434] sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Sales desk
            </p>
            <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
              New sale
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              Sell retail or wholesale, record money received, return change, and keep drawer cash clear.
            </p>
          </div>

          <Link
            href="/sales"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sales
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 p-4 text-sm font-black text-[#8a6413] dark:text-[#FFD45A]">
            Add at least one product before making a sale.
          </div>
        ) : (
          <div className="mt-5">
            <SaleForm items={items} customers={customerList} hasOpenDrawer={Boolean(openDrawer)} />
          </div>
        )}
      </div>
    </section>
  );
}
