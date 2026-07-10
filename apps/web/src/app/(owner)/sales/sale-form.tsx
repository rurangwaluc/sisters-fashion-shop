'use client';

import { useActionState, useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { createSaleAction } from '@/lib/sales/actions';

type PriceType = 'RETAIL' | 'WHOLESALE';

type SellableItem = {
  id: string;
  name: string;
  itemType: 'PRODUCT' | 'SERVICE';
  category: string;
  customerType: string;
  size: string | null;
  color: string | null;
  buyingPrice: string;
  sellingPrice: string;
  wholesalePrice: string;
  wholesaleMinQuantity: number;
  quantity: number;
  unit: string;
};

type CustomerOption = {
  id: string;
  name: string;
  phone: string | null;
};

type SaleRow = {
  productId: string;
  quantity: number;
  priceType: PriceType;
  unitPrice: string;
  searchText: string;
};

type CustomerMode = 'WALK_IN' | 'EXISTING' | 'NEW';
type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK' | 'CARD';

type SaleFormProps = {
  items: SellableItem[];
  customers: CustomerOption[];
  hasOpenDrawer: boolean;
};

function money(value: number) {
  return `RWF ${value.toLocaleString('en-US')}`;
}

function itemDetails(item: SellableItem) {
  return [item.customerType, item.size, item.color].filter(Boolean).join(' / ');
}

function retailPrice(item: SellableItem) {
  return Number(item.sellingPrice || 0);
}

function wholesalePrice(item: SellableItem) {
  return Number(item.wholesalePrice || 0);
}

function itemDefaultPriceType(item: SellableItem): PriceType {
  if (retailPrice(item) > 0) {
    return 'RETAIL';
  }

  return 'WHOLESALE';
}

function itemStartingPrice(item: SellableItem, priceType = itemDefaultPriceType(item)) {
  if (item.itemType === 'SERVICE') {
    return retailPrice(item) > 0 ? item.sellingPrice : '';
  }

  if (priceType === 'WHOLESALE') {
    return item.wholesalePrice;
  }

  return item.sellingPrice;
}

function itemLabel(item: SellableItem) {
  const details = itemDetails(item);
  const retail = retailPrice(item);
  const wholesale = wholesalePrice(item);

  const priceParts = [
    retail > 0 ? `Retail ${money(retail)}` : '',
    wholesale > 0
      ? `Wholesale ${money(wholesale)}${item.wholesaleMinQuantity > 0 ? ` from ${item.wholesaleMinQuantity}` : ''}`
      : '',
  ].filter(Boolean);

  return [item.name, details, `${item.quantity} ${item.unit}`, ...priceParts]
    .filter(Boolean)
    .join(' / ');
}

function customerLabel(customer: CustomerOption) {
  return customer.phone ? `${customer.name} / ${customer.phone}` : customer.name;
}

function findItem(items: SellableItem[], productId: string) {
  return items.find((item) => item.id === productId);
}

function linePrice(row: SaleRow, item: SellableItem | undefined) {
  if (!item) {
    return 0;
  }

  if (item.itemType === 'SERVICE') {
    return Number(row.unitPrice || 0);
  }

  if (row.priceType === 'WHOLESALE') {
    return wholesalePrice(item);
  }

  return retailPrice(item);
}

function canUseRetail(item: SellableItem | undefined) {
  return Boolean(item && retailPrice(item) > 0);
}

function canUseWholesale(item: SellableItem | undefined, quantity: number) {
  if (!item || wholesalePrice(item) <= 0) {
    return false;
  }

  if (item.wholesaleMinQuantity <= 0) {
    return true;
  }

  return quantity >= item.wholesaleMinQuantity;
}

function overAmount(total: number, amountReceived: number) {
  return Math.max(amountReceived - total, 0);
}

export function SaleForm({ items, customers, hasOpenDrawer }: SaleFormProps) {
  const [state, action, pending] = useActionState(createSaleAction, {});
  const [customerMode, setCustomerMode] = useState<CustomerMode>('WALK_IN');
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);

  const [openRowIndex, setOpenRowIndex] = useState<number | null>(null);
  const [rows, setRows] = useState<SaleRow[]>([
    {
      productId: '',
      quantity: 1,
      priceType: 'RETAIL',
      unitPrice: '',
      searchText: '',
    },
  ]);

  const [amountReceived, setAmountReceived] = useState('0');
  const [changeReturned, setChangeReturned] = useState('0');
  const [extraKept, setExtraKept] = useState('0');
  const [extraReason, setExtraReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const selectedRows = rows.map((row) => ({
    productId: row.productId,
    quantity: row.quantity,
    priceType: row.priceType,
    unitPrice: row.unitPrice,
  }));

  const total = useMemo(() => {
    return rows.reduce((sum, row) => {
      const item = findItem(items, row.productId);
      return sum + linePrice(row, item) * row.quantity;
    }, 0);
  }, [items, rows]);

  const received = Number(amountReceived || 0);
  const change = Number(changeReturned || 0);
  const extra = Number(extraKept || 0);
  const paid = Math.max(received - change - extra, 0);
  const balance = Math.max(total - paid, 0);
  const extraAvailable = overAmount(total, received);

  const filteredCustomers = useMemo(() => {
    const cleanSearch = customerSearch.trim().toLowerCase();

    if (!cleanSearch) {
      return customers.slice(0, 8);
    }

    return customers
      .filter((customer) => `${customer.name} ${customer.phone || ''}`.toLowerCase().includes(cleanSearch))
      .slice(0, 8);
  }, [customerSearch, customers]);

  function updateRow(index: number, nextRow: SaleRow) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? nextRow : row)));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        productId: '',
        quantity: 1,
        priceType: 'RETAIL',
        unitPrice: '',
        searchText: '',
      },
    ]);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function filteredItems(searchText: string) {
    const cleanSearch = searchText.trim().toLowerCase();

    if (!cleanSearch) {
      return items.slice(0, 8);
    }

    return items
      .filter((item) => {
        const searchable = `${item.name} ${item.category} ${item.customerType} ${item.size || ''} ${item.color || ''} ${item.unit}`.toLowerCase();
        return searchable.includes(cleanSearch);
      })
      .slice(0, 8);
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="itemsJson" value={JSON.stringify(selectedRows)} />
      <input type="hidden" name="customerMode" value={customerMode} />
      <input type="hidden" name="customerId" value={customerId} />

      <section className="rounded-3xl border border-neutral-200 bg-[#FAFAFC] p-4 dark:border-[#343434] dark:bg-[#161616]">
        <div className="mb-4">
          <h3 className="font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
            Customer
          </h3>
          <p className="mt-1 text-sm font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
            Use walk-in customer, choose an existing customer, or save a new customer.
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {[
            { value: 'WALK_IN', label: 'Walk-in customer', helper: 'Quick sale' },
            { value: 'EXISTING', label: 'Existing customer', helper: 'Search saved customer' },
            { value: 'NEW', label: 'New customer', helper: 'Save with this sale' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setCustomerMode(option.value as CustomerMode);

                if (option.value !== 'EXISTING') {
                  setCustomerId('');
                  setCustomerSearch('');
                  setIsCustomerSearchOpen(false);
                }
              }}
              className={
                customerMode === option.value
                  ? 'rounded-2xl border border-[var(--primary)] bg-[var(--primary)] px-4 py-3 text-left text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-strong)]'
                  : 'rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm font-black text-[#222222] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]'
              }
            >
              <span className="block">{option.label}</span>
              <span
                className={
                  customerMode === option.value
                    ? 'mt-1 block text-xs font-bold text-white/80'
                    : 'mt-1 block text-xs font-bold text-[#6B7280] dark:text-[#A3A3A3]'
                }
              >
                {option.helper}
              </span>
            </button>
          ))}
        </div>

        {customerMode === 'EXISTING' ? (
          <div className="relative mt-4">
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#6B7280] dark:text-[#A3A3A3]">
              Search customer
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              <input
                value={customerSearch}
                onFocus={() => setIsCustomerSearchOpen(true)}
                onChange={(event) => {
                  setCustomerId('');
                  setCustomerSearch(event.target.value);
                  setIsCustomerSearchOpen(true);
                }}
                placeholder="Type customer name or phone"
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-10 pr-3 text-sm font-black text-[#222222] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
              />
            </div>

            {isCustomerSearchOpen ? (
              <div className="absolute left-0 right-0 top-[74px] z-30 max-h-64 overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-[#343434] dark:bg-[#222222]">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setCustomerId(customer.id);
                        setCustomerSearch(customerLabel(customer));
                        setIsCustomerSearchOpen(false);
                      }}
                      className="flex w-full items-start justify-between gap-3 border-b border-neutral-100 px-3 py-3 text-left transition last:border-b-0 hover:bg-[#FAFAFC] dark:border-[#343434] dark:hover:bg-[#161616]"
                    >
                      <span>
                        <span className="block text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                          {customer.name}
                        </span>
                        <span className="mt-1 block text-xs font-bold text-[#6B7280] dark:text-[#A3A3A3]">
                          {customer.phone || 'No phone'}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm font-bold text-[#6B7280] dark:text-[#A3A3A3]">
                    No customer found. Use New customer.
                  </div>
                )}
              </div>
            ) : null}

            {customerId ? (
              <p className="mt-2 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]">
                Customer selected.
              </p>
            ) : null}
          </div>
        ) : null}

        {customerMode === 'NEW' ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="newCustomerName" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                Customer name
              </label>
              <input
                id="newCustomerName"
                name="newCustomerName"
                placeholder="Example: Alice"
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-[#222222] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="newCustomerPhone" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                Customer phone
              </label>
              <input
                id="newCustomerPhone"
                name="newCustomerPhone"
                placeholder="Optional"
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-[#222222] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-[#FAFAFC] p-4 dark:border-[#343434] dark:bg-[#161616]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
              Items sold
            </h3>
            <p className="mt-1 text-sm font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
              Choose retail or wholesale for each item.
            </p>
          </div>

          <button
            type="button"
            onClick={addRow}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => {
            const selected = findItem(items, row.productId);
            const isProduct = selected?.itemType === 'PRODUCT';
            const isService = selected?.itemType === 'SERVICE';
            const matches = filteredItems(row.searchText);
            const price = linePrice(row, selected);
            const retailAllowed = canUseRetail(selected);
            const wholesaleAllowed = canUseWholesale(selected, row.quantity);

            return (
              <div
                key={`${row.productId}-${index}`}
                className="grid gap-3 rounded-3xl border border-neutral-200 bg-white p-3 dark:border-[#343434] dark:bg-[#222222] lg:grid-cols-[1fr_110px_150px_140px_120px_44px]"
              >
                <div className="relative">
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#6B7280] dark:text-[#A3A3A3]">
                    Search item
                  </label>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                    <input
                      value={row.searchText}
                      onFocus={() => setOpenRowIndex(index)}
                      onChange={(event) => {
                        updateRow(index, {
                          ...row,
                          productId: '',
                          unitPrice: '',
                          searchText: event.target.value,
                        });
                        setOpenRowIndex(index);
                      }}
                      placeholder="Type product name"
                      className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-10 pr-3 text-sm font-black text-[#222222] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                    />
                  </div>

                  {openRowIndex === index ? (
                    <div className="absolute left-0 right-0 top-[74px] z-30 max-h-72 overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-[#343434] dark:bg-[#222222]">
                      {matches.length > 0 ? (
                        matches.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              const priceType = itemDefaultPriceType(item);

                              updateRow(index, {
                                ...row,
                                productId: item.id,
                                priceType,
                                unitPrice: itemStartingPrice(item, priceType),
                                searchText: itemLabel(item),
                              });
                              setOpenRowIndex(null);
                            }}
                            className="flex w-full items-start justify-between gap-3 border-b border-neutral-100 px-3 py-3 text-left transition last:border-b-0 hover:bg-[#FAFAFC] dark:border-[#343434] dark:hover:bg-[#161616]"
                          >
                            <span>
                              <span className="block text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                                {item.name}
                              </span>
                              <span className="mt-1 block text-xs font-bold text-[#6B7280] dark:text-[#A3A3A3]">
                                {[itemDetails(item), `${item.quantity} ${item.unit} available`]
                                  .filter(Boolean)
                                  .join(' / ')}
                              </span>
                            </span>
                            <span className="shrink-0 text-right text-xs font-black text-[#222222] dark:text-[#F5F5F5]">
                              {retailPrice(item) > 0 ? money(retailPrice(item)) : ''}
                              {wholesalePrice(item) > 0 ? (
                                <span className="block text-[var(--primary)]">
                                  W {money(wholesalePrice(item))}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-sm font-bold text-[#6B7280] dark:text-[#A3A3A3]">
                          No item found.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#6B7280] dark:text-[#A3A3A3]">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(event) => {
                      const quantity = Math.max(1, Number(event.target.value || 1));
                      const nextPriceType =
                        selected && row.priceType === 'WHOLESALE' && !canUseWholesale(selected, quantity)
                          ? itemDefaultPriceType(selected)
                          : row.priceType;

                      updateRow(index, {
                        ...row,
                        quantity,
                        priceType: nextPriceType,
                        unitPrice: selected ? itemStartingPrice(selected, nextPriceType) : row.unitPrice,
                      });
                    }}
                    className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-black text-[#222222] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  />
                  {isProduct && selected ? (
                    <p className="mt-1 text-xs font-bold text-[#6B7280] dark:text-[#A3A3A3]">
                      {selected.quantity} {selected.unit} left
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#6B7280] dark:text-[#A3A3A3]">
                    Price type
                  </label>
                  <select
                    value={row.priceType}
                    disabled={isService}
                    onChange={(event) => {
                      const priceType = event.target.value as PriceType;

                      updateRow(index, {
                        ...row,
                        priceType,
                        unitPrice: selected ? itemStartingPrice(selected, priceType) : row.unitPrice,
                      });
                    }}
                    className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-black text-[#222222] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] disabled:opacity-60 dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                  >
                    <option value="RETAIL" disabled={Boolean(selected) && !retailAllowed}>
                      Retail
                    </option>
                    <option value="WHOLESALE" disabled={Boolean(selected) && !wholesaleAllowed}>
                      Wholesale
                    </option>
                  </select>
                  {selected && wholesalePrice(selected) > 0 && selected.wholesaleMinQuantity > 0 ? (
                    <p className="mt-1 text-xs font-bold text-[#6B7280] dark:text-[#A3A3A3]">
                      Wholesale from {selected.wholesaleMinQuantity}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#6B7280] dark:text-[#A3A3A3]">
                    Price each
                  </label>
                  {isService ? (
                    <input
                      inputMode="decimal"
                      value={row.unitPrice}
                      onChange={(event) =>
                        updateRow(index, {
                          ...row,
                          unitPrice: event.target.value,
                        })
                      }
                      placeholder="Enter price"
                      className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-black text-[#222222] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]"
                    />
                  ) : (
                    <div className="flex h-12 items-center rounded-2xl border border-neutral-200 bg-[#FAFAFC] px-3 text-sm font-black text-[#222222] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]">
                      {money(price)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#6B7280] dark:text-[#A3A3A3]">
                    Total
                  </label>
                  <div className="flex h-12 items-center rounded-2xl border border-neutral-200 bg-[#FAFAFC] px-3 text-sm font-black text-[#222222] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]">
                    {money(price * row.quantity)}
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={rows.length === 1}
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-neutral-200 bg-white text-[#6B7280] shadow-sm transition hover:border-[#E85D5D] hover:text-[#E85D5D] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-4 rounded-3xl border border-neutral-200 bg-[#FAFAFC] p-4 dark:border-[#343434] dark:bg-[#161616]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="paymentMethod" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                Payment method
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-black text-[#222222] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
              >
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile money</option>
                <option value="BANK">Bank</option>
                <option value="CARD">Card</option>
              </select>
              {paymentMethod === 'CASH' && !hasOpenDrawer ? (
                <p className="text-xs font-black text-[#E85D5D]">
                  Open the cash drawer before saving a cash payment.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="amountReceived" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                Amount received
              </label>
              <input
                id="amountReceived"
                name="amountReceived"
                inputMode="decimal"
                value={amountReceived}
                onChange={(event) => setAmountReceived(event.target.value)}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-[#222222] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="changeReturned" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                Change returned
              </label>
              <input
                id="changeReturned"
                name="changeReturned"
                inputMode="decimal"
                value={changeReturned}
                onChange={(event) => setChangeReturned(event.target.value)}
                placeholder={extraAvailable > 0 ? `Available: ${extraAvailable}` : '0'}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-[#222222] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="extraKept" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                Extra kept
              </label>
              <input
                id="extraKept"
                name="extraKept"
                inputMode="decimal"
                value={extraKept}
                onChange={(event) => setExtraKept(event.target.value)}
                placeholder={extraAvailable > 0 ? `Available: ${extraAvailable}` : '0'}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-[#222222] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
              />
            </div>
          </div>

          {extra > 0 ? (
            <div className="space-y-2">
              <label htmlFor="extraReason" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                Why was extra kept?
              </label>
              <textarea
                id="extraReason"
                name="extraReason"
                rows={3}
                value={extraReason}
                onChange={(event) => setExtraReason(event.target.value)}
                required
                placeholder="Example: Customer said keep it"
                className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm font-semibold text-[#222222] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
              />
            </div>
          ) : (
            <input type="hidden" name="extraReason" value="" />
          )}

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Optional"
              className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm font-semibold text-[#222222] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
            />
          </div>
        </div>

        <aside className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222]">
          <h3 className="font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
            Sale summary
          </h3>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-[#6B7280] dark:text-[#A3A3A3]">Total</span>
              <span className="text-lg font-black text-[#222222] dark:text-[#F5F5F5]">
                {money(total)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-[#6B7280] dark:text-[#A3A3A3]">Received</span>
              <span className="text-lg font-black text-[#5F8A63] dark:text-[#79C27D]">
                {money(received)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-[#6B7280] dark:text-[#A3A3A3]">Change</span>
              <span className="text-lg font-black text-[#222222] dark:text-[#F5F5F5]">
                {money(change)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-[#6B7280] dark:text-[#A3A3A3]">Extra kept</span>
              <span className="text-lg font-black text-[var(--primary)]">
                {money(extra)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-3 dark:border-[#343434]">
              <span className="text-sm font-bold text-[#6B7280] dark:text-[#A3A3A3]">Paid to sale</span>
              <span className="text-lg font-black text-[#5F8A63] dark:text-[#79C27D]">
                {money(paid)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-[#6B7280] dark:text-[#A3A3A3]">Unpaid</span>
              <span className="text-lg font-black text-[#E85D5D]">
                {money(balance)}
              </span>
            </div>
          </div>

          {extraAvailable > 0 ? (
            <div className="mt-4 rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3 text-xs font-black text-[#8a6413] dark:text-[#FFD45A]">
              Customer paid {money(extraAvailable)} more. Put it in change returned, extra kept, or both.
            </div>
          ) : null}

          {state.error ? (
            <div className="mt-4 rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3 text-sm font-black text-[#8a6413] dark:text-[#FFD45A]">
              {state.error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending || (paymentMethod === 'CASH' && !hasOpenDrawer)}
            className="mt-5 h-12 w-full rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:border disabled:border-[#E85D5D]/40 disabled:bg-[#343434] disabled:text-[#A3A3A3] disabled:shadow-none dark:disabled:bg-[#161616]"
          >
            {pending ? 'Saving sale...' : paymentMethod === 'CASH' && !hasOpenDrawer ? 'Open cash drawer first' : 'Save sale'}
          </button>
        </aside>
      </section>
    </form>
  );
}
