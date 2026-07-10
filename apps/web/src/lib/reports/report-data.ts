import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@dispensary/db/client';
import {
  cashDrawerMovements,
  cashDrawers,
  debtPayments,
  expenses,
  products,
  saleItems,
  sales,
} from '@dispensary/db/schema';

export type ReportRange = 'day' | 'week' | 'month';

export function money(value: string | number) {
  return `RWF ${Number(value).toLocaleString('en-US')}`;
}

export function paymentName(value: string) {
  const names: Record<string, string> = {
    CASH: 'Cash',
    MOBILE_MONEY: 'Mobile money',
    BANK: 'Bank',
    CARD: 'Card',
  };

  return names[value] || value;
}

export function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

export function cleanReportDate(value: string | undefined | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return getTodayInputDate();
  }

  return value;
}

export function cleanReportRange(value: string | undefined | null): ReportRange {
  if (value === 'week' || value === 'month' || value === 'day') {
    return value;
  }

  return 'day';
}

export function readableDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getWeekStart(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getReportPeriod(reportDate: string, range: ReportRange) {
  const selected = new Date(`${reportDate}T12:00:00`);

  if (range === 'week') {
    const start = getWeekStart(selected);
    const end = endOfDay(new Date(start));
    end.setDate(start.getDate() + 6);

    return {
      start,
      end,
      title: 'Weekly report',
      label: `${readableDate(start.toISOString().slice(0, 10))} - ${readableDate(
        end.toISOString().slice(0, 10),
      )}`,
    };
  }

  if (range === 'month') {
    const start = getMonthStart(selected);
    const end = getMonthEnd(selected);

    return {
      start,
      end,
      title: 'Monthly report',
      label: selected.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    };
  }

  return {
    start: startOfDay(selected),
    end: endOfDay(selected),
    title: 'Daily report',
    label: readableDate(reportDate),
  };
}

function isInsidePeriod(value: Date, start: Date, end: Date) {
  return value.getTime() >= start.getTime() && value.getTime() <= end.getTime();
}

function productStockValue(product: typeof products.$inferSelect) {
  const sellingPrice = Number(product.sellingPrice || 0);
  const wholesalePrice = Number(product.wholesalePrice || 0);
  const fallbackPrice = sellingPrice > 0 ? sellingPrice : wholesalePrice;

  return Number(product.quantity || 0) * fallbackPrice;
}

export async function getReport(reportDate: string, rangeValue: string | undefined | null) {
  const selectedDate = cleanReportDate(reportDate);
  const range = cleanReportRange(rangeValue);
  const period = getReportPeriod(selectedDate, range);

  const [saleList, expenseList, debtPaymentList, productList, openDrawerList] = await Promise.all([
    db.select().from(sales),
    db.select().from(expenses),
    db.select().from(debtPayments),
    db.select().from(products).where(eq(products.status, 'ACTIVE')),
    db
      .select()
      .from(cashDrawers)
      .where(eq(cashDrawers.status, 'OPEN'))
      .orderBy(desc(cashDrawers.openedAt))
      .limit(1),
  ]);

  const openDrawer = openDrawerList[0];

  const allSaleIds = saleList.map((sale) => sale.id);
  const allItemList =
    allSaleIds.length > 0
      ? await db.select().from(saleItems).where(inArray(saleItems.saleId, allSaleIds))
      : [];

  const drawerMovementList = openDrawer
    ? await db
        .select()
        .from(cashDrawerMovements)
        .where(eq(cashDrawerMovements.drawerId, openDrawer.id))
    : [];

  const filteredSales = saleList.filter((sale) =>
    isInsidePeriod(sale.saleDate, period.start, period.end),
  );

  const filteredExpenses = expenseList.filter((expense) =>
    isInsidePeriod(expense.expenseDate, period.start, period.end),
  );

  const filteredDebtPayments = debtPaymentList.filter((payment) =>
    isInsidePeriod(payment.paidAt, period.start, period.end),
  );

  const filteredSaleIds = filteredSales.map((sale) => sale.id);
  const itemList = allItemList.filter((item) => filteredSaleIds.includes(item.saleId));

  const debtPaidBySaleId = debtPaymentList.reduce<Map<string, number>>((map, payment) => {
    map.set(payment.saleId, (map.get(payment.saleId) || 0) + Number(payment.amount));
    return map;
  }, new Map());

  const salesTotal = filteredSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

  const salePayments = filteredSales.reduce((sum, sale) => {
    const laterDebtPayments = debtPaidBySaleId.get(sale.id) || 0;
    const firstPayment = Math.max(0, Number(sale.paidAmount) - laterDebtPayments);
    return sum + firstPayment;
  }, 0);

  const debtPaid = filteredDebtPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const moneyReceived = salePayments + debtPaid;
  const creditGiven = filteredSales.reduce((sum, sale) => sum + Number(sale.balanceAmount), 0);
  const expensesTotal = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  const grossProfit = itemList.reduce((sum, item) => sum + Number(item.profitAmount || 0), 0);
  const netProfit = grossProfit - expensesTotal;

  const activeProducts = productList.filter((product) => product.itemType === 'PRODUCT');
  const stockValue = activeProducts.reduce((sum, product) => sum + productStockValue(product), 0);

  const lowStock = activeProducts
    .filter((product) => product.quantity <= product.minQuantity)
    .slice(0, 10);

  const soldProducts = itemList.reduce<Map<string, { name: string; quantity: number; total: number; profit: number }>>(
    (map, item) => {
      const current = map.get(item.productId) || {
        name: item.itemName,
        quantity: 0,
        total: 0,
        profit: 0,
      };

      current.quantity += item.quantity;
      current.total += Number(item.lineTotal);
      current.profit += Number(item.profitAmount || 0);
      map.set(item.productId, current);

      return map;
    },
    new Map(),
  );

  const productRows = Array.from(soldProducts.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const paymentRows = ['CASH', 'MOBILE_MONEY', 'BANK', 'CARD'].map((method) => {
    const saleMoney = filteredSales
      .filter((sale) => sale.paymentMethod === method)
      .reduce((sum, sale) => {
        const laterDebtPayments = debtPaidBySaleId.get(sale.id) || 0;
        const firstPayment = Math.max(0, Number(sale.paidAmount) - laterDebtPayments);
        return sum + firstPayment;
      }, 0);

    const debtMoney = filteredDebtPayments
      .filter((payment) => payment.paymentMethod === method)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      method,
      name: paymentName(method),
      saleMoney,
      debtMoney,
      total: saleMoney + debtMoney,
    };
  });

  const expenseRows = filteredExpenses.reduce<Map<string, number>>((map, expense) => {
    const current = map.get(expense.category) || 0;
    map.set(expense.category, current + Number(expense.amount));
    return map;
  }, new Map());

  const expenseCategoryRows = Array.from(expenseRows.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const drawerMovementsForExpected = drawerMovementList.filter(
    (movement) =>
      movement.movementType !== 'OPENING_CASH' &&
      movement.movementType !== 'CLOSING_COUNT' &&
      movement.movementType !== 'CASH_DIFFERENCE',
  );

  const drawerIn = drawerMovementsForExpected
    .filter((movement) => movement.direction === 'IN')
    .reduce((sum, movement) => sum + Number(movement.amount), 0);

  const drawerOut = drawerMovementsForExpected
    .filter((movement) => movement.direction === 'OUT')
    .reduce((sum, movement) => sum + Number(movement.amount), 0);

  const cashDrawerExpected = openDrawer
    ? Number(openDrawer.openingCash) + drawerIn - drawerOut
    : 0;

  return {
    selectedDate,
    range,
    period,
    openDrawer,
    summary: {
      salesTotal,
      moneyReceived,
      salePayments,
      debtPaid,
      creditGiven,
      expensesTotal,
      grossProfit,
      netProfit,
      salesCount: filteredSales.length,
      lowStockCount: lowStock.length,
      stockValue,
      cashDrawerExpected,
    },
    paymentRows,
    expenseCategoryRows,
    productRows,
    lowStock,
  };
}
