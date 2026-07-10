'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@dispensary/db/client';
import { businessSettings, users } from '@dispensary/db/schema';
import { businessSettingsSchema } from '@dispensary/validators/settings';
import { requireOwner } from '@/lib/auth/session';

export type SettingsState = {
  error?: string;
  success?: string;
};

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function optionalFormText(formData: FormData, key: string) {
  const value = formText(formData, key).trim();
  return value ? value : undefined;
}

export async function updateBusinessSettingsAction(
  _previousState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const owner = await requireOwner();

  const parsed = businessSettingsSchema.safeParse({
    businessName: formText(formData, 'businessName'),
    ownerName: formText(formData, 'ownerName'),
    phone: optionalFormText(formData, 'phone'),
    address: optionalFormText(formData, 'address'),
    currency: 'RWF',
    lowStockAlertQuantity: formText(formData, 'lowStockAlertQuantity'),
    expiryAlertDays: '60',
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Check the settings form.',
    };
  }

  const currentSettings = await db.query.businessSettings.findFirst();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        name: parsed.data.ownerName,
        phone: parsed.data.phone || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, owner.id));

    if (!currentSettings) {
      await tx.insert(businessSettings).values({
        businessName: parsed.data.businessName,
        ownerName: parsed.data.ownerName,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        currency: 'RWF',
        lowStockAlertQuantity: parsed.data.lowStockAlertQuantity,
        expiryAlertDays: '60',
      });
    } else {
      await tx
        .update(businessSettings)
        .set({
          businessName: parsed.data.businessName,
          ownerName: parsed.data.ownerName,
          phone: parsed.data.phone || null,
          address: parsed.data.address || null,
          currency: 'RWF',
          lowStockAlertQuantity: parsed.data.lowStockAlertQuantity,
          expiryAlertDays: currentSettings.expiryAlertDays || '60',
          updatedAt: new Date(),
        })
        .where(eq(businessSettings.id, currentSettings.id));
    }
  });

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/stock');
  revalidatePath('/reports');

  return {
    success: 'Settings saved.',
  };
}
