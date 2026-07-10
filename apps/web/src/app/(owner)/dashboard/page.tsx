import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  CreditCard,
  PackagePlus,
  Plus,
  ShoppingBag,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { desc } from 'drizzle-orm';
import { db } from '@dispensary/db/client';
import { products, sales } from '@dispensary/db/schema';
import { requireUser } from '@/lib/auth/session';

function money(value: string | number) {
  return `RWF ${Number(value).toLocaleString('en-US')}`;
}

function isToday(value: Date) {
  const today = new Date();

  return (
    value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth() &&
    value.getDate() === today.getDate()
  );
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [saleList, productList] = await Promise.all([
    db.select().from(sales).orderBy(desc(sales.saleDate)),
    db.select().from(products).orderBy(desc(products.createdAt)),
  ]);

  const isOwner = user.role === 'OWNER';

  const todaySales = saleList.filter((sale) => isToday(sale.saleDate));
  const activeProducts = productList.filter(
    (product) => product.status === 'ACTIVE' && product.itemType === 'PRODUCT',
  );

  const lowStockProducts = activeProducts
    .filter((product) => product.quantity <= product.minQuantity)
    .sort((a, b) => a.quantity - b.quantity);

  const unpaidSales = saleList
    .filter((sale) => Number(sale.balanceAmount) > 0)
    .sort((a, b) => Number(b.balanceAmount) - Number(a.balanceAmount));

  const todaySalesTotal = todaySales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount),
    0,
  );

  const todayMoneyCollected = todaySales.reduce(
    (sum, sale) => sum + Number(sale.paidAmount),
    0,
  );

  const todayUnpaidAmount = todaySales.reduce(
    (sum, sale) => sum + Number(sale.balanceAmount),
    0,
  );

  const summaryCards = isOwner
    ? [
        {
          label: 'Today sales',
          value: money(todaySalesTotal),
          helper: plural(todaySales.length, 'sale'),
          icon: ShoppingBag,
        },
        {
          label: 'Money collected',
          value: money(todayMoneyCollected),
          helper: 'Cash, MoMo, card, or bank',
          icon: WalletCards,
        },
        {
          label: 'Unpaid sales',
          value: money(todayUnpaidAmount),
          helper: plural(unpaidSales.length, 'unpaid sale'),
          icon: CreditCard,
        },
        {
          label: 'Low stock',
          value: plural(lowStockProducts.length, 'item'),
          helper: 'Check these items',
          icon: AlertCircle,
        },
      ]
    : [
        {
          label: 'Today sales',
          value: plural(todaySales.length, 'sale'),
          helper: 'Sales made today',
          icon: ShoppingBag,
        },
        {
          label: 'Low stock',
          value: plural(lowStockProducts.length, 'item'),
          helper: 'Tell the owner',
          icon: AlertCircle,
        },
        {
          label: 'Products',
          value: plural(activeProducts.length, 'item'),
          helper: 'Clothes, shoes, bags, accessories',
          icon: Boxes,
        },
        {
          label: 'Unpaid sales',
          value: plural(unpaidSales.length, 'sale'),
          helper: 'Customers to follow',
          icon: CreditCard,
        },
      ];

  const quickActions = [
    {
      label: 'New sale',
      helper: 'Sell one item or many items',
      href: '/sales/new',
      icon: Plus,
      primary: true,
    },
    {
      label: 'Add product',
      helper: 'Clothes, shoes, bags, accessories',
      href: '/products/new',
      icon: PackagePlus,
      primary: false,
    },
    {
      label: 'Add stock',
      helper: 'Add items received in the shop',
      href: '/stock/receive',
      icon: Boxes,
      primary: false,
    },
  ];

  const stockPreview = lowStockProducts.slice(0, 5);
  const unpaidPreview = unpaidSales.slice(0, 5);
  const recentSales = todaySales.slice(0, 5);

  return (
    <section className="space-y-5 sm:space-y-6">
      <section className="business-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">
              Shop today
            </p>
            <h2 className="boutique-display mt-2 text-4xl font-bold leading-none text-[var(--text)] sm:text-5xl">
              Today at a glance.
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">
              See today’s sales, money collected, unpaid sales, and stock to check.
            </p>
          </div>

          <Link
            href="/sales/new"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--primary)] bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:border-[var(--primary-strong)] hover:bg-[var(--primary-strong)]"
          >
            New sale
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.label} className="business-card rounded-3xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                  {card.label}
                </p>
                <Icon className="h-5 w-5 shrink-0 text-[var(--primary)]" />
              </div>

              <p className="mt-5 break-words text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
                {card.value}
              </p>
              <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">
                {card.helper}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="business-card rounded-3xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">
                Do this
              </p>
              <h2 className="boutique-display mt-1 text-3xl font-bold leading-none text-[var(--text)]">
                Start here
              </h2>
            </div>
            <Sparkles className="h-5 w-5 text-[var(--secondary)]" />
          </div>

          <div className="mt-5 grid gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={
                    action.primary
                      ? 'flex items-center justify-between gap-4 rounded-2xl border border-[var(--primary)] bg-[var(--primary)] px-4 py-4 text-white transition hover:border-[var(--primary-strong)] hover:bg-[var(--primary-strong)]'
                      : 'flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]'
                  }
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={
                        action.primary
                          ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15'
                          : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]'
                      }
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{action.label}</span>
                      <span
                        className={
                          action.primary
                            ? 'mt-0.5 block text-xs font-bold text-white/80'
                            : 'mt-0.5 block text-xs font-bold text-[var(--muted)]'
                        }
                      >
                        {action.helper}
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              );
            })}
          </div>
        </article>

        <article className="business-card rounded-3xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">
                Check stock
              </p>
              <h2 className="boutique-display mt-1 text-3xl font-bold leading-none text-[var(--text)]">
                Items running low
              </h2>
            </div>
            <Link
              href="/stock"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-xs font-black text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
            >
              Open
            </Link>
          </div>

          <div className="mt-5 divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {stockPreview.length > 0 ? (
              stockPreview.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--text)]">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                      {product.category}
                    </p>
                  </div>
                  <p className="shrink-0 rounded-2xl border border-[var(--danger)] px-3 py-1.5 text-xs font-black text-[var(--danger)]">
                    {product.quantity} left
                  </p>
                </div>
              ))
            ) : (
              <div className="py-6 text-sm font-bold text-[var(--muted)]">
                Stock looks good for now.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="business-card rounded-3xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">
                Unpaid sales
              </p>
              <h2 className="boutique-display mt-1 text-3xl font-bold leading-none text-[var(--text)]">
                Customers who owe
              </h2>
            </div>
            <Link
              href="/debts"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-xs font-black text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
            >
              Open
            </Link>
          </div>

          <div className="mt-5 divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {unpaidPreview.length > 0 ? (
              unpaidPreview.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--text)]">
                      {sale.customerName || 'Walk-in customer'}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                      {sale.customerPhone || 'No phone saved'}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-[var(--danger)]">
                    {money(sale.balanceAmount)}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-6 text-sm font-bold text-[var(--muted)]">
                No customer owes money right now.
              </div>
            )}
          </div>
        </article>

        <article className="business-card rounded-3xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">
                Recent sales
              </p>
              <h2 className="boutique-display mt-1 text-3xl font-bold leading-none text-[var(--text)]">
                Sales made today
              </h2>
            </div>
            <Link
              href="/sales"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-xs font-black text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
            >
              Open
            </Link>
          </div>

          <div className="mt-5 divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--text)]">
                      {sale.customerName || 'Walk-in customer'}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                      {sale.paymentMethod.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-[var(--success)]">
                    {money(sale.totalAmount)}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-6 text-sm font-bold text-[var(--muted)]">
                No sale made today yet.
              </div>
            )}
          </div>
        </article>
      </section>
    </section>
  );
}
