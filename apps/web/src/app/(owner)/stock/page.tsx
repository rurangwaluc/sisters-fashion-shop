import Link from 'next/link';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { Edit, PackagePlus, Plus, Search } from 'lucide-react';
import { db } from '@dispensary/db/client';
import { products, stockArrivals } from '@dispensary/db/schema';

type StockPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    take?: string;
    mobileTake?: string;
  }>;
};

const DESKTOP_PAGE_SIZE = 8;
const MOBILE_PAGE_SIZE = 4;

function money(value: string | number) {
  return `RWF ${Number(value).toLocaleString('en-US')}`;
}

function buildLoadMoreHref(
  q: string,
  status: string,
  nextTake: number,
  nextMobileTake: number,
) {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  if (status) {
    params.set('status', status);
  }

  params.set('take', String(nextTake));
  params.set('mobileTake', String(nextMobileTake));

  return `/stock?${params.toString()}`;
}

function filterHref(status: string | null) {
  if (!status) {
    return '/stock';
  }

  return `/stock?status=${status}`;
}

function getStockState(quantity: number, minQuantity: number) {
  if (quantity <= 0) {
    return {
      key: 'OUT',
      text: 'Out',
      helper: 'Cannot sell',
      className:
        'border-[var(--danger)] bg-red-50 text-[var(--danger)] dark:bg-red-950/20',
    };
  }

  if (quantity <= minQuantity) {
    return {
      key: 'LOW',
      text: 'Low',
      helper: 'Check first',
      className:
        'border-[var(--secondary)] bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-[var(--secondary)]',
    };
  }

  return {
    key: 'GOOD',
    text: 'Good',
    helper: 'Enough',
    className:
      'border-[var(--success)] bg-green-50 text-[var(--success)] dark:bg-green-950/20',
  };
}

function productDetails(item: {
  customerType: string;
  size: string | null;
  color: string | null;
}) {
  return [item.customerType, item.size, item.color].filter(Boolean).join(' / ');
}

