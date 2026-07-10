import Link from 'next/link';
import { desc, ilike, inArray, or } from 'drizzle-orm';
import { Search } from 'lucide-react';
import { db } from '@dispensary/db/client';
import { saleItems, sales } from '@dispensary/db/schema';
import { requireUser } from '@/lib/auth/session';

type DebtsPageProps = {
  searchParams?: Promise<{
    q?: string;
    take?: string;
  }>;
};

const PAGE_SIZE = 10;

function money(value: string | number) {
  return `RWF ${Number(value).toLocaleString('en-US')}`;
}

function buildLoadMoreHref(q: string, nextTake: number) {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  params.set('take', String(nextTake));

  return `/debts?${params.toString()}`;
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function priceTypeName(value: string) {
  return value === 'WHOLESALE' ? 'Wholesale' : 'Retail';
}

export default async function DebtsPage({ searchParams }: DebtsPageProps) {
  await requireUser();

  const params = await searchParams;
  const q = params?.q?.trim() || '';
  const take = Math.max(PAGE_SIZE, Number(params?.take || PAGE_SIZE));

  const saleList = await db
    .select()
    .from(sales)
    .where(
      q
        ? or(
            ilike(sales.customerName, `%${q}%`),
            ilike(sales.customerPhone, `%${q}%`),
          )
        : undefined,
    )
    .orderBy(desc(sales.saleDate));

  const unpaidSales = saleList.filter((sale) => Number(sale.balanceAmount) > 0);
  const visibleSales = unpaidSales.slice(0, take);
  const hasMore = unpaidSales.length > visibleSales.length;

  const visibleSaleIds = visibleSales.map((sale) => sale.id);

  const itemList =
    visibleSaleIds.length > 0
      ? await db.select().from(saleItems).where(inArray(saleItems.saleId, visibleSaleIds))
      : [];

  const totalDebt = unpaidSales.reduce((sum, sale) => sum + Number(sale.balanceAmount), 0);
  const totalPaid = unpaidSales.reduce((sum, sale) => sum + Number(sale.paidAmount), 0);
  const customerDebts = unpaidSales.filter((sale) => sale.customerId).length;
  const oldWalkInDebts = unpaidSales.filter((sale) => !sale.customerId).length;

  const summary = [
    { label: 'Unpaid money', value: money(totalDebt), helper: 'Still owed' },
    { label: 'Debt sales', value: unpaidSales.length, helper: 'Sales not cleared' },
    { label: 'Already paid', value: money(totalPaid), helper: 'Paid on these debts' },
    { label: 'Saved customers', value: customerDebts, helper: 'Linked to customer file' },
  ];

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-[#343434] dark:bg-[#222222]">
        <div className="p-4 sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
            Credit sales
          </p>
          <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-4xl">
            Debts
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
            See customers who still owe money, open each debt, and record later payments clearly.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 p-4 dark:border-[#343434] sm:p-5 lg:grid-cols-4">
          {summary.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                {item.label}
              </p>
              <p className="mt-2 break-words text-lg font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-xl">
                {item.value}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                {item.helper}
              </p>
            </article>
          ))}
        </div>

        {oldWalkInDebts > 0 ? (
          <div className="border-t border-neutral-100 px-4 pb-4 dark:border-[#343434] sm:px-5 sm:pb-5">
            <div className="rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3 text-sm font-black text-[#8a6413] dark:text-[#FFD45A]">
              {oldWalkInDebts} old debt record{oldWalkInDebts === 1 ? '' : 's'} has no saved customer. New credit sales are now blocked unless a customer is saved.
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]">
        <form className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280] dark:text-[#A3A3A3]" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search customer name or phone"
              className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-11 pr-3 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#A3A3A3] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
            />
          </div>
          <button className="h-12 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]">
            Search
          </button>
        </form>
      </div>

      {visibleSales.length === 0 ? (
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-8">
          <h3 className="font-display text-2xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
            No unpaid sales
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
            Debts will appear here when a saved customer has not fully paid a sale.
          </p>
        </section>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-[#343434] dark:bg-[#222222] lg:block">
            <div className="grid grid-cols-[1.2fr_1.35fr_0.75fr_0.75fr_0.75fr] border-b border-neutral-200 bg-[#FAFAFC] px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
              <div>Customer</div>
              <div>Sale</div>
              <div>Total</div>
              <div>Paid</div>
              <div>Unpaid</div>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-[#343434]">
              {visibleSales.map((sale) => {
                const items = itemList.filter((item) => item.saleId === sale.id);
                const names = items
                  .map((item) => `${item.itemName} x${item.quantity} / ${priceTypeName(item.priceType)}`)
                  .join(', ');

                return (
                  <Link
                    key={sale.id}
                    href={`/debts/${sale.id}`}
                    className="grid cursor-pointer grid-cols-[1.2fr_1.35fr_0.75fr_0.75fr_0.75fr] px-4 py-4 text-sm transition hover:bg-[var(--primary-soft)] dark:hover:bg-[#161616]"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="break-words font-black text-[#222222] dark:text-[#F5F5F5]">
                        {sale.customerName || 'Walk-in customer'}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                        {sale.customerPhone || 'No phone'}
                      </p>
                    </div>

                    <div className="min-w-0 pr-3">
                      <p className="font-black text-[#222222] dark:text-[#F5F5F5]">
                        {dateTime(sale.saleDate)}
                      </p>
                      <p className="mt-1 max-w-md break-words text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
                        {names || 'Sale items'}
                      </p>
                    </div>

                    <div className="pr-3 font-black text-[#222222] dark:text-[#F5F5F5]">
                      {money(sale.totalAmount)}
                    </div>

                    <div className="pr-3 font-black text-[#5F8A63] dark:text-[#79C27D]">
                      {money(sale.paidAmount)}
                    </div>

                    <div className="font-black text-[#F2A71B]">
                      {money(sale.balanceAmount)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 lg:hidden">
            {visibleSales.map((sale) => {
              const items = itemList.filter((item) => item.saleId === sale.id);
              const names = items
                .map((item) => `${item.itemName} x${item.quantity} / ${priceTypeName(item.priceType)}`)
                .join(', ');

              return (
                <Link
                  key={sale.id}
                  href={`/debts/${sale.id}`}
                  className="block rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-[var(--primary)] dark:border-[#343434] dark:bg-[#222222]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-black text-[#222222] dark:text-[#F5F5F5]">
                        {sale.customerName || 'Walk-in customer'}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                        {sale.customerPhone || 'No phone'} / {dateTime(sale.saleDate)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-3 py-1 text-xs font-black text-[#8a6413] dark:text-[#FFD45A]">
                      Unpaid
                    </span>
                  </div>

                  <p className="mt-3 break-words text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
                    {names || 'Sale items'}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                        Total
                      </p>
                      <p className="mt-1 text-xs font-black text-[#222222] dark:text-[#F5F5F5]">
                        {money(sale.totalAmount)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                        Paid
                      </p>
                      <p className="mt-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]">
                        {money(sale.paidAmount)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                        Unpaid
                      </p>
                      <p className="mt-1 text-xs font-black text-[#F2A71B]">
                        {money(sale.balanceAmount)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-2 rounded-3xl border border-neutral-200 bg-white p-4 text-center shadow-sm dark:border-[#343434] dark:bg-[#222222]">
            <p className="text-xs font-bold text-[#6B7280] dark:text-[#A3A3A3]">
              Showing {visibleSales.length} of {unpaidSales.length}
            </p>

            {hasMore ? (
              <Link
                href={buildLoadMoreHref(q, take + PAGE_SIZE)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
              >
                Load more
              </Link>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
