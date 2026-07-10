'use server';

import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@dispensary/db/client';
import {
  cashDrawerMovements,
  cashDrawers,
  expenses,
  moneyAdditions,
  moneyTransfers,
} from '@dispensary/db/schema';
import {
  cashDrawerCashInSchema,
  cashDrawerCashOutSchema,
  cashDrawerDepositSchema,
  cashDrawerExpenseSchema,
  closeCashDrawerSchema,
  openCashDrawerSchema,
} from '@dispensary/validators/cash-drawer';
import { requireOwner } from '@/lib/auth/session';
import { getDifferenceType, getExpectedDrawerCash, toMoney } from './calculations';

function cleanOptional(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

const KIGALI_TIME_OFFSET_MS = 2 * 60 * 60 * 1000;

function getKigaliDayRange(date = new Date()) {
  const kigaliTime = new Date(date.getTime() + KIGALI_TIME_OFFSET_MS);
  const startOfKigaliDayUtc =
    Date.UTC(kigaliTime.getUTCFullYear(), kigaliTime.getUTCMonth(), kigaliTime.getUTCDate()) -
    KIGALI_TIME_OFFSET_MS;

  return {
    start: new Date(startOfKigaliDayUtc),
    end: new Date(startOfKigaliDayUtc + 24 * 60 * 60 * 1000),
  };
}

async function getOpenDrawer() {
  return db.query.cashDrawers.findFirst({
    where: eq(cashDrawers.status, 'OPEN'),
    orderBy: desc(cashDrawers.openedAt),
  });
}

async function getOpenDrawerOrRedirect() {
  const drawer = await getOpenDrawer();

  if (!drawer) {
    redirect('/money?error=Open the cash drawer first.');
  }

  return drawer;
}

export async function openCashDrawerAction(formData: FormData) {
  const user = await requireOwner();

  const parsed = openCashDrawerSchema.safeParse({
    openingCash: formData.get('openingCash') || '0',
    openingNote: formData.get('openingNote') || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Check the opening cash.';
    redirect(`/money?error=${encodeURIComponent(message)}`);
  }

  const openingCash = Number(parsed.data.openingCash);

  if (openingCash < 0) {
    redirect('/money?error=Opening cash cannot be below zero.');
  }

  const existingDrawer = await getOpenDrawer();

  if (existingDrawer) {
    redirect('/money?error=A cash drawer is already open.');
  }

  const openingNote = cleanOptional(parsed.data.openingNote);
  const today = getKigaliDayRange();

  const closedToday = await db.query.cashDrawers.findFirst({
    where: and(
      eq(cashDrawers.status, 'CLOSED'),
      gte(cashDrawers.closedAt, today.start),
      lt(cashDrawers.closedAt, today.end),
    ),
    orderBy: desc(cashDrawers.closedAt),
  });

  if (closedToday && !openingNote) {
    redirect(
      `/money?error=${encodeURIComponent(
        'Add an opening note when reopening the drawer after it was already closed today.',
      )}`,
    );
  }

  await db.transaction(async (tx) => {
    const [drawer] = await tx
      .insert(cashDrawers)
      .values({
        openedByUserId: user.id,
        openingCash: parsed.data.openingCash,
        openingNote,
      })
      .returning({ id: cashDrawers.id });

    await tx.insert(cashDrawerMovements).values({
      drawerId: drawer.id,
      createdByUserId: user.id,
      movementType: 'OPENING_CASH',
      direction: 'IN',
      amount: parsed.data.openingCash,
      reason: openingNote || 'Opening cash',
    });
  });

  revalidatePath('/money');
  revalidatePath('/dashboard');

  redirect('/money?drawerOpened=1');
}

export async function addDrawerCashAction(formData: FormData) {
  const user = await requireOwner();

  const parsed = cashDrawerCashInSchema.safeParse({
    amount: formData.get('amount') || '0',
    reason: formData.get('reason') || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Check the cash added form.';
    redirect(`/money?error=${encodeURIComponent(message)}`);
  }

  const amount = Number(parsed.data.amount);

  if (amount <= 0) {
    redirect('/money?error=Amount must be above zero.');
  }

  const drawer = await getOpenDrawerOrRedirect();

  await db.transaction(async (tx) => {
    await tx.insert(moneyAdditions).values({
      paymentMethod: 'CASH',
      amount: parsed.data.amount,
      notes: parsed.data.reason,
    });

    await tx.insert(cashDrawerMovements).values({
      drawerId: drawer.id,
      createdByUserId: user.id,
      movementType: 'CASH_ADDED',
      direction: 'IN',
      amount: parsed.data.amount,
      reason: parsed.data.reason,
    });
  });

  revalidatePath('/money');
  revalidatePath('/dashboard');

  redirect('/money?cashAdded=1');
}

export async function removeDrawerCashAction(formData: FormData) {
  const user = await requireOwner();

  const parsed = cashDrawerCashOutSchema.safeParse({
    amount: formData.get('amount') || '0',
    reason: formData.get('reason') || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Check the cash removed form.';
    redirect(`/money?error=${encodeURIComponent(message)}`);
  }

  const amount = Number(parsed.data.amount);

  if (amount <= 0) {
    redirect('/money?error=Amount must be above zero.');
  }

  const drawer = await getOpenDrawerOrRedirect();
  const movements = await db
    .select()
    .from(cashDrawerMovements)
    .where(eq(cashDrawerMovements.drawerId, drawer.id));

  const expectedCash = getExpectedDrawerCash(drawer, movements);

  if (amount > expectedCash) {
    redirect(
      `/money?error=${encodeURIComponent(
        `Not enough drawer cash. Expected cash is RWF ${expectedCash.toLocaleString('en-US')}.`,
      )}`,
    );
  }

  await db.insert(cashDrawerMovements).values({
    drawerId: drawer.id,
    createdByUserId: user.id,
    movementType: 'CASH_REMOVED',
    direction: 'OUT',
    amount: parsed.data.amount,
    reason: parsed.data.reason,
  });

  revalidatePath('/money');
  revalidatePath('/dashboard');

  redirect('/money?cashRemoved=1');
}

export async function depositDrawerCashAction(formData: FormData) {
  const user = await requireOwner();

  const parsed = cashDrawerDepositSchema.safeParse({
    toPaymentMethod: formData.get('toPaymentMethod'),
    amount: formData.get('amount') || '0',
    reason: formData.get('reason') || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Check the deposit form.';
    redirect(`/money?error=${encodeURIComponent(message)}`);
  }

  const amount = Number(parsed.data.amount);

  if (amount <= 0) {
    redirect('/money?error=Amount must be above zero.');
  }

  const drawer = await getOpenDrawerOrRedirect();
  const movements = await db
    .select()
    .from(cashDrawerMovements)
    .where(eq(cashDrawerMovements.drawerId, drawer.id));

  const expectedCash = getExpectedDrawerCash(drawer, movements);

  if (amount > expectedCash) {
    redirect(
      `/money?error=${encodeURIComponent(
        `Not enough drawer cash. Expected cash is RWF ${expectedCash.toLocaleString('en-US')}.`,
      )}`,
    );
  }

  await db.transaction(async (tx) => {
    const [transfer] = await tx
      .insert(moneyTransfers)
      .values({
        fromPaymentMethod: 'CASH',
        toPaymentMethod: parsed.data.toPaymentMethod,
        amount: parsed.data.amount,
        notes: parsed.data.reason,
      })
      .returning({ id: moneyTransfers.id });

    await tx.insert(cashDrawerMovements).values({
      drawerId: drawer.id,
      createdByUserId: user.id,
      movementType: 'CASH_DEPOSIT',
      direction: 'OUT',
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      moneyTransferId: transfer.id,
    });
  });

  revalidatePath('/money');
  revalidatePath('/dashboard');

  redirect('/money?cashDeposited=1');
}

export async function recordDrawerCashExpenseAction(formData: FormData) {
  const user = await requireOwner();

  const parsed = cashDrawerExpenseSchema.safeParse({
    name: formData.get('name') || undefined,
    category: formData.get('category') || undefined,
    amount: formData.get('amount') || '0',
    notes: formData.get('notes') || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Check the cash expense form.';
    redirect(`/money?error=${encodeURIComponent(message)}`);
  }

  const amount = Number(parsed.data.amount);

  if (amount <= 0) {
    redirect('/money?error=Amount must be above zero.');
  }

  const drawer = await getOpenDrawerOrRedirect();
  const movements = await db
    .select()
    .from(cashDrawerMovements)
    .where(eq(cashDrawerMovements.drawerId, drawer.id));

  const expectedCash = getExpectedDrawerCash(drawer, movements);

  if (amount > expectedCash) {
    redirect(
      `/money?error=${encodeURIComponent(
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
        notes: parsed.data.notes,
      })
      .returning({ id: expenses.id });

    await tx.insert(cashDrawerMovements).values({
      drawerId: drawer.id,
      createdByUserId: user.id,
      movementType: 'CASH_EXPENSE',
      direction: 'OUT',
      amount: parsed.data.amount,
      reason: `${parsed.data.name} / ${parsed.data.notes}`,
      expenseId: expense.id,
    });
  });

  revalidatePath('/money');
  revalidatePath('/expenses');
  revalidatePath('/dashboard');

  redirect('/money?cashExpense=1');
}

export async function closeCashDrawerAction(formData: FormData) {
  const user = await requireOwner();

  const parsed = closeCashDrawerSchema.safeParse({
    countedCash: formData.get('countedCash') || '0',
    differenceReason: formData.get('differenceReason') || undefined,
    closingNote: formData.get('closingNote') || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Check the closing form.';
    redirect(`/money?error=${encodeURIComponent(message)}`);
  }

  const countedCash = Number(parsed.data.countedCash);

  if (countedCash < 0) {
    redirect('/money?error=Counted cash cannot be below zero.');
  }

  const drawer = await getOpenDrawerOrRedirect();
  const movements = await db
    .select()
    .from(cashDrawerMovements)
    .where(eq(cashDrawerMovements.drawerId, drawer.id));

  const expectedCash = getExpectedDrawerCash(drawer, movements);
  const difference = countedCash - expectedCash;
  const differenceType = getDifferenceType(difference);
  const differenceReason = cleanOptional(parsed.data.differenceReason);

  if (differenceType !== 'NONE' && !differenceReason) {
    const message =
      differenceType === 'EXTRA'
        ? 'Explain why counted cash is more than expected.'
        : 'Explain why counted cash is less than expected.';

    redirect(`/money?error=${encodeURIComponent(message)}`);
  }

  await db.transaction(async (tx) => {
    await tx.insert(cashDrawerMovements).values({
      drawerId: drawer.id,
      createdByUserId: user.id,
      movementType: 'CLOSING_COUNT',
      direction: 'NONE',
      amount: parsed.data.countedCash,
      reason: cleanOptional(parsed.data.closingNote) || 'Closing count',
    });

    if (differenceType !== 'NONE') {
      await tx.insert(cashDrawerMovements).values({
        drawerId: drawer.id,
        createdByUserId: user.id,
        movementType: 'CASH_DIFFERENCE',
        direction: 'NONE',
        amount: toMoney(Math.abs(difference)),
        reason: differenceReason,
      });
    }

    await tx
      .update(cashDrawers)
      .set({
        closedByUserId: user.id,
        status: 'CLOSED',
        expectedCashAtClose: toMoney(expectedCash),
        countedCash: parsed.data.countedCash,
        differenceAmount: toMoney(Math.abs(difference)),
        differenceType,
        differenceReason,
        closingNote: cleanOptional(parsed.data.closingNote),
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cashDrawers.id, drawer.id));
  });

  revalidatePath('/money');
  revalidatePath('/dashboard');
  revalidatePath('/reports');

  redirect('/money?drawerClosed=1');
}
