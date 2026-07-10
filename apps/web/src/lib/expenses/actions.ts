'use server';

import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@dispensary/db/client';
import { cashDrawerMovements, cashDrawers, expenses } from '@dispensary/db/schema';
import { expenseFormSchema } from '@dispensary/validators/expense';
import { requireOwner } from '@/lib/auth/session';
import { getPaymentMethodBalance, paymentName } from '@/lib/money/balance';
import { getExpectedDrawerCash } from '@/lib/cash-drawer/calculations';

function cleanOptional(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

async function getOpenDrawer() {
  return db.query.cashDrawers.findFirst({
    where: eq(cashDrawers.status, 'OPEN'),
    orderBy: desc(cashDrawers.openedAt),
  });
}

export async function createExpenseAction(formData: FormData) {
  const user = await requireOwner();

  const parsed = expenseFormSchema.safeParse({
    name: formData.get('name'),
    category: formData.get('category'),
    amount: formData.get('amount') || '0',
    paymentMethod: formData.get('paymentMethod'),
    expenseDate: formData.get('expenseDate') || undefined,
    notes: formData.get('notes') || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Check the expense form.';
    redirect(`/expenses?error=${encodeURIComponent(message)}`);
  }

  const expenseAmount = Number(parsed.data.amount);

  if (expenseAmount <= 0) {
    redirect('/expenses?error=Amount must be above zero.');
  }

  const expenseDate = parsed.data.expenseDate
    ? new Date(`${parsed.data.expenseDate}T12:00:00`)
    : new Date();

  if (parsed.data.paymentMethod === 'CASH') {
    const drawer = await getOpenDrawer();

    if (!drawer) {
      redirect('/expenses?error=Open the cash drawer before saving a cash expense.');
    }

    const movements = await db
      .select()
      .from(cashDrawerMovements)
      .where(eq(cashDrawerMovements.drawerId, drawer.id));

    const expectedCash = getExpectedDrawerCash(drawer, movements);

    if (expenseAmount > expectedCash) {
      redirect(
        `/expenses?error=${encodeURIComponent(
          `Not enough drawer cash. Expected cash is RWF ${expectedCash.toLocaleString('en-US')}.`,
        )}`,
      );
    }

    await db.transaction(async (tx) => {
      const [expense] = await tx
        .insert(expenses)
        .values({
          name: parsed.data.name,
          category: parsed.data.category,
          amount: parsed.data.amount,
          paymentMethod: 'CASH',
          expenseDate,
          notes: cleanOptional(parsed.data.notes),
        })
        .returning({ id: expenses.id });

      await tx.insert(cashDrawerMovements).values({
        drawerId: drawer.id,
        createdByUserId: user.id,
        movementType: 'CASH_EXPENSE',
        direction: 'OUT',
        amount: parsed.data.amount,
        reason: cleanOptional(parsed.data.notes)
          ? `${parsed.data.name} / ${parsed.data.notes}`
          : parsed.data.name,
        expenseId: expense.id,
      });
    });
  } else {
    const availableMoney = await getPaymentMethodBalance(parsed.data.paymentMethod);

    if (expenseAmount > availableMoney) {
      redirect(
        `/expenses?error=${encodeURIComponent(
          `Not enough money in ${paymentName(parsed.data.paymentMethod)}. ${paymentName(
            parsed.data.paymentMethod,
          )} has RWF ${availableMoney.toLocaleString('en-US')}.`,
        )}`,
      );
    }

    await db.insert(expenses).values({
      name: parsed.data.name,
      category: parsed.data.category,
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      expenseDate,
      notes: cleanOptional(parsed.data.notes),
    });
  }

  revalidatePath('/expenses');
  revalidatePath('/money');
  revalidatePath('/dashboard');
  revalidatePath('/reports');

  redirect('/expenses?added=1');
}
