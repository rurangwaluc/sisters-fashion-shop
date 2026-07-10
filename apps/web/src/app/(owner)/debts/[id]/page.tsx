import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@dispensary/db/client';
import {
  cashDrawerMovements,
  cashDrawers,
  debtPayments,
  saleItems,
  sales,
} from '@dispensary/db/schema';
import { requireUser } from '@/lib/auth/session';
import { DebtPaymentForm } from './debt-payment-form';

type DebtDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
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

function priceTypeName(value: string) {
  return value === 'WHOLESALE' ? 'Wholesale' : 'Retail';
}

function movementName(value: string) {
  const names: Record<string, string> = {
    CASH_SALE: 'Cash sale',
    CUSTOMER_EXTRA_KEPT: 'Customer extra kept',
    CASH_DEBT_PAYMENT: 'Cash debt payment',
    CASH_ADDED: 'Cash added',
    CASH_REMOVED: 'Cash removed',
    CASH_DEPOSIT: 'Cash deposit',
    CASH_EXPENSE: 'Cash expense',
    OPENING_CASH: 'Opening cash',
    CLOSING_COUNT: 'Closing count',
    CASH_DIFFERENCE: 'Cash difference',
  };

  return names[value] || value;
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function buildLoadMoreHref(saleId: string, nextTake: number) {
  return `/debts/${saleId}?take=${nextTake}`;
}

export default async function DebtDetailPage({
  params,
  searchParams,
}: DebtDetailPageProps) {
  await requireUser();

  const { id } = await params;
  const query = await searchParams;
  const take = Math.max(PAGE_SIZE, Number(query?.take || PAGE_SIZE));

  const [sale] = await db.select().from(sales).where(eq(sales.id, id)).limit(1);

  if (!sale) {
    notFound();
  }

  const [items, openDrawer, payments, drawerMovements] = await Promise.all([
    db.select().from(saleItems).where(eq(saleItems.saleId, sale.id)),
    db.query.cashDrawers.findFirst({
      where: eq(cashDrawers.status, 'OPEN'),
    }),
    db
      .select()
      .from(debtPayments)
      .where(eq(debtPayments.saleId, sale.id))
      .orderBy(desc(debtPayments.paidAt)),
    db
      .select()
      .from(cashDrawerMovements)
      .where(eq(cashDrawerMovements.saleId, sale.id))
      .orderBy(desc(cashDrawerMovements.createdAt)),
  ]);

  const visiblePayments = payments.slice(0, take);
  const hasMorePayments = payments.length > visiblePayments.length;
  const isCleared = Number(sale.balanceAmount) <= 0;
  const totalProfit = items.reduce((sum, item) => sum + Number(item.profitAmount), 0);

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
        <div className="flex flex-col gap-4 border-b border-neutral-100 pb-4 dark:border-[#343434] sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Debt detail
            </p>
            <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
              {sale.customerName || 'Walk-in customer'}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              {sale.customerPhone || 'No phone'} / {dateTime(sale.saleDate)} / {paymentName(sale.paymentMethod)}
            </p>
          </div>

          <Link
            href="/debts"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to debts
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
              Sale total
            </p>
            <p className="mt-2 break-words text-lg font-black text-[#222222] dark:text-[#F5F5F5]">
              {money(sale.totalAmount)}
            </p>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
              Already paid
            </p>
            <p className="mt-2 break-words text-lg font-black text-[#5F8A63] dark:text-[#79C27D]">
              {money(sale.paidAmount)}
            </p>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
              Still unpaid
            </p>
            <p className="mt-2 break-words text-lg font-black text-[#F2A71B]">
              {money(sale.balanceAmount)}
            </p>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
              Status
            </p>
            <p
              className={
                isCleared
                  ? 'mt-2 text-lg font-black text-[#5F8A63] dark:text-[#79C27D]'
                  : 'mt-2 text-lg font-black text-[#F2A71B]'
              }
            >
              {isCleared ? 'Cleared' : 'Unpaid'}
            </p>
          </article>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                  Sale items
                </p>
                <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
                  What customer bought
                </h3>
              </div>

              <Link
                href={`/sales/${sale.id}`}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 text-xs font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
              >
                Open sale
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="break-words font-black text-[#222222] dark:text-[#F5F5F5]">
                        {item.itemName} x{item.quantity}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#6B7280] dark:text-[#A3A3A3]">
                        {priceTypeName(item.priceType)} / Unit price {money(item.unitPrice)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                      {money(item.lineTotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[#5F8A63]/30 bg-[#5F8A63]/10 px-4 py-3 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]">
              Profit on this sale: {money(totalProfit)}
            </div>
          </article>

          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Payment history
            </p>
            <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
              Later payments
            </h3>
            <p className="mt-1 text-sm font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
              Money paid after the original sale.
            </p>

            {visiblePayments.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#FAFAFC] p-4 text-sm font-semibold text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
                No later payment recorded yet.
              </p>
            ) : (
              <>
                <div className="mt-5 divide-y divide-neutral-100 dark:divide-[#343434]">
                  {visiblePayments.map((payment) => (
                    <div key={payment.id} className="py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black text-[#222222] dark:text-[#F5F5F5]">
                            {money(payment.amount)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                            {paymentName(payment.paymentMethod)} / {dateTime(payment.paidAt)}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-[#5F8A63]/30 bg-[#5F8A63]/10 px-3 py-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]">
                          Paid
                        </span>
                      </div>

                      {payment.notes ? (
                        <p className="mt-2 break-words text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
                          {payment.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>

                {hasMorePayments ? (
                  <div className="mt-4 flex justify-center">
                    <Link
                      href={buildLoadMoreHref(sale.id, take + PAGE_SIZE)}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                    >
                      Load more payments
                    </Link>
                  </div>
                ) : null}
              </>
            )}
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Record payment
            </p>
            <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
              Money paid later
            </h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              Cash needs an open cash drawer. Mobile money, bank, and card do not enter the drawer.
            </p>

            <div className="mt-5">
              {Number(sale.balanceAmount) > 0 ? (
                <DebtPaymentForm
                  saleId={sale.id}
                  balanceAmount={sale.balanceAmount}
                  hasOpenDrawer={Boolean(openDrawer)}
                />
              ) : (
                <div className="rounded-2xl border border-[#5F8A63]/40 bg-[#5F8A63]/10 p-4 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]">
                  This debt is fully paid.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Drawer trail
            </p>
            <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
              Cash movements
            </h3>

            {drawerMovements.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#FAFAFC] p-4 text-sm font-semibold text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
                No cash drawer movement for this debt yet.
              </p>
            ) : (
              <div className="mt-5 divide-y divide-neutral-100 dark:divide-[#343434]">
                {drawerMovements.map((movement) => (
                  <div key={movement.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                          {movementName(movement.movementType)}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
                          {movement.reason || 'No reason'} / {dateTime(movement.createdAt)}
                        </p>
                      </div>

                      <p
                        className={
                          movement.direction === 'OUT'
                            ? 'shrink-0 text-sm font-black text-[#E85D5D]'
                            : movement.direction === 'IN'
                              ? 'shrink-0 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]'
                              : 'shrink-0 text-sm font-black text-[#6B7280] dark:text-[#A3A3A3]'
                        }
                      >
                        {movement.direction === 'OUT' ? '-' : movement.direction === 'IN' ? '+' : ''}
                        {money(movement.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </aside>
      </section>
    </section>
  );
}
