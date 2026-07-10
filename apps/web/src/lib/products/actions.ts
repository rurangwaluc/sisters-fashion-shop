'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@dispensary/db/client';
import { products } from '@dispensary/db/schema';
import { productFormSchema } from '@dispensary/validators/product';
import { requireUser } from '@/lib/auth/session';

export type ProductState = {
  error?: string;
};

function cleanOptional(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function cleanMoney(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : '0';
}

function getFormValues(formData: FormData) {
  return {
    itemType: 'PRODUCT',
    name: formData.get('name'),
    category: formData.get('category'),
    customerType: formData.get('customerType'),
    size: formData.get('size') || undefined,
    color: formData.get('color') || undefined,
    unit: formData.get('unit'),
    supplierName: formData.get('supplierName') || undefined,
    buyingPrice: formData.get('buyingPrice') || undefined,
    sellingPrice: formData.get('sellingPrice') || undefined,
    wholesalePrice: formData.get('wholesalePrice') || undefined,
    wholesaleMinQuantity: formData.get('wholesaleMinQuantity') || '0',
    quantity: formData.get('quantity'),
    minQuantity: formData.get('minQuantity'),
    notes: formData.get('notes') || undefined,
  };
}

export async function createProductAction(
  _previousState: ProductState,
  formData: FormData,
): Promise<ProductState> {
  await requireUser();

  const parsed = productFormSchema.safeParse(getFormValues(formData));

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Check the form.',
    };
  }

  await db.insert(products).values({
    itemType: 'PRODUCT',
    name: parsed.data.name,
    category: parsed.data.category,
    customerType: parsed.data.customerType,
    size: cleanOptional(parsed.data.size),
    color: cleanOptional(parsed.data.color),
    unit: parsed.data.unit,
    batchNumber: null,
    supplierName: cleanOptional(parsed.data.supplierName),
    buyingPrice: cleanMoney(parsed.data.buyingPrice),
    sellingPrice: cleanMoney(parsed.data.sellingPrice),
    wholesalePrice: cleanMoney(parsed.data.wholesalePrice),
    wholesaleMinQuantity: Number(parsed.data.wholesaleMinQuantity),
    quantity: Number(parsed.data.quantity),
    minQuantity: Number(parsed.data.minQuantity),
    expiryDate: null,
    notes: cleanOptional(parsed.data.notes),
    status: 'ACTIVE',
  });

  revalidatePath('/products');
  revalidatePath('/stock');
  revalidatePath('/sales/new');
  revalidatePath('/dashboard');
  redirect('/products');
}

export async function updateProductAction(
  productId: string,
  _previousState: ProductState,
  formData: FormData,
): Promise<ProductState> {
  await requireUser();

  const parsed = productFormSchema.safeParse(getFormValues(formData));

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Check the form.',
    };
  }

  await db
    .update(products)
    .set({
      itemType: 'PRODUCT',
      name: parsed.data.name,
      category: parsed.data.category,
      customerType: parsed.data.customerType,
      size: cleanOptional(parsed.data.size),
      color: cleanOptional(parsed.data.color),
      unit: parsed.data.unit,
      batchNumber: null,
      supplierName: cleanOptional(parsed.data.supplierName),
      buyingPrice: cleanMoney(parsed.data.buyingPrice),
      sellingPrice: cleanMoney(parsed.data.sellingPrice),
      wholesalePrice: cleanMoney(parsed.data.wholesalePrice),
      wholesaleMinQuantity: Number(parsed.data.wholesaleMinQuantity),
      quantity: Number(parsed.data.quantity),
      minQuantity: Number(parsed.data.minQuantity),
      expiryDate: null,
      notes: cleanOptional(parsed.data.notes),
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  revalidatePath('/products');
  revalidatePath('/stock');
  revalidatePath('/sales/new');
  revalidatePath('/dashboard');
  redirect('/products');
}

export async function archiveProductAction(formData: FormData) {
  await requireUser();

  const productId = String(formData.get('productId') || '');

  if (!productId) {
    return;
  }

  await db
    .update(products)
    .set({
      status: 'ARCHIVED',
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  revalidatePath('/products');
  revalidatePath('/stock');
  revalidatePath('/dashboard');
}
