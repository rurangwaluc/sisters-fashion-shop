import Link from 'next/link';
import { desc, inArray } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import { db } from '@dispensary/db/client';
import { saleItems, sales } from '@dispensary/db/schema';
import { requireUser } from '@/lib/auth/session';

type SalesPageProps = {
  searchParams?: Promise<{
    take?: string;
  }>;
};

const PAGE_SIZE = 10;

function money(value: string | number) {
  return `RWF ${Number(value).toLocaleString('en-US')}`;
}

function paymentName(value: string) {
  const names: Record<string, string> = {
    CASH: 'Cash',
    MOBILE_MONEY: 'Mobile money',
    BANK: 'Bank',
    CARD: 'Card',
  };

  return names[value] || value;
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function buildLoadMoreHref(nextTake: number) {
  return `/sales?take=${nextTake}`;
}

function priceTypeName(value: string) {
  return value === 'WHOLESALE' ? 'Wholesale' : 'Retail';
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  await requireUser();

  const params = await searchParams;
  const take = Math.max(PAGE_SIZE, Number(params?.take || PAGE_SIZE));

  const saleList = await db.select().from(sales).orderBy(desc(sales.saleDate));
  const visibleSales = saleList.slice(0, take);
  const hasMore = saleList.length > visibleSales.length;

  const visibleSaleIds = visibleSales.map((sale) => sale.id);

  const itemList =
    visibleSaleIds.length > 0
      ? await db.select().from(saleItems).where(inArray(saleItems.saleId, visibleSaleIds))
      : [];

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const todaySales = saleList.filter((sale) => sale.saleDate.toISOString().slice(0, 10) === todayKey);
  const todaySaleIds = todaySales.map((sale) => sale.id);
  const todayItems =
    todaySaleIds.length > 0
      ? await db.select().from(saleItems).where(inArray(saleItems.saleId, todaySaleIds))
      : [];

  const totalToday = todaySales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const receivedToday = todaySales.reduce((sum, sale) => sum + Number(sale.paidAmount), 0);
  const creditToday = todaySales.reduce((sum, sale) => sum + Number(sale.balanceAmount), 0);
  const changeToday = todaySales.reduce((sum, sale) => sum + Number(sale.changeReturned), 0);
  const extraToday = todaySales.reduce((sum, sale) => sum + Number(sale.extraKept), 0);
  const profitToday = todayItems.reduce((sum, item) => sum + Number(item.profitAmount), 0);

  const summary = [
    { label: 'Today sold', value: money(totalToday), helper: 'All sales total' },
    { label: 'Received', value: money(receivedToday), helper: 'Money kept for sales' },
    { label: 'Unpaid', value: money(creditToday), helper: 'Customer balance' },
    { label: 'Profit', value: money(profitToday), helper: 'Using average buying cost' },
  ];

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-[#343434] dark:bg-[#222222]">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Sales desk
            </p>
            <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-4xl">
              Sales
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              See what was sold, how money was received, what was returned as change, what extra was kept, and what remains unpaid.
            </p>
          </div>

          <Link
            href="/sales/new"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-strong)]"
          >
            <Plus className="h-4 w-4" />
            New sale
          </Link>
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

        <div className="grid grid-cols-2 gap-3 px-4 pb-4 dark:border-[#343434] sm:px-5 sm:pb-5 lg:grid-cols-4">
          <article className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
              Change returned
            </p>
            <p className="mt-2 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
              {money(changeToday)}
            </p>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
              Extra kept
            </p>
            <p className="mt-2 text-sm font-black text-[var(--primary)]">
              {money(extraToday)}
            </p>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
              Sales count
            </p>
            <p className="mt-2 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
              {todaySales.length}
            </p>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
              All records
            </p>
            <p className="mt-2 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
              {saleList.length}
            </p>
          </article>
        </div>
      </div>

      {visibleSales.length === 0 ? (
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-8">
          <h3 className="font-display text-2xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
            No sales yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
            Start by recording the first boutique sale.
          </p>
          <Link
            href="/sales/new"
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-strong)]"
          >
            <Plus className="h-4 w-4" />
            New sale
          </Link>
        </section>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-[#343434] dark:bg-[#222222] lg:block">
            <div className="grid grid-cols-[1.35fr_1.05fr_1.1fr_0.75fr_0.75fr_0.75fr] border-b border-neutral-200 bg-[#FAFAFC] px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
              <div>Sale</div>
              <div>Customer</div>
              <div>Payment</div>
              <div>Total</div>
              <div>Profit</div>
              <div>Unpaid</div>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-[#343434]">
              {visibleSales.map((sale) => {
                const items = itemList.filter((item) => item.saleId === sale.id);
                const names = items
                  .map((item) => `${item.itemName} x${item.quantity} / ${priceTypeName(item.priceType)}`)
                  .join(', ');
                const profit = items.reduce((sum, item) => sum + Number(item.profitAmount), 0);

                return (
                  <Link
                    key={sale.id}
                    href={`/sales/${sale.id}`}
                    className="grid grid-cols-[1.35fr_1.05fr_1.1fr_0.75fr_0.75fr_0.75fr] px-4 py-4 text-sm transition hover:bg-[#FAFAFC] hover:text-[var(--primary)] dark:hover:bg-[#161616]"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-black text-[#222222] dark:text-[#F5F5F5]">
                        {dateTime(sale.saleDate)}
                      </p>
                      <p className="mt-1 max-w-md break-words text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
                        {names || 'Sale items'}
                      </p>
                    </div>

                    <div className="min-w-0 pr-3">
                      <p className="break-words font-black text-[#222222] dark:text-[#F5F5F5]">
                        {sale.customerName || 'Walk-in customer'}
                      </p>
                      {sale.customerPhone ? (
                        <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                          {sale.customerPhone}
                        </p>
                      ) : null}
                    </div>

                    <div className="min-w-0 pr-3">
                      <p className="font-black text-[#222222] dark:text-[#F5F5F5]">
                        {paymentName(sale.paymentMethod)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#5F8A63] dark:text-[#79C27D]">
                        Received: {money(sale.amountReceived)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                        Change: {money(sale.changeReturned)}
                      </p>
                      {Number(sale.extraKept) > 0 ? (
                        <p className="mt-1 text-xs font-black text-[var(--primary)]">
                          Extra kept: {money(sale.extraKept)}
                        </p>
                      ) : null}
                    </div>

                    <div className="pr-3 font-black text-[#222222] dark:text-[#F5F5F5]">
                      {money(sale.totalAmount)}
                    </div>

                    <div className="pr-3 font-black text-[#5F8A63] dark:text-[#79C27D]">
                      {money(profit)}
                    </div>

                    <div>
                      <span
                        className={
                          Number(sale.balanceAmount) > 0
                            ? 'font-black text-[#F2A71B]'
                            : 'font-black text-[#5F8A63] dark:text-[#79C27D]'
                        }
                      >
                        {money(sale.balanceAmount)}
                      </span>
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
              const profit = items.reduce((sum, item) => sum + Number(item.profitAmount), 0);

              return (
                <Link
                  key={sale.id}
                  href={`/sales/${sale.id}`}
                  className="block rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-[var(--primary)] dark:border-[#343434] dark:bg-[#222222]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-black text-[#222222] dark:text-[#F5F5F5]">
                        {sale.customerName || 'Walk-in customer'}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                        {dateTime(sale.saleDate)} / {paymentName(sale.paymentMethod)}
                      </p>
                    </div>

                    <span
                      className={
                        Number(sale.balanceAmount) > 0
                          ? 'shrink-0 rounded-full border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-3 py-1 text-xs font-black text-[#8a6413] dark:text-[#FFD45A]'
                          : 'shrink-0 rounded-full border border-[#5F8A63]/30 bg-[#5F8A63]/10 px-3 py-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]'
                      }
                    >
                      {Number(sale.balanceAmount) > 0 ? 'Unpaid' : 'Paid'}
                    </span>
                  </div>

                  <p className="mt-3 break-words text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
                    {names || 'Sale items'}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                        Received
                      </p>
                      <p className="mt-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]">
                        {money(sale.amountReceived)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                        Profit
                      </p>
                      <p className="mt-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]">
                        {money(profit)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                        Change
                      </p>
                      <p className="mt-1 text-xs font-black text-[#222222] dark:text-[#F5F5F5]">
                        {money(sale.changeReturned)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                        Extra kept
                      </p>
                      <p className="mt-1 text-xs font-black text-[var(--primary)]">
                        {money(sale.extraKept)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                        Unpaid
                      </p>
                      <p
                        className={
                          Number(sale.balanceAmount) > 0
                            ? 'mt-1 text-xs font-black text-[#F2A71B]'
                            : 'mt-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]'
                        }
                      >
                        {money(sale.balanceAmount)}
                      </p>
                    </div>
                  </div>

                  {sale.extraReason ? (
                    <p className="mt-3 rounded-2xl border border-[#F05A9D]/20 bg-[#F05A9D]/10 px-3 py-2 text-xs font-bold text-[var(--primary)]">
                      Extra reason: {sale.extraReason}
                    </p>
                  ) : null}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-2 rounded-3xl border border-neutral-200 bg-white p-4 text-center shadow-sm dark:border-[#343434] dark:bg-[#222222]">
            <p className="text-xs font-bold text-[#6B7280] dark:text-[#A3A3A3]">
              Showing {visibleSales.length} of {saleList.length}
            </p>

            {hasMore ? (
              <Link
                href={buildLoadMoreHref(take + PAGE_SIZE)}
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
