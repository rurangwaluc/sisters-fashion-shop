import { z } from 'zod';

const moneyPattern = /^[0-9]+(\.[0-9]{1,2})?$/;

const optionalMoneySchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || moneyPattern.test(value), 'Enter a valid amount.');

const wholeNumberSchema = z
  .string()
  .trim()
  .regex(/^[0-9]+$/, 'Enter a valid number.');

function amount(value: string | undefined) {
  return Number(value || '0');
}

export const productFormSchema = z
  .object({
    itemType: z.literal('PRODUCT'),
    name: z.string().trim().min(2, 'Product name is required.').max(180),
    category: z.string().trim().min(2, 'Category is required.').max(120),
    customerType: z.string().trim().min(2, 'Choose who this product is for.').max(40),
    size: z.string().trim().max(60).optional(),
    color: z.string().trim().max(80).optional(),
    unit: z.string().trim().min(1, 'Choose how this item is counted.').max(40),
    supplierName: z.string().trim().max(160).optional(),
    buyingPrice: optionalMoneySchema,
    sellingPrice: optionalMoneySchema,
    wholesalePrice: optionalMoneySchema,
    wholesaleMinQuantity: wholeNumberSchema,
    quantity: wholeNumberSchema,
    minQuantity: wholeNumberSchema,
    notes: z.string().trim().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    const retailPrice = amount(data.sellingPrice);
    const wholesalePrice = amount(data.wholesalePrice);
    const wholesaleMinQuantity = Number(data.wholesaleMinQuantity);

    if (retailPrice <= 0 && wholesalePrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sellingPrice'],
        message: 'Add retail price or wholesale price.',
      });
    }

    if (wholesalePrice > 0 && wholesaleMinQuantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['wholesaleMinQuantity'],
        message: 'Add the quantity where wholesale starts.',
      });
    }
  });

export type ProductFormInput = z.infer<typeof productFormSchema>;
