import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq, inArray } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@dispensary/db/client';
import { customers, debtPayments, saleItems, sales } from '@dispensary/db/schema';
import { requireUser } from '@/lib/auth/session';

type CustomerDetailPageProps = {
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

function dateTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function buildLoadMoreHref(customerId: string, nextTake: number) {
  return `/customers/${customerId}?take=${nextTake}`;
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: CustomerDetailPageProps) {
  await requireUser();

  const { id } = await params;
  const query = await searchParams;
  const take = Math.max(PAGE_SIZE, Number(query?.take || PAGE_SIZE));

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  if (!customer || customer.status !== 'ACTIVE') {
    notFound();
  }

  const saleList = await db
    .select()
    .from(sales)
    .where(eq(sales.customerId, customer.id))
    .orderBy(desc(sales.saleDate));

  const visibleSales = saleList.slice(0, take);
  const hasMore = saleList.length > visibleSales.length;
  const saleIds = saleList.map((sale) => sale.id);
  const visibleSaleIds = visibleSales.map((sale) => sale.id);

  const [itemList, paymentList] = await Promise.all([
    visibleSaleIds.length > 0
      ? db.select().from(saleItems).where(inArray(saleItems.saleId, visibleSaleIds))
      : [],
    saleIds.length > 0
      ? db
          .select()
          .from(debtPayments)
          .where(inArray(debtPayments.saleId, saleIds))
          .orderBy(desc(debtPayments.paidAt))
      : [],
  ]);

  const totalBought = saleList.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const totalPaid = saleList.reduce((sum, sale) => sum + Number(sale.paidAmount), 0);
  const unpaidBalance = saleList.reduce((sum, sale) => sum + Number(sale.balanceAmount), 0);
  const unpaidSales = saleList.filter((sale) => Number(sale.balanceAmount) > 0);
  const totalProfit = saleList.reduce((sum, sale) => {
    const items = itemList.filter((item) => item.saleId === sale.id);
    return sum + items.reduce((itemSum, item) => itemSum + Number(item.profitAmount), 0);
  }, 0);

  const summary = [
    { label: 'Total bought', value: money(totalBought), helper: 'All purchases' },
    { label: 'Paid', value: money(totalPaid), helper: 'Money received' },
    { label: 'Unpaid', value: money(unpaidBalance), helper: 'Still owed' },
    { label: 'Sales', value: saleList.length, helper: 'Total sales' },
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
        <div className="flex flex-col gap-4 border-b border-neutral-100 pb-4 dark:border-[#343434] sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Customer file
            </p>
            <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
              {customer.name}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              {customer.phone || 'No phone number saved'}
            </p>
          </div>

          <Link
            href="/customers"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to customers
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                {item.label}
              </p>
              <p
                className={
                  item.label === 'Unpaid' && unpaidBalance > 0
                    ? 'mt-2 break-words text-lg font-black tracking-tight text-[#F2A71B] sm:text-xl'
                    : item.label === 'Paid'
                      ? 'mt-2 break-words text-lg font-black tracking-tight text-[#5F8A63] dark:text-[#79C27D] sm:text-xl'
                      : 'mt-2 break-words text-lg font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-xl'
                }
              >
                {item.value}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                {item.helper}
              </p>
            </article>
          ))}
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                  Sales history
                </p>
                <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
                  What this customer bought
                </h3>
              </div>

              <p className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] px-3 py-2 text-xs font-black text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
                Showing {visibleSales.length} of {saleList.length}
              </p>
            </div>

            {visibleSales.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#FAFAFC] p-4 text-sm font-semibold text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
                This customer has not bought anything yet.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {visibleSales.map((sale) => {
                  const items = itemList.filter((item) => item.saleId === sale.id);
                  const names = items
                    .map((item) => `${item.itemName} x${item.quantity} / ${priceTypeName(item.priceType)}`)
                    .join(', ');

                  return (
                    <Link
                      key={sale.id}
                      href={`/sales/${sale.id}`}
                      className="block rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 transition hover:border-[var(--primary)] dark:border-[#343434] dark:bg-[#161616]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-black text-[#222222] dark:text-[#F5F5F5]">
                            {dateTime(sale.saleDate)}
                          </p>
                          <p className="mt-1 break-words text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
                            {names || 'Sale items'}
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

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-[#343434] dark:bg-[#222222]">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                            Total
                          </p>
                          <p className="mt-1 text-xs font-black text-[#222222] dark:text-[#F5F5F5]">
                            {money(sale.totalAmount)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-[#343434] dark:bg-[#222222]">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                            Paid
                          </p>
                          <p className="mt-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]">
                            {money(sale.paidAmount)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-[#343434] dark:bg-[#222222]">
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
                    </Link>
                  );
                })}
              </div>
            )}

            {hasMore ? (
              <div className="mt-4 flex justify-center">
                <Link
                  href={buildLoadMoreHref(customer.id, take + PAGE_SIZE)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                >
                  Load more sales
                </Link>
              </div>
            ) : null}
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Debt follow-up
            </p>
            <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
              Unpaid sales
            </h3>

            {unpaidSales.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-[#5F8A63]/30 bg-[#5F8A63]/10 p-4 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]">
                This customer has no unpaid balance.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {unpaidSales.map((sale) => (
                  <Link
                    key={sale.id}
                    href={`/debts/${sale.id}`}
                    className="block rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 p-3 transition hover:border-[var(--primary)]"
                  >
                    <p className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                      {money(sale.balanceAmount)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#8a6413] dark:text-[#FFD45A]">
                      Open debt / {dateTime(sale.saleDate)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Later payments
            </p>
            <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
              Payment history
            </h3>

            {paymentList.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#FAFAFC] p-4 text-sm font-semibold text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
                No later payment recorded yet.
              </p>
            ) : (
              <div className="mt-5 divide-y divide-neutral-100 dark:divide-[#343434]">
                {paymentList.slice(0, 8).map((payment) => (
                  <div key={payment.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                          {money(payment.amount)}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
                          {paymentName(payment.paymentMethod)} / {dateTime(payment.paidAt)}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full border border-[#5F8A63]/30 bg-[#5F8A63]/10 px-3 py-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]">
                        Paid
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Owner view
            </p>
            <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
              Customer value
            </h3>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280]">
                  Profit shown
                </p>
                <p className="mt-2 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]">
                  {money(totalProfit)}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280]">
                  Payments
                </p>
                <p className="mt-2 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                  {paymentList.length}
                </p>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
