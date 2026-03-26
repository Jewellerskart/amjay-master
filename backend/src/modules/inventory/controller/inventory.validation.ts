import { z } from 'zod'

const usageChoiceEnum = z.enum(['PURCHASE', 'MEMO', 'RENT'])
const inventoryStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'FULFILLED', 'CANCELLED'])
const sortByEnum = z.enum(['createdAt', 'jewelCode', 'qty', 'weight', 'price', 'livePrice'])

export const createInventoryRequestSchema = z.object({
  requiredProducts: z.coerce.number().min(1).optional(),
  usageChoice: usageChoiceEnum,
  preferredUsageNote: z.string().max(1000).optional(),
  remark: z.string().max(1000).optional(),
  styleCode: z.string().min(1).optional(), // derive if absent
  jewelCode: z.string().optional(),
  productId: z.string().optional(),
})

export const listInventoryRequestsSchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  status: inventoryStatusEnum.optional(),
  requestedBy: z.string().optional(),
  styleCode: z.string().optional(),
})

export const assignProductSchema = z.object({
  requestId: z.string().optional(),
  productId: z.string().min(1),
  jewelerId: z.string().min(1),
  usageChoice: usageChoiceEnum,
  remark: z.string().max(500).optional(),
})

export const listAvailableProductsSchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  styleCode: z.string().optional(),
  includeAssignments: z.boolean().optional().default(true),
})

export const listInventorySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  search: z.string().optional().default(''),
  usageType: z.enum(['owner', 'assigned', 'pending', 'rejected', 'outright', 'memo', 'rented', '']).optional().default(''),
  group: z.string().optional().default(''),
  subCategory: z.string().optional().default(''),
  metals: z.string().optional().default(''),
  diamonds: z.string().optional().default(''),
  minWeight: z.coerce.number().optional(),
  maxWeight: z.coerce.number().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  holderRole: z.string().optional().default(''),
  currentHolderUserId: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  includePending: z.boolean().optional().default(false),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'RENTED', 'PURCHASE_PENDING_PAYMENT', 'ACTIVE', 'SOLD']).optional().or(z.literal('')).default(''),
  sortBy: sortByEnum.optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const updateInventoryRequestStatusSchema = z.object({
  status: inventoryStatusEnum,
  remark: z.string().max(500).optional(),
})