function productValue(item: {
  sellingPrice: string;
  wholesalePrice: string;
  quantity: number;
}) {
  const retail = Number(item.sellingPrice);
  const wholesale = Number(item.wholesalePrice);
  const price = retail > 0 ? retail : wholesale;

  return price * item.quantity;
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const params = await searchParams;
  const q = params?.q?.trim() || '';
  const selectedStatus = ['OUT', 'LOW'].includes(params?.status || '')
    ? params?.status || ''
    : '';
  const take = Math.max(DESKTOP_PAGE_SIZE, Number(params?.take || DESKTOP_PAGE_SIZE));
  const mobileTake = Math.max(
    MOBILE_PAGE_SIZE,
    Number(params?.mobileTake || MOBILE_PAGE_SIZE),
  );

  const arrivalList = await db
    .select()
    .from(stockArrivals)
    .orderBy(desc(stockArrivals.arrivedAt))
    .limit(5);

  const productList = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.status, 'ACTIVE'),
        eq(products.itemType, 'PRODUCT'),
        q
          ? or(
              ilike(products.name, `%${q}%`),
              ilike(products.category, `%${q}%`),
              ilike(products.customerType, `%${q}%`),
              ilike(products.size, `%${q}%`),
              ilike(products.color, `%${q}%`),
              ilike(products.supplierName, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(products.createdAt));

  const rows = productList.map((product) => ({
    product,
    stockState: getStockState(product.quantity, product.minQuantity),
  }));

  const filteredRows = rows.filter((row) => {
    if (!selectedStatus) {
      return true;
    }

    return row.stockState.key === selectedStatus;
  });

  const desktopRows = filteredRows.slice(0, take);
  const mobileRows = filteredRows.slice(0, mobileTake);
  const desktopHasMore = filteredRows.length > desktopRows.length;
  const mobileHasMore = filteredRows.length > mobileRows.length;

  const outOfStock = rows.filter((row) => row.stockState.key === 'OUT').length;
  const lowStock = rows.filter((row) => row.stockState.key === 'LOW').length;
  const stockValue = rows.reduce((sum, row) => sum + productValue(row.product), 0);

  const summary = [
    { label: 'All stock', value: rows.length, helper: 'Products in the shop' },
    { label: 'Low stock', value: lowStock, helper: 'Check these first' },
    { label: 'Out of stock', value: outOfStock, helper: 'Cannot sell now' },
    { label: 'Stock value', value: money(stockValue), helper: 'Available value' },
  ];

  const filters = [
    { label: 'All', value: '', active: !selectedStatus },
    { label: 'Low stock', value: 'LOW', active: selectedStatus === 'LOW' },
    { label: 'Out of stock', value: 'OUT', active: selectedStatus === 'OUT' },
  ];

  return (
    <section className="space-y-5 sm:space-y-6">
      <section className="business-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">
              Stock
            </p>
            <h2 className="boutique-display mt-2 text-4xl font-bold leading-none text-[var(--text)] sm:text-5xl">
              Shop stock.
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">
              Check what is available, what is low, what is out, and what was recently added.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/stock/receive"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--primary)] bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:border-[var(--primary-strong)] hover:bg-[var(--primary-strong)]"
            >
              <Plus className="h-4 w-4" />
              Add stock
            </Link>
            <Link
              href="/products/new"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
            >
              <PackagePlus className="h-4 w-4" />
              Add product
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summary.map((item) => (
          <article key={item.label} className="business-card rounded-3xl p-4 sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
              {item.label}
            </p>
            <p className="mt-4 break-words text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
              {item.value}
            </p>
            <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">
              {item.helper}
            </p>
          </article>
        ))}
      </section>

      <section className="business-card rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Find stock
            </p>
            <h3 className="boutique-display mt-1 text-3xl font-bold leading-none text-[var(--text)]">
              Products to check
            </h3>
          </div>

          <form className="grid gap-2 sm:grid-cols-[1fr_auto] lg:min-w-[560px]">
            <input type="hidden" name="status" value={selectedStatus} />
            <input type="hidden" name="take" value={take} />
            <input type="hidden" name="mobileTake" value={mobileTake} />

            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search name, category, size, color, or supplier"
                className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] pl-10 pr-3 text-sm font-bold text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]"
              />
            </div>

            <button className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]">
              Search
            </button>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Link
              key={filter.label}
              href={filterHref(filter.value || null)}
              className={
                filter.active
                  ? 'inline-flex h-9 items-center justify-center rounded-2xl border border-[var(--primary)] bg-[var(--primary)] px-4 text-xs font-black text-white shadow-sm'
                  : 'inline-flex h-9 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-xs font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]'
              }
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </section>

      {filteredRows.length === 0 ? (
        <section className="business-card rounded-3xl p-6 text-center sm:p-10">
          <h3 className="boutique-display text-3xl font-bold text-[var(--text)]">
            No stock found
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm font-bold leading-6 text-[var(--muted)]">
            Add products, add stock, or change your search.
          </p>
        </section>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm lg:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface)] text-[11px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                <tr>
                  <th className="w-[30%] px-4 py-3">Product</th>
                  <th className="w-[18%] px-4 py-3">Details</th>
                  <th className="w-[18%] px-4 py-3">Quantity</th>
                  <th className="w-[18%] px-4 py-3">Value</th>
                  <th className="w-[16%] px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {desktopRows.map((row) => (
                  <tr key={row.product.id} className="transition hover:bg-[var(--surface)]">
                    <td className="px-4 py-5 align-top">
                      <p className="break-words font-black text-[var(--text)]">
                        {row.product.name}
                      </p>
                      <div className="mt-1 space-y-1 text-xs font-bold leading-5 text-[var(--muted)]">
                        <p className="break-words">{row.product.category}</p>
                        <p className="break-words">
                          {row.product.supplierName || 'No supplier saved'}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-5 align-top">
                      <p className="break-words font-black leading-6 text-[var(--text)]">
                        {productDetails(row.product) || 'Not saved'}
                      </p>
                    </td>

                    <td className="px-4 py-5 align-top">
                      <p className="break-words font-black text-[var(--text)]">
                        {row.product.quantity} {row.product.unit}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                        Warn at {row.product.minQuantity}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-2xl border px-3 py-1 text-xs font-black ${row.stockState.className}`}
                      >
                        {row.stockState.text}
                      </span>
                    </td>

                    <td className="px-4 py-5 align-top">
                      <p className="break-words font-black text-[var(--text)]">
                        {money(productValue(row.product))}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                        Available value
                      </p>
                    </td>

                    <td className="px-4 py-5 align-top">
                      <div className="flex justify-end">
                        <Link
                          href={`/products/${row.product.id}/edit`}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {mobileRows.map((row) => (
              <article key={row.product.id} className="business-card rounded-3xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-black text-[var(--text)]">
                      {row.product.name}
                    </p>
                    <p className="mt-1 break-words text-xs font-bold leading-5 text-[var(--muted)]">
                      {row.product.category}
                    </p>
                    <p className="mt-1 break-words text-xs font-bold leading-5 text-[var(--muted)]">
                      {productDetails(row.product) || 'Details not saved'}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-2xl border px-3 py-1 text-xs font-black ${row.stockState.className}`}
                  >
                    {row.stockState.text}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                      Quantity
                    </p>
                    <p className="mt-1 break-words font-black text-[var(--text)]">
                      {row.product.quantity} {row.product.unit}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                      Warn at
                    </p>
                    <p className="mt-1 break-words font-black text-[var(--text)]">
                      {row.product.minQuantity}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                      Value
                    </p>
                    <p className="mt-1 break-words font-black text-[var(--text)]">
                      {money(productValue(row.product))}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                      Supplier
                    </p>
                    <p className="mt-1 break-words font-black leading-5 text-[var(--text)]">
                      {row.product.supplierName || 'Not saved'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href="/stock/receive"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--primary)] bg-[var(--primary)] px-3 text-xs font-black text-white shadow-sm transition hover:border-[var(--primary-strong)] hover:bg-[var(--primary-strong)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add stock
                  </Link>

                  <Link
                    href={`/products/${row.product.id}/edit`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="business-card rounded-3xl p-4 text-center">
            <p className="hidden text-xs font-bold text-[var(--muted)] lg:block">
              Showing {desktopRows.length} of {filteredRows.length}
            </p>
            <p className="text-xs font-bold text-[var(--muted)] lg:hidden">
              Showing {mobileRows.length} of {filteredRows.length}
            </p>

            {desktopHasMore ? (
              <Link
                href={buildLoadMoreHref(
                  q,
                  selectedStatus,
                  take + DESKTOP_PAGE_SIZE,
                  mobileTake,
                )}
                className="mt-3 hidden h-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] lg:inline-flex"
              >
                Load more
              </Link>
            ) : null}

            {mobileHasMore ? (
              <Link
                href={buildLoadMoreHref(
                  q,
                  selectedStatus,
                  take,
                  mobileTake + MOBILE_PAGE_SIZE,
                )}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] lg:hidden"
              >
                Load more
              </Link>
            ) : null}
          </div>
        </>
      )}

      <section className="business-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Recent stock added
            </p>
            <h3 className="boutique-display mt-1 text-3xl font-bold leading-none text-[var(--text)]">
              What came in recently
            </h3>
          </div>

          <Link
            href="/stock/receive"
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
          >
            Add stock
          </Link>
        </div>

        {arrivalList.length === 0 ? (
          <p className="mt-4 text-sm font-bold leading-6 text-[var(--muted)]">
            No stock has been added yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-5">
            {arrivalList.map((arrival) => (
              <article
                key={arrival.id}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <p className="break-words font-black leading-5 text-[var(--text)]">
                  {arrival.productName}
                </p>
                <p className="mt-2 text-xs font-bold text-[var(--muted)]">
                  Added {arrival.quantityReceived}
                </p>
                <p className="mt-1 break-words text-xs font-bold leading-5 text-[var(--muted)]">
                  {arrival.supplierName || 'Supplier not saved'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
