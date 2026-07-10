import Link from 'next/link';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { Edit, PackagePlus, Plus, Search } from 'lucide-react';
import { db } from '@dispensary/db/client';
import { products } from '@dispensary/db/schema';
import { HideItemButton } from './hide-item-button';

type ProductsPageProps = {
  searchParams?: Promise<{
    q?: string;
    take?: string;
    mobileTake?: string;
  }>;
};

const DESKTOP_PAGE_SIZE = 8;
const MOBILE_PAGE_SIZE = 4;

function money(value: string | number) {
  return `RWF ${Number(value).toLocaleString('en-US')}`;
}

function buildLoadMoreHref(q: string, nextTake: number, nextMobileTake: number) {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  params.set('take', String(nextTake));
  params.set('mobileTake', String(nextMobileTake));

  return `/products?${params.toString()}`;
}

function getStockLabel(quantity: number, minQuantity: number) {
  if (quantity <= 0) {
    return {
      text: 'Out',
      className:
        'border-[var(--danger)] bg-red-50 text-[var(--danger)] dark:bg-red-950/20',
    };
  }

  if (quantity <= minQuantity) {
    return {
      text: 'Low',
      className:
        'border-[var(--secondary)] bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-[var(--secondary)]',
    };
  }

  return {
    text: 'Good',
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

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const q = params?.q?.trim() || '';
  const take = Math.max(DESKTOP_PAGE_SIZE, Number(params?.take || DESKTOP_PAGE_SIZE));
  const mobileTake = Math.max(
    MOBILE_PAGE_SIZE,
    Number(params?.mobileTake || MOBILE_PAGE_SIZE),
  );

  const filteredItems = await db
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

  const desktopItems = filteredItems.slice(0, take);
  const mobileItems = filteredItems.slice(0, mobileTake);
  const desktopHasMore = filteredItems.length > desktopItems.length;
  const mobileHasMore = filteredItems.length > mobileItems.length;

  const productCount = filteredItems.length;
  const lowStockCount = filteredItems.filter((item) => item.quantity <= item.minQuantity).length;
  const stockValue = filteredItems.reduce((sum, item) => {
    const retail = Number(item.sellingPrice);
    const wholesale = Number(item.wholesalePrice);
    const price = retail > 0 ? retail : wholesale;

    return sum + price * item.quantity;
  }, 0);
  const wholesaleReady = filteredItems.filter(
    (item) => Number(item.wholesalePrice) > 0 && item.wholesaleMinQuantity > 0,
  ).length;

  const summary = [
    { label: 'Products', value: productCount, helper: 'Items in the shop' },
    { label: 'Low stock', value: lowStockCount, helper: 'Check these first' },
    { label: 'Wholesale', value: wholesaleReady, helper: 'Items with wholesale price' },
    { label: 'Stock value', value: money(stockValue), helper: 'Available value' },
  ];

  return (
    <section className="space-y-5 sm:space-y-6">
      <section className="business-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">
              Products
            </p>
            <h2 className="boutique-display mt-2 text-4xl font-bold leading-none text-[var(--text)] sm:text-5xl">
              Shop items.
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">
              Clothes, shoes, handbags, accessories, retail prices, wholesale prices, and stock.
            </p>
          </div>

          <Link
            href="/products/new"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--primary)] bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:border-[var(--primary-strong)] hover:bg-[var(--primary-strong)]"
          >
            <Plus className="h-4 w-4" />
            Add product
          </Link>
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Find product
            </p>
            <h3 className="boutique-display mt-1 text-3xl font-bold leading-none text-[var(--text)]">
              Product list
            </h3>
          </div>

          <form className="grid gap-2 sm:grid-cols-[1fr_auto] lg:min-w-[560px]">
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
      </section>

      {filteredItems.length === 0 ? (
        <section className="business-card rounded-3xl p-6 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <PackagePlus className="h-5 w-5" />
          </div>

          <h3 className="boutique-display mt-4 text-3xl font-bold text-[var(--text)]">
            No products found
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm font-bold leading-6 text-[var(--muted)]">
            Add a product or change your search.
          </p>

          <Link
            href="/products/new"
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--primary)] bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:border-[var(--primary-strong)] hover:bg-[var(--primary-strong)]"
          >
            <Plus className="h-4 w-4" />
            Add product
          </Link>
        </section>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm lg:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface)] text-[11px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                <tr>
                  <th className="w-[26%] px-4 py-3">Product</th>
                  <th className="w-[17%] px-4 py-3">Size / color</th>
                  <th className="w-[18%] px-4 py-3">Retail</th>
                  <th className="w-[18%] px-4 py-3">Wholesale</th>
                  <th className="w-[11%] px-4 py-3">Stock</th>
                  <th className="w-[10%] px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {desktopItems.map((item) => {
                  const stockLabel = getStockLabel(item.quantity, item.minQuantity);
                  const hasRetail = Number(item.sellingPrice) > 0;
                  const hasWholesale = Number(item.wholesalePrice) > 0;
                  const hasBuyingPrice = Number(item.buyingPrice) > 0;

                  return (
                    <tr key={item.id} className="transition hover:bg-[var(--surface)]">
                      <td className="px-4 py-5 align-top">
                        <p className="break-words font-black text-[var(--text)]">{item.name}</p>
                        <div className="mt-1 space-y-1 text-xs font-bold leading-5 text-[var(--muted)]">
                          <p className="break-words">{item.category}</p>
                          <p className="break-words">{productDetails(item) || 'Size/color not saved'}</p>
                          <p className="break-words">{item.supplierName || 'No supplier saved'}</p>
                        </div>
                      </td>

                      <td className="px-4 py-5 align-top">
                        <p className="break-words font-black leading-6 text-[var(--text)]">
                          {productDetails(item) || 'Not saved'}
                        </p>
                      </td>

                      <td className="px-4 py-5 align-top">
                        {hasRetail ? (
                          <p className="break-words font-black text-[var(--text)]">
                            {money(item.sellingPrice)}
                          </p>
                        ) : (
                          <p className="text-xs font-bold text-[var(--muted)]">Wholesale only</p>
                        )}

                        {hasBuyingPrice ? (
                          <p className="mt-1 break-words text-xs font-bold leading-5 text-[var(--muted)]">
                            Bought: {money(item.buyingPrice)}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-5 align-top">
                        {hasWholesale ? (
                          <>
                            <p className="break-words font-black text-[var(--text)]">
                              {money(item.wholesalePrice)}
                            </p>
                            <p className="mt-1 break-words text-xs font-bold leading-5 text-[var(--muted)]">
                              From {item.wholesaleMinQuantity} pieces
                            </p>
                          </>
                        ) : (
                          <p className="text-xs font-bold text-[var(--muted)]">Retail only</p>
                        )}
                      </td>

                      <td className="px-4 py-5 align-top">
                        <p className="break-words font-black text-[var(--text)]">
                          {item.quantity} {item.unit}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-2xl border px-3 py-1 text-xs font-black ${stockLabel.className}`}
                        >
                          {stockLabel.text}
                        </span>
                      </td>

                      <td className="px-4 py-5 align-top">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/products/${item.id}/edit`}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </Link>

                          <HideItemButton itemId={item.id} itemName={item.name} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {mobileItems.map((item) => {
              const stockLabel = getStockLabel(item.quantity, item.minQuantity);
              const hasRetail = Number(item.sellingPrice) > 0;
              const hasWholesale = Number(item.wholesalePrice) > 0;

              return (
                <article key={item.id} className="business-card rounded-3xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-black text-[var(--text)]">{item.name}</p>
                      <p className="mt-1 break-words text-xs font-bold leading-5 text-[var(--muted)]">
                        {item.category}
                      </p>
                      <p className="mt-1 break-words text-xs font-bold leading-5 text-[var(--muted)]">
                        {productDetails(item) || 'Size/color not saved'}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-2xl border px-3 py-1 text-xs font-black ${stockLabel.className}`}
                    >
                      {stockLabel.text}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    {hasRetail ? (
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                          Retail
                        </p>
                        <p className="mt-1 break-words font-black text-[var(--text)]">
                          {money(item.sellingPrice)}
                        </p>
                      </div>
                    ) : null}

                    {hasWholesale ? (
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                          Wholesale
                        </p>
                        <p className="mt-1 break-words font-black text-[var(--text)]">
                          {money(item.wholesalePrice)}
                        </p>
                        <p className="mt-1 break-words text-[11px] font-bold leading-4 text-[var(--muted)]">
                          From {item.wholesaleMinQuantity} pieces
                        </p>
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                        Stock
                      </p>
                      <p className="mt-1 break-words font-black text-[var(--text)]">
                        {item.quantity} {item.unit}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                        Supplier
                      </p>
                      <p className="mt-1 break-words font-black leading-5 text-[var(--text)]">
                        {item.supplierName || 'Not saved'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href={`/products/${item.id}/edit`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Link>

                    <div className="[&_button]:h-10 [&_button]:w-full">
                      <HideItemButton itemId={item.id} itemName={item.name} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="business-card rounded-3xl p-4 text-center">
            <p className="hidden text-xs font-bold text-[var(--muted)] lg:block">
              Showing {desktopItems.length} of {filteredItems.length}
            </p>
            <p className="text-xs font-bold text-[var(--muted)] lg:hidden">
              Showing {mobileItems.length} of {filteredItems.length}
            </p>

            {desktopHasMore ? (
              <Link
                href={buildLoadMoreHref(
                  q,
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
    </section>
  );
}
