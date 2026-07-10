'use server';

import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@dispensary/db/client';
import { cashDrawerMovements, cashDrawers, debtPayments, sales } from '@dispensary/db/schema';
import { debtPaymentSchema } from '@dispensary/validators/debt';
import { requireUser } from '@/lib/auth/session';

export type DebtPaymentState = {
  error?: string;
  success?: string;
};

function cleanOptional(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function toMoney(value: number) {
  return value.toFixed(2);
}

export async function recordDebtPaymentAction(
  _previousState: DebtPaymentState,
  formData: FormData,
): Promise<DebtPaymentState> {
  const user = await requireUser();

  const parsed = debtPaymentSchema.safeParse({
    saleId: formData.get('saleId'),
    paymentMethod: formData.get('paymentMethod'),
    amount: formData.get('amount') || '0',
    notes: formData.get('notes') || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Check the payment form.',
    };
  }

  const amount = Number(parsed.data.amount);

  if (amount <= 0) {
    return {
      error: 'Payment amount must be above zero.',
    };
  }

  const [sale] = await db.select().from(sales).where(eq(sales.id, parsed.data.saleId)).limit(1);

  if (!sale) {
    return {
      error: 'Debt was not found.',
    };
  }

  const currentBalance = Number(sale.balanceAmount);

  if (currentBalance <= 0) {
    return {
      error: 'This debt is already cleared.',
    };
  }

  if (amount > currentBalance) {
    return {
      error: 'Payment cannot be higher than the unpaid amount.',
    };
  }

  let openDrawer: typeof cashDrawers.$inferSelect | undefined;

  if (parsed.data.paymentMethod === 'CASH') {
    const [drawer] = await db
      .select()
      .from(cashDrawers)
      .where(eq(cashDrawers.status, 'OPEN'))
      .orderBy(desc(cashDrawers.openedAt))
      .limit(1);

    if (!drawer) {
      return {
        error: 'Open the cash drawer before saving a cash debt payment.',
      };
    }

    openDrawer = drawer;
  }

  const nextPaid = Number(sale.paidAmount) + amount;
  const nextBalance = currentBalance - amount;
  const customerName = sale.customerName || 'Walk-in customer';

  await db.transaction(async (tx) => {
    await tx.insert(debtPayments).values({
      saleId: sale.id,
      paymentMethod: parsed.data.paymentMethod,
      amount: toMoney(amount),
      notes: cleanOptional(parsed.data.notes),
    });

    if (openDrawer) {
      await tx.insert(cashDrawerMovements).values({
        drawerId: openDrawer.id,
        createdByUserId: user.id,
        movementType: 'CASH_DEBT_PAYMENT',
        direction: 'IN',
        amount: toMoney(amount),
        reason: `Debt payment / ${customerName}`,
        saleId: sale.id,
      });
    }

    await tx
      .update(sales)
      .set({
        paidAmount: toMoney(nextPaid),
        balanceAmount: toMoney(nextBalance),
        updatedAt: new Date(),
      })
      .where(eq(sales.id, sale.id));
  });

  revalidatePath('/debts');
  revalidatePath(`/debts/${sale.id}`);
  revalidatePath(`/sales/${sale.id}`);
  revalidatePath('/sales');
  revalidatePath('/money');
  revalidatePath('/customers');
  revalidatePath('/dashboard');
  revalidatePath('/reports');

  return {
    success: 'Payment saved.',
  };
}
