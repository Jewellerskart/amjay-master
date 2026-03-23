import { z } from 'zod'

export const sellProductSchema = z.object({
  productId: z.string().trim().min(1),
  jewelerId: z.string().trim().min(1),
  salePrice: z.coerce.number().positive(),
  choice: z.enum(['PURCHASE', 'RENT']),
})
