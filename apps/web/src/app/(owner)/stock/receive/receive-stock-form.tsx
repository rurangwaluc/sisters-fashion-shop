'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Search } from 'lucide-react';
import { receiveStockAction } from '@/lib/stock/actions';

type ProductOption = {
  id: string;
  name: string;
  category: string;
  customerType: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unit: string;
  supplierName: string | null;
};

type ReceiveStockFormProps = {
  products: ProductOption[];
  error?: string;
};

const inputClass =
  'h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-bold text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]';

function productDetails(product: ProductOption) {
  return [product.customerType, product.size, product.color].filter(Boolean).join(' / ');
}

export function ReceiveStockForm({ products, error }: ReceiveStockFormProps) {
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId],
  );

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    if (!search) {
      return products.slice(0, 8);
    }

    return products
      .filter((product) => {
        const target = [
          product.name,
          product.category,
          product.customerType,
          product.size || '',
          product.color || '',
          product.supplierName || '',
        ]
          .join(' ')
          .toLowerCase();

        return target.includes(search);
      })
      .slice(0, 8);
  }, [productSearch, products]);

  return (
    <form action={receiveStockAction} className="business-card rounded-3xl p-5 sm:p-6">
      <input type="hidden" name="productId" value={selectedProductId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="productSearch" className="text-sm font-black text-[var(--text)]">
            Product
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

            <input
              id="productSearch"
              value={productSearch}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setSelectedProductId('');
                setIsProductSearchOpen(true);
              }}
              onFocus={() => setIsProductSearchOpen(true)}
              placeholder="Search name, category, size, color, or supplier"
              className={`${inputClass} pl-10`}
            />

            {isProductSearchOpen ? (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-xl">
                {filteredProducts.length === 0 ? (
                  <p className="px-3 py-4 text-sm font-bold text-[var(--muted)]">
                    No product found.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setProductSearch(product.name);
                          setIsProductSearchOpen(false);
                        }}
                        className="grid w-full gap-1 rounded-2xl px-3 py-3 text-left transition hover:bg-[var(--primary-soft)]"
                      >
                        <span className="break-words font-black text-[var(--text)]">
                          {product.name}
                        </span>
                        <span className="break-words text-xs font-bold leading-5 text-[var(--muted)]">
                          {product.category} / {productDetails(product) || 'Details not saved'} / Current:{' '}
                          {product.quantity} {product.unit}
                          {product.supplierName ? ` / ${product.supplierName}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {selectedProduct ? (
            <div className="mt-2 flex items-start gap-2 rounded-2xl border border-[var(--success)] bg-green-50 px-3 py-2 text-sm font-bold text-[var(--success)] dark:bg-green-950/20">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="break-words">
                Chosen: {selectedProduct.name} / Current stock: {selectedProduct.quantity}{' '}
                {selectedProduct.unit}
              </span>
            </div>
          ) : (
            <p className="text-xs font-bold text-[var(--muted)]">
              Search and choose the product you are adding stock to.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="quantityReceived" className="text-sm font-black text-[var(--text)]">
            Quantity added
          </label>
          <input
            id="quantityReceived"
            name="quantityReceived"
            type="number"
            min="1"
            required
            placeholder="Example: 10"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="buyingPrice" className="text-sm font-black text-[var(--text)]">
            Cost each
          </label>
          <input
            id="buyingPrice"
            name="buyingPrice"
            inputMode="decimal"
            required
            placeholder="Example: 18000"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="supplierName" className="text-sm font-black text-[var(--text)]">
            Supplier
          </label>
          <input
            id="supplierName"
            name="supplierName"
            placeholder="Optional"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="reference" className="text-sm font-black text-[var(--text)]">
            Reference
          </label>
          <input
            id="reference"
            name="reference"
            placeholder="Optional invoice or note number"
            className={inputClass}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="notes" className="text-sm font-black text-[var(--text)]">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Optional"
            className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm font-bold text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]"
          />
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-[var(--secondary)] bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-800 dark:bg-yellow-950/20 dark:text-[var(--secondary)]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Link
          href="/stock"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
        >
          Cancel
        </Link>
        <button
          disabled={!selectedProductId}
          className="h-11 rounded-2xl border border-[var(--primary)] bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:border-[var(--primary-strong)] hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save stock
        </button>
      </div>
    </form>
  );
}
