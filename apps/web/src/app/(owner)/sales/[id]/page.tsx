import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { db } from '@dispensary/db/client';
import { cashDrawerMovements, saleItems, sales } from '@dispensary/db/schema';

type SaleDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function money(value: string | number) {
  return `RWF ${Number(value).toLocaleString('en-US')}`;
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
    OPENING_CASH: 'Opening cash',
    CASH_SALE: 'Cash sale',
    CUSTOMER_EXTRA_KEPT: 'Customer extra kept',
    CASH_ADDED: 'Cash added',
    CASH_REMOVED: 'Cash removed',
    CASH_DEPOSIT: 'Cash deposit',
    CASH_EXPENSE: 'Cash expense',
    CLOSING_COUNT: 'Closing count',
    CASH_DIFFERENCE: 'Cash difference',
  };

  return names[value] || value;
}

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  await requireUser();

  const { id } = await params;

  const [sale] = await db.select().from(sales).where(eq(sales.id, id)).limit(1);

  if (!sale) {
    notFound();
  }

  const [items, drawerMovements] = await Promise.all([
    db.select().from(saleItems).where(eq(saleItems.saleId, sale.id)),
    db.select().from(cashDrawerMovements).where(eq(cashDrawerMovements.saleId, sale.id)),
  ]);

  const totalProfit = items.reduce((sum, item) => sum + Number(item.profitAmount), 0);
  const totalCost = items.reduce((sum, item) => sum + Number(item.unitCost) * item.quantity, 0);
  const isPaid = Number(sale.balanceAmount) <= 0;

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
        <div className="flex flex-col gap-4 border-b border-neutral-100 pb-4 dark:border-[#343434] sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Sale detail
            </p>
            <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
              {sale.customerName || 'Walk-in customer'}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              {dateTime(sale.saleDate)} / {paymentName(sale.paymentMethod)}
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
              Paid to sale
            </p>
            <p className="mt-2 break-words text-lg font-black text-[#5F8A63] dark:text-[#79C27D]">
              {money(sale.paidAmount)}
            </p>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
              Profit
            </p>
            <p className="mt-2 break-words text-lg font-black text-[#5F8A63] dark:text-[#79C27D]">
              {money(totalProfit)}
            </p>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
              Status
            </p>
            <p
              className={
                isPaid
                  ? 'mt-2 text-lg font-black text-[#5F8A63] dark:text-[#79C27D]'
                  : 'mt-2 text-lg font-black text-[#F2A71B]'
              }
            >
              {isPaid ? 'Paid' : 'Unpaid'}
            </p>
          </article>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                  Items sold
                </p>
                <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
                  Sale lines
                </h3>
              </div>
              <p className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] px-3 py-2 text-xs font-black text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
                {items.length} item{items.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="mt-5 hidden overflow-hidden rounded-2xl border border-neutral-200 dark:border-[#343434] md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-neutral-200 bg-[#FAFAFC] text-[11px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-[#343434]">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 align-top">
                        <p className="font-black text-[#222222] dark:text-[#F5F5F5]">
                          {item.itemName}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                          Line total: {money(item.lineTotal)}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top font-black text-[var(--primary)]">
                        {priceTypeName(item.priceType)}
                      </td>
                      <td className="px-4 py-4 align-top font-black text-[#222222] dark:text-[#F5F5F5]">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 align-top font-black text-[#222222] dark:text-[#F5F5F5]">
                        {money(item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 align-top font-black text-[#6B7280] dark:text-[#A3A3A3]">
                        {money(item.unitCost)}
                      </td>
                      <td className="px-4 py-4 align-top font-black text-[#5F8A63] dark:text-[#79C27D]">
                        {money(item.profitAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 space-y-3 md:hidden">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                        {item.itemName}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[var(--primary)]">
                        {priceTypeName(item.priceType)} / Qty {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                      {money(item.lineTotal)}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white p-2 dark:bg-[#222222]">
                      <p className="text-[10px] font-black uppercase text-[#6B7280]">Price</p>
                      <p className="mt-1 text-xs font-black text-[#222222] dark:text-[#F5F5F5]">
                        {money(item.unitPrice)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-2 dark:bg-[#222222]">
                      <p className="text-[10px] font-black uppercase text-[#6B7280]">Cost</p>
                      <p className="mt-1 text-xs font-black text-[#6B7280] dark:text-[#A3A3A3]">
                        {money(item.unitCost)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-2 dark:bg-[#222222]">
                      <p className="text-[10px] font-black uppercase text-[#6B7280]">Profit</p>
                      <p className="mt-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]">
                        {money(item.profitAmount)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Payment
            </p>
            <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
              Money details
            </h3>

            <div className="mt-5 space-y-3">
              {[
                ['Payment method', paymentName(sale.paymentMethod)],
                ['Amount received', money(sale.amountReceived)],
                ['Change returned', money(sale.changeReturned)],
                ['Extra kept', money(sale.extraKept)],
                ['Paid to sale', money(sale.paidAmount)],
                ['Unpaid', money(sale.balanceAmount)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-3 last:border-b-0 last:pb-0 dark:border-[#343434]"
                >
                  <span className="text-sm font-bold text-[#6B7280] dark:text-[#A3A3A3]">
                    {label}
                  </span>
                  <span className="text-right text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {sale.extraReason ? (
              <div className="mt-4 rounded-2xl border border-[#F05A9D]/20 bg-[#F05A9D]/10 px-4 py-3 text-xs font-bold leading-5 text-[var(--primary)]">
                Extra reason: {sale.extraReason}
              </div>
            ) : null}

            {sale.notes ? (
              <div className="mt-4 rounded-2xl border border-neutral-200 bg-[#FAFAFC] px-4 py-3 text-xs font-bold leading-5 text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
                Notes: {sale.notes}
              </div>
            ) : null}
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
                No drawer movement for this sale.
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

          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Owner view
            </p>
            <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
              Profit check
            </h3>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280]">
                  Cost
                </p>
                <p className="mt-2 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                  {money(totalCost)}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280]">
                  Profit
                </p>
                <p className="mt-2 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]">
                  {money(totalProfit)}
                </p>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
