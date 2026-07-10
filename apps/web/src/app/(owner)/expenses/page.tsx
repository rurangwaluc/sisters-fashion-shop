import Link from 'next/link';
import { desc, eq, ilike, or } from 'drizzle-orm';
import { Search } from 'lucide-react';
import { requireOwner } from '@/lib/auth/session';
import { db } from '@dispensary/db/client';
import { cashDrawers, expenses } from '@dispensary/db/schema';
import { createExpenseAction } from '@/lib/expenses/actions';

type ExpensesPageProps = {
  searchParams?: Promise<{
    q?: string;
    take?: string;
    error?: string;
    added?: string;
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

function isToday(value: Date) {
  const today = new Date();

  return (
    value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth() &&
    value.getDate() === today.getDate()
  );
}

function isThisMonth(value: Date) {
  const today = new Date();

  return value.getFullYear() === today.getFullYear() && value.getMonth() === today.getMonth();
}

function buildLoadMoreHref(q: string, nextTake: number) {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  params.set('take', String(nextTake));

  return `/expenses?${params.toString()}`;
}

export default async function ExpensesPage({
  searchParams,
}: ExpensesPageProps) {
  await requireOwner();

  const params = await searchParams;
  const q = params?.q?.trim() || '';
  const take = Math.max(PAGE_SIZE, Number(params?.take || PAGE_SIZE));
  const error = params?.error || '';
  const added = params?.added === '1';

  const [expenseList, openDrawer] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(
        q
          ? or(
              ilike(expenses.name, `%${q}%`),
              ilike(expenses.category, `%${q}%`),
              ilike(expenses.notes, `%${q}%`),
            )
          : undefined,
      )
      .orderBy(desc(expenses.expenseDate)),
    db.query.cashDrawers.findFirst({
      where: eq(cashDrawers.status, 'OPEN'),
      orderBy: desc(cashDrawers.openedAt),
    }),
  ]);

  const visibleExpenses = expenseList.slice(0, take);
  const hasMore = expenseList.length > visibleExpenses.length;

  const todayExpenses = expenseList.filter((expense) => isToday(expense.expenseDate));
  const monthExpenses = expenseList.filter((expense) => isThisMonth(expense.expenseDate));

  const todayTotal = todayExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthTotal = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const allTotal = expenseList.reduce((sum, expense) => sum + Number(expense.amount), 0);

  const summary = [
    { label: 'Today', value: money(todayTotal), helper: 'Money spent today' },
    { label: 'This month', value: money(monthTotal), helper: 'Money spent this month' },
    { label: 'All expenses', value: money(allTotal), helper: 'Total recorded expenses' },
    { label: 'Records', value: expenseList.length, helper: 'Expense entries' },
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
          Owner spending
        </p>
        <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-4xl">
          Expenses
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
          Record shop costs like rent, transport, packaging, electricity, repairs, and other money that went out.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((item) => (
          <article
            key={item.label}
            className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
              {item.label}
            </p>
            <p className="mt-2 break-words text-lg font-black tracking-tight text-[#E85D5D] sm:text-xl">
              {item.value}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
              {item.helper}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[390px_1fr]">
        <form
          action={createExpenseAction}
          className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
            New expense
          </p>
          <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
            Add expense
          </h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
            Cash expenses need an open cash drawer.
          </p>

          {!openDrawer ? (
            <div className="mt-4 rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3 text-sm font-bold text-[#8A5A00] dark:text-[#FFD45A]">
              Cash drawer is closed. You can save Mobile money, Bank, or Card expenses. Open the drawer first for Cash.
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                Expense name
              </label>
              <input
                id="name"
                name="name"
                required
                placeholder="Rent, transport, electricity"
                className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                Category
              </label>
              <input
                id="category"
                name="category"
                required
                defaultValue="Shop costs"
                placeholder="Rent, transport, packaging"
                className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                  Amount
                </label>
                <input
                  id="amount"
                  name="amount"
                  inputMode="decimal"
                  required
                  placeholder="5000"
                  className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="expenseDate" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                  Date
                </label>
                <input
                  id="expenseDate"
                  name="expenseDate"
                  type="date"
                  className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-[#222222] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="paymentMethod" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                Paid from
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                defaultValue={openDrawer ? 'CASH' : 'MOBILE_MONEY'}
                className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-black text-[#222222] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
              >
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile money</option>
                <option value="BANK">Bank</option>
                <option value="CARD">Card</option>
              </select>
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
                className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
              />
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3 text-sm font-bold text-[#8A5A00] dark:text-[#FFD45A]">
              {error}
            </div>
          ) : null}

          {added ? (
            <div className="mt-4 rounded-2xl border border-[#5F8A63]/40 bg-[#5F8A63]/10 px-4 py-3 text-sm font-bold text-[#5F8A63] dark:text-[#79C27D]">
              Expense saved.
            </div>
          ) : null}

          <button className="mt-5 h-11 w-full rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-strong)]">
            Save expense
          </button>
        </form>

        <div className="space-y-4">
          <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]">
            <form className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search expense, category, or notes"
                  className="h-11 w-full rounded-2xl border border-neutral-200 bg-white pl-10 pr-3 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                />
              </div>
              <button className="h-11 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]">
                Search
              </button>
            </form>
          </div>

          {visibleExpenses.length === 0 ? (
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-8">
              <h3 className="font-display text-2xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
                No expenses found
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
                Add an expense or change your search.
              </p>
            </section>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-[#343434] dark:bg-[#222222] md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-[#FAFAFC] text-[11px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
                    <tr>
                      <th className="px-4 py-3">Expense</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Paid from</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-100 dark:divide-[#343434]">
                    {visibleExpenses.map((expense) => (
                      <tr key={expense.id} className="transition hover:bg-[#FAFAFC] dark:hover:bg-[#161616]">
                        <td className="px-4 py-5 align-top">
                          <p className="font-black text-[#222222] dark:text-[#F5F5F5]">{expense.name}</p>
                          <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                            {expense.notes || 'No notes'}
                          </p>
                        </td>

                        <td className="px-4 py-5 align-top font-black text-[#222222] dark:text-[#F5F5F5]">
                          {expense.category}
                        </td>

                        <td className="px-4 py-5 align-top font-black text-[#222222] dark:text-[#F5F5F5]">
                          {paymentName(expense.paymentMethod)}
                        </td>

                        <td className="px-4 py-5 align-top font-black text-[#222222] dark:text-[#F5F5F5]">
                          {expense.expenseDate.toLocaleDateString()}
                        </td>

                        <td className="px-4 py-5 text-right align-top font-black text-[#E85D5D]">
                          {money(expense.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {visibleExpenses.map((expense) => (
                  <article
                    key={expense.id}
                    className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-black text-[#222222] dark:text-[#F5F5F5]">
                          {expense.name}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                          {expense.category} / {paymentName(expense.paymentMethod)}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-xl border border-[#E85D5D]/30 bg-[#E85D5D]/10 px-2 py-1 text-xs font-black text-[#E85D5D]">
                        {money(expense.amount)}
                      </span>
                    </div>

                    <p className="mt-3 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                      {expense.expenseDate.toLocaleDateString()}
                    </p>

                    {expense.notes ? (
                      <p className="mt-2 text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
                        {expense.notes}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>

              <div className="flex flex-col items-center gap-2 rounded-3xl border border-neutral-200 bg-white p-4 text-center shadow-sm dark:border-[#343434] dark:bg-[#222222]">
                <p className="text-xs font-bold text-[#6B7280] dark:text-[#A3A3A3]">
                  Showing {visibleExpenses.length} of {expenseList.length}
                </p>

                {hasMore ? (
                  <Link
                    href={buildLoadMoreHref(q, take + PAGE_SIZE)}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  >
                    Load more
                  </Link>
                ) : null}
              </div>
            </>
          )}
        </div>
      </section>
    </section>
  );
}
