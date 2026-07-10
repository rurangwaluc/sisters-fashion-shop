import Link from 'next/link';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { Search, Users } from 'lucide-react';
import { db } from '@dispensary/db/client';
import { customers, sales } from '@dispensary/db/schema';
import { requireUser } from '@/lib/auth/session';

type CustomersPageProps = {
  searchParams?: Promise<{
    q?: string;
    take?: string;
  }>;
};

const PAGE_SIZE = 10;

function money(value: number) {
  return `RWF ${value.toLocaleString('en-US')}`;
}

function niceDate(value: Date | null) {
  if (!value) {
    return 'No sale yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function buildLoadMoreHref(q: string, nextTake: number) {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  params.set('take', String(nextTake));

  return `/customers?${params.toString()}`;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  await requireUser();

  const params = await searchParams;
  const q = params?.q?.trim() || '';
  const take = Math.max(PAGE_SIZE, Number(params?.take || PAGE_SIZE));

  const customerList = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.status, 'ACTIVE'),
        q
          ? or(
              ilike(customers.name, `%${q}%`),
              ilike(customers.phone, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(customers.createdAt));

  const saleList = await db.select().from(sales).orderBy(desc(sales.saleDate));

  const customerRows = customerList.map((customer) => {
    const customerSales = saleList.filter((sale) => sale.customerId === customer.id);
    const totalBought = customerSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const totalPaid = customerSales.reduce((sum, sale) => sum + Number(sale.paidAmount), 0);
    const unpaidBalance = customerSales.reduce((sum, sale) => sum + Number(sale.balanceAmount), 0);
    const lastSale = customerSales[0]?.saleDate || null;

    return {
      customer,
      salesCount: customerSales.length,
      totalBought,
      totalPaid,
      unpaidBalance,
      lastSale,
    };
  });

  const visibleRows = customerRows.slice(0, take);
  const hasMore = customerRows.length > visibleRows.length;

  const totalCustomers = customerRows.length;
  const customersWithDebt = customerRows.filter((row) => row.unpaidBalance > 0).length;
  const totalUnpaid = customerRows.reduce((sum, row) => sum + row.unpaidBalance, 0);
  const totalBought = customerRows.reduce((sum, row) => sum + row.totalBought, 0);

  const summary = [
    { label: 'Customers', value: totalCustomers, helper: 'Saved customer files' },
    { label: 'Total bought', value: money(totalBought), helper: 'All customer sales' },
    { label: 'Unpaid balance', value: money(totalUnpaid), helper: 'Money still owed' },
    { label: 'With debt', value: customersWithDebt, helper: 'Need follow up' },
  ];

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-[#343434] dark:bg-[#222222]">
        <div className="p-4 sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
            Customer book
          </p>
          <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-4xl">
            Customers
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
            See saved customers, what they bought, what they paid, and who still owes money.
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

      {visibleRows.length === 0 ? (
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-200 bg-[#FAFAFC] text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-display text-2xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
            No customers found
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
            New customers are saved when you choose “New customer” while making a sale.
          </p>
        </section>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-[#343434] dark:bg-[#222222] lg:block">
            <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr_0.9fr] border-b border-neutral-200 bg-[#FAFAFC] px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
              <div>Customer</div>
              <div>Bought</div>
              <div>Paid</div>
              <div>Unpaid</div>
              <div>Last sale</div>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-[#343434]">
              {visibleRows.map((row) => (
                <Link
                  key={row.customer.id}
                  href={`/customers/${row.customer.id}`}
                  className="grid cursor-pointer grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr_0.9fr] px-4 py-4 text-sm transition hover:bg-[var(--primary-soft)] dark:hover:bg-[#161616]"
                >
                  <div className="min-w-0 pr-3">
                    <p className="break-words font-black text-[#222222] dark:text-[#F5F5F5]">
                      {row.customer.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                      {row.customer.phone || 'No phone'}
                    </p>
                  </div>

                  <div className="pr-3">
                    <p className="font-black text-[#222222] dark:text-[#F5F5F5]">
                      {money(row.totalBought)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                      {row.salesCount} sale{row.salesCount === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="pr-3 font-black text-[#5F8A63] dark:text-[#79C27D]">
                    {money(row.totalPaid)}
                  </div>

                  <div
                    className={
                      row.unpaidBalance > 0
                        ? 'pr-3 font-black text-[#F2A71B]'
                        : 'pr-3 font-black text-[#5F8A63] dark:text-[#79C27D]'
                    }
                  >
                    {money(row.unpaidBalance)}
                  </div>

                  <div className="font-black text-[#222222] dark:text-[#F5F5F5]">
                    {niceDate(row.lastSale)}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3 lg:hidden">
            {visibleRows.map((row) => (
              <Link
                key={row.customer.id}
                href={`/customers/${row.customer.id}`}
                className="block rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-[var(--primary)] dark:border-[#343434] dark:bg-[#222222]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-black text-[#222222] dark:text-[#F5F5F5]">
                      {row.customer.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                      {row.customer.phone || 'No phone'} / {niceDate(row.lastSale)}
                    </p>
                  </div>

                  <span
                    className={
                      row.unpaidBalance > 0
                        ? 'shrink-0 rounded-full border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-3 py-1 text-xs font-black text-[#8a6413] dark:text-[#FFD45A]'
                        : 'shrink-0 rounded-full border border-[#5F8A63]/30 bg-[#5F8A63]/10 px-3 py-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]'
                    }
                  >
                    {row.unpaidBalance > 0 ? 'Has debt' : 'Clear'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                      Bought
                    </p>
                    <p className="mt-1 text-xs font-black text-[#222222] dark:text-[#F5F5F5]">
                      {money(row.totalBought)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                      Paid
                    </p>
                    <p className="mt-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]">
                      {money(row.totalPaid)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#161616]">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                      Unpaid
                    </p>
                    <p
                      className={
                        row.unpaidBalance > 0
                          ? 'mt-1 text-xs font-black text-[#F2A71B]'
                          : 'mt-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]'
                      }
                    >
                      {money(row.unpaidBalance)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2 rounded-3xl border border-neutral-200 bg-white p-4 text-center shadow-sm dark:border-[#343434] dark:bg-[#222222]">
            <p className="text-xs font-bold text-[#6B7280] dark:text-[#A3A3A3]">
              Showing {visibleRows.length} of {customerRows.length}
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
