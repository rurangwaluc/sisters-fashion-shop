import { db } from '@dispensary/db/client';
import {
  debtPayments,
  expenses,
  moneyAdditions,
  moneyTransfers,
  sales,
} from '@dispensary/db/schema';

export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK' | 'CARD';

export const paymentMethods: PaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'BANK', 'CARD'];

export function paymentName(value: string) {
  const names: Record<string, string> = {
    CASH: 'Cash',
    MOBILE_MONEY: 'Mobile money',
    BANK: 'Bank',
    CARD: 'Card',
  };

  return names[value] || value;
}

export async function getMoneyBalances() {
  const [saleList, debtPaymentList, expenseList, transferList, additionList] =
    await Promise.all([
      db.select().from(sales),
      db.select().from(debtPayments),
      db.select().from(expenses),
      db.select().from(moneyTransfers),
      db.select().from(moneyAdditions),
    ]);

  return paymentMethods.map((method) => {
    const addedMoney = additionList
      .filter((addition) => addition.paymentMethod === method)
      .reduce((sum, addition) => sum + Number(addition.amount), 0);

    const salesIn = saleList
      .filter((sale) => sale.paymentMethod === method)
      .reduce((sum, sale) => sum + Number(sale.paidAmount), 0);

    const debtIn = debtPaymentList
      .filter((payment) => payment.paymentMethod === method)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const expensesOut = expenseList
      .filter((expense) => expense.paymentMethod === method)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    const transferIn = transferList
      .filter((transfer) => transfer.toPaymentMethod === method)
      .reduce((sum, transfer) => sum + Number(transfer.amount), 0);

    const transferOut = transferList
      .filter((transfer) => transfer.fromPaymentMethod === method)
      .reduce((sum, transfer) => sum + Number(transfer.amount), 0);

    const moneyIn = addedMoney + salesIn + debtIn + transferIn;
    const moneyOut = expensesOut + transferOut;

    return {
      method,
      name: paymentName(method),
      balance: moneyIn - moneyOut,
      moneyIn,
      moneyOut,
    };
  });
}

export async function getPaymentMethodBalance(method: PaymentMethod) {
  const balances = await getMoneyBalances();
  return balances.find((balance) => balance.method === method)?.balance || 0;
}
