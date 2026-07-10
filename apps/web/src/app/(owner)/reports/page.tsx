import Link from 'next/link';
import { Download, Printer } from 'lucide-react';
import { requireOwner } from '@/lib/auth/session';
import { cleanReportDate, cleanReportRange, getReport, money } from '@/lib/reports/report-data';

type ReportsPageProps = {
  searchParams?: Promise<{
    date?: string;
    range?: string;
  }>;
};

function rangeName(value: string) {
  if (value === 'week') {
    return 'Weekly';
  }

  if (value === 'month') {
    return 'Monthly';
  }

  return 'Daily';
}

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  await requireOwner();

  const params = await searchParams;
  const selectedDate = cleanReportDate(params?.date);
  const selectedRange = cleanReportRange(params?.range);
  const report = await getReport(selectedDate, selectedRange);

  const summary = [
    { label: 'Sales total', value: money(report.summary.salesTotal), helper: 'Total sold in this period' },
    { label: 'Money received', value: money(report.summary.moneyReceived), helper: 'Sale payments plus debt payments' },
    { label: 'Unpaid', value: money(report.summary.creditGiven), helper: 'Still owed from period sales' },
    { label: 'Gross profit', value: money(report.summary.grossProfit), helper: 'Profit before expenses' },
    { label: 'Expenses', value: money(report.summary.expensesTotal), helper: 'Money spent in this period' },
    { label: 'Net profit', value: money(report.summary.netProfit), helper: 'Gross profit minus expenses' },
    { label: 'Stock value', value: money(report.summary.stockValue), helper: 'Current active stock value' },
    { label: 'Cash expected', value: money(report.summary.cashDrawerExpected), helper: report.openDrawer ? 'Open drawer expected cash' : 'No open drawer' },
  ];

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-[#343434] dark:bg-[#222222]">
        <div className="flex flex-col gap-5 p-4 sm:p-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Owner reports
            </p>
            <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-4xl">
              Reports
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              Check sales, money received, unpaid balances, profit, expenses, stock value, and cash drawer totals.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <form action="/reports" className="grid gap-2 sm:grid-cols-[auto_auto_auto] sm:items-end">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                  Report type
                </span>
                <select
                  name="range"
                  defaultValue={selectedRange}
                  className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-black text-[#222222] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                  Select day
                </span>
                <input
                  type="date"
                  name="date"
                  defaultValue={selectedDate}
                  className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-black text-[#222222] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                />
              </label>

              <button className="h-11 rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-strong)]">
                Show report
              </button>
            </form>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href={`/reports/download?range=${selectedRange}&date=${selectedDate}&mode=inline`}
                target="_blank"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
              >
                <Printer className="h-4 w-4" />
                Print report
              </Link>

              <Link
                href={`/reports/download?range=${selectedRange}&date=${selectedDate}&mode=download`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-100 px-4 pb-4 dark:border-[#343434] sm:px-5 sm:pb-5">
          <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] px-4 py-3 text-sm font-black text-[#222222] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]">
            {rangeName(report.range)} report / {report.period.label}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summary.map((item) => (
          <article
            key={item.label}
            className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
              {item.label}
            </p>
            <p
              className={
                item.label === 'Net profit' && report.summary.netProfit < 0
                  ? 'mt-2 break-words text-lg font-black tracking-tight text-[#E85D5D] sm:text-xl'
                  : item.label === 'Money received' || item.label === 'Gross profit' || item.label === 'Net profit'
                    ? 'mt-2 break-words text-lg font-black tracking-tight text-[#5F8A63] dark:text-[#79C27D] sm:text-xl'
                    : item.label === 'Unpaid'
                      ? 'mt-2 break-words text-lg font-black tracking-tight text-[#F2A71B] sm:text-xl'
                      : 'mt-2 break-words text-lg font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-xl'
              }
            >
              {item.value}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
              {item.helper}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
            Money
          </p>
          <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
            Money received by method
          </h3>

          <div className="mt-5 divide-y divide-neutral-100 dark:divide-[#343434]">
            {report.paymentRows.map((row) => (
              <div key={row.method} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-[#222222] dark:text-[#F5F5F5]">{row.name}</p>
                    <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                      Sales: {money(row.saleMoney)} / Debt payments: {money(row.debtMoney)}
                    </p>
                  </div>
                  <p className="shrink-0 font-black text-[#5F8A63] dark:text-[#79C27D]">
                    {money(row.total)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
            Profit check
          </p>
          <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
            Profit breakdown
          </h3>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280]">
                Gross profit
              </p>
              <p className="mt-2 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]">
                {money(report.summary.grossProfit)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280]">
                Expenses
              </p>
              <p className="mt-2 text-sm font-black text-[#E85D5D]">
                {money(report.summary.expensesTotal)}
              </p>
            </div>

            <div className="col-span-2 rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280]">
                Net profit
              </p>
              <p
                className={
                  report.summary.netProfit < 0
                    ? 'mt-2 text-sm font-black text-[#E85D5D]'
                    : 'mt-2 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]'
                }
              >
                {money(report.summary.netProfit)}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
            Products
          </p>
          <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
            Top products sold
          </h3>

          {report.productRows.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#FAFAFC] p-4 text-sm font-semibold text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
              No products sold in this period.
            </p>
          ) : (
            <div className="mt-5 divide-y divide-neutral-100 dark:divide-[#343434]">
              {report.productRows.map((row) => (
                <div key={row.name} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="font-black text-[#222222] dark:text-[#F5F5F5]">{row.name}</p>
                    <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                      Quantity: {row.quantity} / Profit: {money(row.profit)}
                    </p>
                  </div>
                  <p className="shrink-0 font-black text-[#222222] dark:text-[#F5F5F5]">
                    {money(row.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
            Stock
          </p>
          <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
            Products to restock
          </h3>

          {report.lowStock.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-[#5F8A63]/30 bg-[#5F8A63]/10 p-4 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]">
              No low stock products.
            </p>
          ) : (
            <div className="mt-5 divide-y divide-neutral-100 dark:divide-[#343434]">
              {report.lowStock.map((product) => (
                <div key={product.id} className="flex items-start justify-between gap-4 py-3">
                  <p className="break-words font-black text-[#222222] dark:text-[#F5F5F5]">
                    {product.name}
                  </p>
                  <p className="shrink-0 font-black text-[#F2A71B]">
                    {product.quantity} {product.unit}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
          Expenses
        </p>
        <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
          Expenses by category
        </h3>

        {report.expenseCategoryRows.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#FAFAFC] p-4 text-sm font-semibold text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
            No expenses in this period.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {report.expenseCategoryRows.map((row) => (
              <div
                key={row.category}
                className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]"
              >
                <p className="break-words text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                  {row.category}
                </p>
                <p className="mt-2 text-sm font-black text-[#E85D5D]">{money(row.total)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
