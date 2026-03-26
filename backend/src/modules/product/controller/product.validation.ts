import { z } from 'zod'

const numberField = z.coerce.number()
const optionalDate = z.string().optional()

const productStatusEnum = z.enum(['AVAILABLE', 'ASSIGNED', 'RENTED', 'PURCHASE_PENDING_PAYMENT', 'ACTIVE', 'SOLD'])
const componentSchema = z.object({
  type: z.enum(['metal', 'diamond', 'colorStone', 'stone', 'charge']).optional(),
  materialType: z.string().optional(),
  itemCode: z.string().optional(),
  itemName: z.string().optional(),
  sizeCode: z.string().optional(),
  sizeName: z.string().optional(),
  pieces: z.coerce.number().optional(),
  weight: z.coerce.number().optional(),
  purity: z.coerce.number().nullable().optional(),
  rate: z.coerce.number().nullable().optional(),
  amount: z.coerce.number().nullable().optional(),
  descriptionCode: z.string().optional(),
})
const chargesSchema = z.object({
  type: z.string().optional(),
  amount: z.coerce.number().optional(),
})

export const createProductSchema = z
  .object({
    orderStatus: z.string().optional(),
    noOfTags: numberField.optional(),
    remarks: z.string().optional(),
    status: productStatusEnum.optional(),
    image: z.string().optional().nullable(),
    qty: numberField.optional(),
    usage: z
      .object({
        type: z.enum(['owner', 'assigned', 'pending', 'rejected', 'outright', 'memo', 'rented']).default('owner'),
        by: z.string().optional(),
        date: optionalDate,
      })
      .optional()
      .default({ type: 'owner' }),
    product: z
      .object({
        transNo: z.string().optional(),
        orderNo: z.string().optional(),
        billType: z.string().optional(),
        makeType: z.string().optional(),
        design: z.string().optional(),
        jewelCode: z.string().optional(),
        category: z.string().optional(),
        categoryName: z.string().optional(),
        categoryGroupName: z.string().optional(),
        subCategory: z.string().optional(),
        styleCode: z.string().optional(),
        itemPieces: numberField.optional(),
      })
      .optional(),
    diamond: z
      .object({
        pieces: numberField.optional(),
        weight: numberField.optional(),
        costAmount: numberField.optional(),
      })
      .optional(),
    colorDiamond: z
      .object({
        pieces: numberField.optional(),
        weight: numberField.optional(),
        costAmount: numberField.optional(),
      })
      .optional(),
    components: z.array(componentSchema).optional(),
    charges: z.array(chargesSchema).optional(),
    material: z
      .object({
        baseQuality: z.string().optional(),
        baseStone: z.string().optional(),
        baseMetal: z.string().optional(),
        metal: z.string().optional(),
        metalGroupName: z.string().optional(),
      })
      .optional(),
    weight: z
      .object({
        grossWeight: numberField.optional(),
        netWeight: numberField.optional(),
        pureWeight: numberField.optional(),
      })
      .optional(),
    cost: z
      .object({
        pieceValue: numberField.optional(),
        metalValue: numberField.optional(),
        diamondValue: numberField.optional(),
        colorStoneValue: numberField.optional(),
        otherMetalValue: numberField.optional(),
        goldCost: numberField.optional(),
        otherMetalCost: numberField.optional(),
        exchangeCost: numberField.optional(),
        totalCost: numberField.optional(),
        setAmount: numberField.optional(),
        handAmount: numberField.optional(),
      })
      .optional(),
  })
  .passthrough()

export const updateProductSchema = createProductSchema.partial().passthrough()

export const bulkImportProductsSchema = z
  .object({
    importFormat: z.enum(['gati', 'default']).optional(),
    items: z.array(z.any()).min(1).max(500),
  })
  .passthrough()

export const listProductsSchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  search: z.string().optional().default(''),
  usageType: z.enum(['owner', 'assigned', 'pending', 'rejected', 'outright', 'memo', 'rented', '']).optional().default(''),
  group: z.string().optional().default(''),
  subCategory: z.string().optional().default(''),
  metals: z.string().optional().default(''),
  baseQualities: z.string().optional().default(''),
  diamonds: z.string().optional().default(''),
  minWeight: z.coerce.number().optional(),
  maxWeight: z.coerce.number().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  distributorId: z.string().optional().default(''),
  holderRole: z.enum(['super-admin', 'admin', 'distributor', 'jeweler', '']).optional().default(''),
  currentHolderUserId: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  includeAssignedClones: z.boolean().optional().default(false),
  includePending: z.boolean().optional().default(false),
  status: productStatusEnum.optional().or(z.literal('')).default(''),
  sortBy: z.enum(['createdAt', 'jewelCode', 'styleCode', 'qty', 'weight', 'price', 'livePrice']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const assignProductToJewelerSchema = z.object({
  toUserId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(1).default(1),
  remark: z.string().optional(),
})

export const rejectAssignedProductSchema = z.object({
  sourceProductId: z.string().optional().default(''),
  remark: z.string().optional().default(''),
})

export const acceptAssignedProductSchema = z.object({
  mode: z.enum(['memo', 'rent', 'outright']),
  remark: z.string().optional(),
})

export const bulkDeleteProductsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

export const createDiamondRateSchema = z.object({
  clarity: z.string().min(1),
  size: z.string().min(1), // e.g., "0.18 - 0.22"
  shape: z.string().optional(),
  ratePerCarat: z.coerce.number().min(0),
  currency: z.string().optional().default('INR'),
  effectiveDate: z.string().optional(),
  remark: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

export const updateDiamondRateSchema = createDiamondRateSchema.partial()

export const listDiamondRateSchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  clarity: z.string().optional().default(''),
  shape: z.string().optional().default(''),
  size: z.string().optional().default(''),
  isActive: z.coerce.boolean().optional(),
})

export const createOtherRateSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  unit: z.string().optional(),
  rate: z.coerce.number().min(0),
  currency: z.string().optional().default('INR'),
  effectiveDate: z.string().optional(),
  remark: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  attributes: z.record(z.string(), z.any()).optional(),
})

export const updateOtherRateSchema = createOtherRateSchema.partial()

export const listOtherRateSchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  name: z.string().optional().default(''),
  category: z.string().optional().default(''),
  isActive: z.coerce.boolean().optional(),
})
