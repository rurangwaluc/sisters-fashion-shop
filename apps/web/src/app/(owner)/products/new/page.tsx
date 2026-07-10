import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductForm } from '../product-form';

export default function NewProductPage() {
  return (
    <section className="space-y-5 sm:space-y-6">
      <section className="business-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">
              Products
            </p>
            <h2 className="boutique-display mt-2 text-4xl font-bold leading-none text-[var(--text)] sm:text-5xl">
              Add product.
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">
              Add one item the shop sells in retail or wholesale.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Products
          </Link>
        </div>
      </section>

      <ProductForm backHref="/products" />
    </section>
  );
}
