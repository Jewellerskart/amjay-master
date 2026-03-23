import { z } from 'zod'

const productRequestSchema = z.object({
  productRefId: z.string().optional(),
  preferredProductName: z.string().max(200).optional(),
  preferredColor: z.string().max(20).optional(),
  preferredCut: z.string().max(20).optional(),
  preferredCarat: z.coerce.number().min(0).optional(),
  qty: z.coerce.number().min(0).optional(),
  budgetPerCarat: z.coerce.number().min(0).optional(),
})

export const createContactQuerySchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(3).max(3000),
  queryType: z.enum(['general', 'product-request']).optional().default('general'),
  productRequest: z.preprocess((value) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }
    return value
  }, productRequestSchema.optional()),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  deadlineAt: z.string().optional(),
})

export const getContactQueriesSchema = z.object({
  status: z.string().optional().default(''),
  search: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
})

export const updateContactQueryStatusSchema = z.object({
  status: z.enum(['new', 'in-progress', 'waiting-user', 'resolved', 'complete', 'cancelled']),
  remark: z.string().optional(),
  deadlineAt: z.string().optional(),
  assignedToUserId: z.union([z.string(), z.null()]).optional(),
})
