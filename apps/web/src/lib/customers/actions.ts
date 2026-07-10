'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@dispensary/db/client';
import { customers } from '@dispensary/db/schema';
import { requireUser } from '@/lib/auth/session';

export async function archiveCustomerAction(formData: FormData) {
  await requireUser();

  const customerId = String(formData.get('customerId') || '');

  if (!customerId) {
    return;
  }

  await db
    .update(customers)
    .set({
      status: 'ARCHIVED',
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId));

  revalidatePath('/customers');
}
