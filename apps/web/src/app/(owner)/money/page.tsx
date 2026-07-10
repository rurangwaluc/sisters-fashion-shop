import { desc, eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/session';
import { db } from '@dispensary/db/client';
import {
  cashDrawerMovements,
  cashDrawers,
  expenses,
  moneyAdditions,
  moneyTransfers,
} from '@dispensary/db/schema';
import {
  addDrawerCashAction,
  closeCashDrawerAction,
  depositDrawerCashAction,
  openCashDrawerAction,
  recordDrawerCashExpenseAction,
  removeDrawerCashAction,
} from '@/lib/cash-drawer/actions';
import {
  getDrawerCashIn,
  getDrawerCashOut,
  getExpectedDrawerCash,
} from '@/lib/cash-drawer/calculations';
import { getMoneyBalances, paymentName } from '@/lib/money/balance';

type MoneyPageProps = {
  searchParams?: Promise<{
    error?: string;
    drawerOpened?: string;
    drawerClosed?: string;
    cashAdded?: string;
    cashRemoved?: string;
    cashDeposited?: string;
    cashExpense?: string;
  }>;
};

type MovementType =
  | 'OPENING_CASH'
  | 'CASH_SALE'
  | 'CUSTOMER_EXTRA_KEPT'
  | 'CASH_ADDED'
  | 'CASH_REMOVED'
  | 'CASH_DEPOSIT'
  | 'CASH_EXPENSE'
  | 'CLOSING_COUNT'
  | 'CASH_DIFFERENCE';

function money(value: string | number) {
  return `RWF ${Number(value).toLocaleString('en-US')}`;
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function movementName(value: MovementType | string) {
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

function successMessage(params: Awaited<MoneyPageProps['searchParams']>) {
  if (params?.drawerOpened === '1') return 'Cash drawer opened.';
  if (params?.drawerClosed === '1') return 'Cash drawer closed.';
  if (params?.cashAdded === '1') return 'Cash added to drawer.';
  if (params?.cashRemoved === '1') return 'Cash removed from drawer.';
  if (params?.cashDeposited === '1') return 'Cash deposit recorded.';
  if (params?.cashExpense === '1') return 'Cash expense recorded.';
  return '';
}

export default async function MoneyPage({ searchParams }: MoneyPageProps) {
  await requireOwner();

  const params = await searchParams;
  const error = params?.error || '';
  const success = successMessage(params);

  const [balances, currentDrawer, recentClosedDrawers, transferList, additionList, expenseList] =
    await Promise.all([
      getMoneyBalances(),
      db.query.cashDrawers.findFirst({
        where: eq(cashDrawers.status, 'OPEN'),
        orderBy: desc(cashDrawers.openedAt),
      }),
      db.select().from(cashDrawers).where(eq(cashDrawers.status, 'CLOSED')).orderBy(desc(cashDrawers.closedAt)).limit(5),
      db.select().from(moneyTransfers).orderBy(desc(moneyTransfers.movedAt)).limit(6),
      db.select().from(moneyAdditions).orderBy(desc(moneyAdditions.addedAt)).limit(6),
      db.select().from(expenses).orderBy(desc(expenses.expenseDate)).limit(6),
    ]);

  const currentMovements = currentDrawer
    ? await db
        .select()
        .from(cashDrawerMovements)
        .where(eq(cashDrawerMovements.drawerId, currentDrawer.id))
        .orderBy(desc(cashDrawerMovements.createdAt))
    : [];

  const expectedCash = currentDrawer ? getExpectedDrawerCash(currentDrawer, currentMovements) : 0;
  const drawerCashIn = getDrawerCashIn(currentMovements);
  const drawerCashOut = getDrawerCashOut(currentMovements);
  const cashBalance = balances.find((item) => item.method === 'CASH')?.balance || 0;
  const bankBalance = balances.find((item) => item.method === 'BANK')?.balance || 0;
  const momoBalance = balances.find((item) => item.method === 'MOBILE_MONEY')?.balance || 0;
  const totalMoney = balances.reduce((sum, item) => sum + item.balance, 0);

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-[#343434] dark:bg-[#222222]">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Money control
            </p>
            <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-4xl">
              Cash drawer
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              Open the drawer, track every cash movement, deposit money, record cash expenses,
              and close with a clear reason when cash is extra or missing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                Status
              </p>
              <p className="mt-2 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                {currentDrawer ? 'Open' : 'Closed'}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                Expected
              </p>
              <p className="mt-2 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                {money(expectedCash)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                Cash in
              </p>
              <p className="mt-2 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]">
                {money(drawerCashIn)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                Cash out
              </p>
              <p className="mt-2 text-sm font-black text-[#E85D5D]">
                {money(drawerCashOut)}
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mx-4 mb-4 rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3 text-sm font-black text-[#8a6413] dark:text-[#FFD45A] sm:mx-5">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mx-4 mb-4 rounded-2xl border border-[#5F8A63]/40 bg-[#5F8A63]/10 px-4 py-3 text-sm font-black text-[#3d6f43] dark:text-[#79C27D] sm:mx-5">
            {success}
          </div>
        ) : null}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
            Drawer cash
          </p>
          <p className="mt-3 text-xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-2xl">
            {money(expectedCash)}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
            Physical cash expected
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
            Total cash
          </p>
          <p className="mt-3 text-xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-2xl">
            {money(cashBalance)}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
            Cash records balance
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
            Mobile money
          </p>
          <p className="mt-3 text-xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-2xl">
            {money(momoBalance)}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
            Deposits and payments
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
            Bank
          </p>
          <p className="mt-3 text-xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-2xl">
            {money(bankBalance)}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
            Bank records balance
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          {currentDrawer ? (
            <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                    Current drawer
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
                    Open since {dateTime(currentDrawer.openedAt)}
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
                    Starting cash {money(currentDrawer.openingCash)} / Expected now{' '}
                    {money(expectedCash)}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#F05A9D]/30 bg-[#F05A9D]/10 px-4 py-3 text-sm font-black text-[var(--primary)]">
                  Drawer open
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                    Starting
                  </p>
                  <p className="mt-2 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                    {money(currentDrawer.openingCash)}
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                    Added
                  </p>
                  <p className="mt-2 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]">
                    {money(drawerCashIn)}
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                    Removed
                  </p>
                  <p className="mt-2 text-sm font-black text-[#E85D5D]">
                    {money(drawerCashOut)}
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                    Expected
                  </p>
                  <p className="mt-2 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                    {money(expectedCash)}
                  </p>
                </div>
              </div>
            </article>
          ) : (
            <form
              action={openCashDrawerAction}
              className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                Start work
              </p>
              <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
                Open cash drawer
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
                Count the cash inside the drawer before making cash sales.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="openingCash" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                    Starting cash
                  </label>
                  <input
                    id="openingCash"
                    name="openingCash"
                    inputMode="decimal"
                    required
                    placeholder="Example: 50000"
                    className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="openingNote" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                    Opening note
                  </label>
                  <input
                    id="openingNote"
                    name="openingNote"
                    placeholder="Example: Morning opening"
                    className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                </div>
              </div>

              <button className="mt-5 h-12 w-full rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-strong)] sm:w-auto">
                Open drawer
              </button>
            </form>
          )}

          {currentDrawer ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <form
                action={addDrawerCashAction}
                className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]"
              >
                <h3 className="font-display text-xl font-black text-[#222222] dark:text-[#F5F5F5]">
                  Add cash
                </h3>
                <p className="mt-1 text-sm font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                  Use this when the owner puts cash in the drawer.
                </p>

                <div className="mt-4 space-y-3">
                  <input
                    name="amount"
                    inputMode="decimal"
                    required
                    placeholder="Amount"
                    className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                  <textarea
                    name="reason"
                    rows={3}
                    required
                    placeholder="Reason"
                    className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                </div>

                <button className="mt-4 h-11 w-full rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--primary-strong)]">
                  Add cash
                </button>
              </form>

              <form
                action={removeDrawerCashAction}
                className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]"
              >
                <h3 className="font-display text-xl font-black text-[#222222] dark:text-[#F5F5F5]">
                  Remove cash
                </h3>
                <p className="mt-1 text-sm font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                  Use this when cash leaves the drawer but is not a bank deposit or expense.
                </p>

                <div className="mt-4 space-y-3">
                  <input
                    name="amount"
                    inputMode="decimal"
                    required
                    placeholder="Amount"
                    className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                  <textarea
                    name="reason"
                    rows={3}
                    required
                    placeholder="Reason"
                    className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                </div>

                <button className="mt-4 h-11 w-full rounded-2xl border border-[#E85D5D]/40 px-5 text-sm font-black text-[#E85D5D] transition hover:bg-[#E85D5D]/10">
                  Remove cash
                </button>
              </form>

              <form
                action={depositDrawerCashAction}
                className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]"
              >
                <h3 className="font-display text-xl font-black text-[#222222] dark:text-[#F5F5F5]">
                  Deposit cash
                </h3>
                <p className="mt-1 text-sm font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                  Use this when drawer cash is moved to mobile money or bank.
                </p>

                <div className="mt-4 space-y-3">
                  <select
                    name="toPaymentMethod"
                    defaultValue="BANK"
                    className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-black text-[#222222] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  >
                    <option value="BANK">Bank</option>
                    <option value="MOBILE_MONEY">Mobile money</option>
                  </select>
                  <input
                    name="amount"
                    inputMode="decimal"
                    required
                    placeholder="Amount"
                    className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                  <textarea
                    name="reason"
                    rows={3}
                    required
                    placeholder="Reason"
                    className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                </div>

                <button className="mt-4 h-11 w-full rounded-2xl bg-[#222222] px-5 text-sm font-black text-white transition hover:opacity-90 dark:bg-[#F5F5F5] dark:text-[#161616]">
                  Record deposit
                </button>
              </form>

              <form
                action={recordDrawerCashExpenseAction}
                className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]"
              >
                <h3 className="font-display text-xl font-black text-[#222222] dark:text-[#F5F5F5]">
                  Cash expense
                </h3>
                <p className="mt-1 text-sm font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                  Use this when an expense is paid directly from the drawer.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    name="name"
                    required
                    placeholder="Expense name"
                    className="h-12 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                  <input
                    name="category"
                    required
                    placeholder="Category"
                    className="h-12 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                  <input
                    name="amount"
                    inputMode="decimal"
                    required
                    placeholder="Amount"
                    className="h-12 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5] sm:col-span-2"
                  />
                  <textarea
                    name="notes"
                    rows={3}
                    required
                    placeholder="Why this cash was spent"
                    className="resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5] sm:col-span-2"
                  />
                </div>

                <button className="mt-4 h-11 w-full rounded-2xl border border-[#E85D5D]/40 px-5 text-sm font-black text-[#E85D5D] transition hover:bg-[#E85D5D]/10">
                  Record expense
                </button>
              </form>
            </div>
          ) : null}

          {currentDrawer ? (
            <form
              action={closeCashDrawerAction}
              className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                End work
              </p>
              <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
                Close cash drawer
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
                Expected cash is {money(expectedCash)}. Count the real cash in the drawer. If it is
                extra or missing, explain why.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="countedCash" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                    Counted cash
                  </label>
                  <input
                    id="countedCash"
                    name="countedCash"
                    inputMode="decimal"
                    required
                    placeholder="Amount counted"
                    className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="differenceReason" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                    Reason if extra or missing
                  </label>
                  <input
                    id="differenceReason"
                    name="differenceReason"
                    placeholder="Required only when cash is extra or missing"
                    className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                </div>

                <div className="space-y-2 sm:col-span-3">
                  <label htmlFor="closingNote" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                    Closing note
                  </label>
                  <textarea
                    id="closingNote"
                    name="closingNote"
                    rows={3}
                    placeholder="Optional"
                    className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-[#222222] outline-none transition placeholder:text-[#6B7280]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                </div>
              </div>

              <button className="mt-5 h-12 w-full rounded-2xl bg-[#222222] px-5 text-sm font-black text-white shadow-sm transition hover:opacity-90 dark:bg-[#F5F5F5] dark:text-[#161616] sm:w-auto">
                Close drawer
              </button>
            </form>
          ) : null}
        </div>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                  Drawer movements
                </p>
                <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
                  Today’s cash trail
                </h3>
              </div>
              <span className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] px-3 py-2 text-xs font-black text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
                {currentMovements.length}
              </span>
            </div>

            {currentMovements.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#FAFAFC] p-4 text-sm font-semibold text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
                No drawer movements yet.
              </p>
            ) : (
              <div className="mt-5 divide-y divide-neutral-100 dark:divide-[#343434]">
                {currentMovements.map((movement) => (
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
              Closed drawers
            </p>
            <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
              Last closures
            </h3>

            {recentClosedDrawers.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#FAFAFC] p-4 text-sm font-semibold text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
                No closed drawer yet.
              </p>
            ) : (
              <div className="mt-5 divide-y divide-neutral-100 dark:divide-[#343434]">
                {recentClosedDrawers.map((drawer) => (
                  <div key={drawer.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                          {drawer.closedAt ? dateTime(drawer.closedAt) : 'Closed drawer'}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
                          Expected {money(drawer.expectedCashAtClose)} / Counted{' '}
                          {money(drawer.countedCash)}
                        </p>
                        {drawer.differenceReason ? (
                          <p className="mt-1 text-xs font-bold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
                            {drawer.differenceReason}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={
                          drawer.differenceType === 'NONE'
                            ? 'rounded-full border border-[#5F8A63]/30 bg-[#5F8A63]/10 px-3 py-1 text-[11px] font-black text-[#5F8A63] dark:text-[#79C27D]'
                            : drawer.differenceType === 'EXTRA'
                              ? 'rounded-full border border-[#F2C94C]/40 bg-[#F2C94C]/10 px-3 py-1 text-[11px] font-black text-[#8a6413] dark:text-[#FFD45A]'
                              : 'rounded-full border border-[#E85D5D]/40 bg-[#E85D5D]/10 px-3 py-1 text-[11px] font-black text-[#E85D5D]'
                        }
                      >
                        {drawer.differenceType === 'NONE'
                          ? 'Correct'
                          : `${drawer.differenceType.toLowerCase()} ${money(drawer.differenceAmount)}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Other money records
            </p>
            <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
              Money summary
            </h3>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                  All money
                </p>
                <p className="mt-2 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                  {money(totalMoney)}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                  Recent records
                </p>
                <p className="mt-2 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                  {transferList.length + additionList.length + expenseList.length}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                  Recent deposits
                </p>
                <div className="mt-2 space-y-2">
                  {transferList.length === 0 ? (
                    <p className="text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                      No deposit yet.
                    </p>
                  ) : (
                    transferList.slice(0, 3).map((transfer) => (
                      <p
                        key={transfer.id}
                        className="rounded-2xl bg-[#FAFAFC] px-3 py-2 text-xs font-bold text-[#6B7280] dark:bg-[#161616] dark:text-[#A3A3A3]"
                      >
                        {paymentName(transfer.fromPaymentMethod)} to{' '}
                        {paymentName(transfer.toPaymentMethod)} / {money(transfer.amount)}
                      </p>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                  Recent cash added
                </p>
                <div className="mt-2 space-y-2">
                  {additionList.length === 0 ? (
                    <p className="text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                      No cash added yet.
                    </p>
                  ) : (
                    additionList.slice(0, 3).map((addition) => (
                      <p
                        key={addition.id}
                        className="rounded-2xl bg-[#FAFAFC] px-3 py-2 text-xs font-bold text-[#6B7280] dark:bg-[#161616] dark:text-[#A3A3A3]"
                      >
                        {paymentName(addition.paymentMethod)} / {money(addition.amount)}
                      </p>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                  Recent expenses
                </p>
                <div className="mt-2 space-y-2">
                  {expenseList.length === 0 ? (
                    <p className="text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                      No expense yet.
                    </p>
                  ) : (
                    expenseList.slice(0, 3).map((expense) => (
                      <p
                        key={expense.id}
                        className="rounded-2xl bg-[#FAFAFC] px-3 py-2 text-xs font-bold text-[#6B7280] dark:bg-[#161616] dark:text-[#A3A3A3]"
                      >
                        {expense.name} / {paymentName(expense.paymentMethod)} /{' '}
                        {money(expense.amount)}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
