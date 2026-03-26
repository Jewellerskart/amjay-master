import { ProductModel } from './product.schema'
import { IServiceParams, ProductStatus } from '../type/product'
import { customLog } from '../../../utils/common'
import mongoose, { ClientSession } from 'mongoose'
import { createInvoice } from '../../invoice/service/invoice.service'
import { InvoiceStatus } from '../../invoice/type/invoice'
import { UserModel } from '../../auth/model/auth.schema'
import { createCommissionRecord } from '../../commission/service/commission.service'
import { calculateCommissionForSale, getUserCommissionConfig } from '../../commission/service/commission-calculator'
import { buildQuery, buildSortCriteria } from './product.query.builder'
import { buildLivePricingStages, type MetalRates } from '../utils/pricing'
import { toCaseInsensitiveExactRegex } from '../../../utils/normalizer'

// =====================================  CONSTANTS & HELPERS

const ALLOWED_ROLES = ['super-admin', 'admin', 'distributor', 'jeweler'] as const

const PRODUCT_STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  AVAILABLE: ['ASSIGNED'],
  ASSIGNED: ['PURCHASE_PENDING_PAYMENT', 'RENTED'],
  PURCHASE_PENDING_PAYMENT: ['ACTIVE', 'SOLD'],
  ACTIVE: ['SOLD'],
  RENTED: ['SOLD'],
  SOLD: [],
}

const normalizeRole = (role: any): string => {
  const lower = `${role || ''}`.trim().toLowerCase()
  return ALLOWED_ROLES.includes(lower as any) ? lower : 'admin'
}

const canTransition = (from: ProductStatus, to: ProductStatus): boolean => {
  if (from === to) return true
  return PRODUCT_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

// ===========================================  AGGREGATION PIPELINE BUILDERS

const OUNCE_TO_GRAM = 31.1034768
let metalRateCache: { value: MetalRates; expiresAt: number } = { value: { GoldRate: 0, SilverRate: 0 }, expiresAt: 0 }

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const fetchLiveMetalRates = async (): Promise<MetalRates> => {
  const now = Date.now()
  if (metalRateCache.expiresAt > now) return metalRateCache.value

  try {
    const response = await fetch('https://share.jewellerskart.com/api/metal/live-price')
    if (!response.ok) throw new Error(`Metal live rate failed with status ${response.status}`)

    const payload: any = await response.json()
    const metal = payload?.data?.metals?.[0] || {}
    const gold = Number(((Number(metal?.XAU || 0) || 0) / OUNCE_TO_GRAM).toFixed(2))
    const silver = Number(((Number(metal?.XAG || 0) || 0) / OUNCE_TO_GRAM).toFixed(2))
    const rates = {
      GoldRate: Number.isFinite(gold) ? gold : 0,
      SilverRate: Number.isFinite(silver) ? silver : 0,
    }
    metalRateCache = { value: rates, expiresAt: now + 60_000 }
    return rates
  } catch {
    return metalRateCache.value
  }
}

export const getProductLivePricingById = async (productId: string, liveRates?: { GoldRate?: number; SilverRate?: number }, session?: ClientSession) => {
  const idValue = `${productId || ''}`.trim()
  if (!idValue || !mongoose.Types.ObjectId.isValid(idValue)) {
    return { liveMetal: 0, finalPrice: Number.NaN }
  }

  const rows = await ProductModel.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(idValue) } },
    ...buildLivePricingStages(Number(liveRates?.GoldRate ?? 0), Number(liveRates?.SilverRate ?? 0)),
    { $project: { _id: 0, liveMetal: { $ifNull: ['$liveMetal', 0] }, finalPrice: { $ifNull: ['$finalPrice', 0] } } },
  ]).session(session || null)

  return {
    liveMetal: toFiniteNumber(rows?.[0]?.liveMetal, 0),
    finalPrice: toFiniteNumber(rows?.[0]?.finalPrice, Number.NaN),
  }
}

const getQtyExpression = () => ({ $ifNull: ['$qty', { $ifNull: ['$product.qty', 0] }] })

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

export const createProduct = async (payload: any) => {
  return ProductModel.create(payload)
}
export const createProductsBulk = async (items: any[]): Promise<{ inserted: number; modified: number; errors: any[] }> => {
  if (!items || items.length === 0) {
    return { inserted: 0, modified: 0, errors: [{ message: 'No items to process' }] }
  }

  try {
    const operations = items
      .filter((item) => item?.product?.jewelCode)
      .map((item: any) => {
        delete item._id

        const newId = new mongoose.Types.ObjectId()
        const updateDoc: any = { ...item }

        delete updateDoc.rootProductId

        return {
          updateOne: {
            filter: { 'product.jewelCode': item.product.jewelCode },
            update: { $set: updateDoc, $setOnInsert: { _id: newId } },
            upsert: true,
          },
        }
      })

    const result: any = await ProductModel.bulkWrite(operations, { ordered: false })

    return { inserted: result.upsertedCount || 0, modified: result.modifiedCount || 0, errors: [] }
  } catch (err: any) {
    console.error('Bulk write error:', err)

    if (err?.mongoose?.validationErrors) {
      console.error('Validation errors:', err.mongoose.validationErrors)
    }

    return {
      inserted: err?.result?.upsertedCount || 0,
      modified: err?.result?.modifiedCount || 0,
      errors: err?.writeErrors || err?.mongoose?.validationErrors || [err],
    }
  }
}

export const getProductById = async (id: string) => {
  return ProductModel.findById(id)
}

export const getProductByIdentifier = async (identifier: string) => {
  const value = `${identifier || ''}`.trim()
  if (!value) return null

  let product = null
  if (mongoose.Types.ObjectId.isValid(value)) {
    product = await ProductModel.findById(value)
  }

  if (product) return product

  const exactRegex = new RegExp(`^${value.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i')
  product = await ProductModel.findOne({
    $or: [{ 'product.jewelCode': exactRegex }, { 'product.styleCode': exactRegex }],
  })

  return product
}

export const updateProductById = async (id: string, payload: any) => {
  return ProductModel.findByIdAndUpdate(id, payload, { new: true })
}

export const deleteProductById = async (id: string) => {
  return ProductModel.findByIdAndDelete(id)
}

export const deleteProductsByIds = async (ids: string[]) => {
  return ProductModel.deleteMany({ _id: { $in: ids } })
}

export const findNextAvailableProduct = async (params: { styleCode?: string; distributorId?: string } = {}) => {
  const styleCode = `${params.styleCode || ''}`.trim()
  const distributorId = `${params.distributorId || ''}`.trim()

  const query: Record<string, any> = {
    status: 'AVAILABLE',
    $expr: { $gt: [getQtyExpression(), 0] },
  }

  if (styleCode) {
    query['product.styleCode'] = toCaseInsensitiveExactRegex(styleCode)
  }

  if (distributorId && mongoose.Types.ObjectId.isValid(distributorId)) {
    query['currentHolder.userId'] = new mongoose.Types.ObjectId(distributorId)
    query['currentHolder.role'] = 'distributor'
  }

  return ProductModel.findOne(query).sort({ createdAt: 1 })
}

// ===============================  PRODUCT LISTING

const buildProductListQuery = (params: IServiceParams & { includePending?: boolean; includeAssignedClones?: boolean }) => {
  const {
    search = '',
    usageType = '',
    group = '',
    subCategory = '',
    holderRole = '',
    currentHolderUserId = '',
    startDate = '',
    endDate = '',
    status = '',
    metals = '',
    baseQualities = '',
    diamonds = '',
    minWeight,
    maxWeight,
    minPrice,
    maxPrice,
    distributorId = '',
    includeAssignedClones = false,
    includePending = false,
  } = params

  const queryParams = { search, usageType, group, subCategory, metals, baseQualities, diamonds, distributorId, holderRole: '', status }
  const range = { startDate, endDate, minWeight, maxWeight, minPrice, maxPrice, currentHolderUserId: '' }
  const query = buildQuery({ ...queryParams, ...range })

  if (!includeAssignedClones && !includePending && !query['usage.type']) {
    query['usage.type'] = { $nin: ['pending', 'rejected'] }
  }

  const holderRoleKey = `${holderRole || ''}`.trim().toLowerCase()
  const holderUserIdKey = `${currentHolderUserId || ''}`.trim()
  return { query, holderRoleKey, holderUserIdKey }
}

const buildAggregatedProductPipeline = (args: {
  query: any
  sort: any
  goldRate: number
  silverRate: number
  holderRoleKey?: string
  holderUserIdKey?: string
}) => {
  const { query, sort, goldRate, silverRate, holderRoleKey = '', holderUserIdKey = '' } = args
  const basePipeline: any[] = [
    { $match: query },
    {
      $addFields: {
        latestAssignmentLog: { $arrayElemAt: [{ $ifNull: ['$assignmentLogs', []] }, -1] },
      },
    },
    {
      $addFields: {
        effectiveHolderRole: {
          $toLower: {
            $ifNull: [
              {
                $cond: [
                  { $in: [{ $toLower: { $ifNull: ['$usage.type', ''] } }, ['pending', 'assigned']] },
                  '$latestAssignmentLog.toRole',
                  '$currentHolder.role',
                ],
              },
              '',
            ],
          },
        },
        effectiveHolderUserId: {
          $toString: {
            $ifNull: [
              {
                $cond: [
                  { $in: [{ $toLower: { $ifNull: ['$usage.type', ''] } }, ['pending', 'assigned']] },
                  '$latestAssignmentLog.toUserId',
                  '$currentHolder.userId',
                ],
              },
              '',
            ],
          },
        },
      },
    },
    ...(holderUserIdKey ? [{ $match: { effectiveHolderUserId: holderUserIdKey } }] : []),
    ...(holderRoleKey ? [{ $match: { effectiveHolderRole: holderRoleKey } }] : []),
    ...buildLivePricingStages(goldRate, silverRate),
    { $project: { latestAssignmentLog: 0, effectiveHolderRole: 0, effectiveHolderUserId: 0 } },
    { $sort: sort },
  ]

  return basePipeline
}

const buildMarketplaceSort = (sortBy: IServiceParams['sortBy'], sortDir: IServiceParams['sortDir']) => {
  const dir = sortDir === 'asc' ? 1 : -1
  switch (sortBy) {
    case 'qty':
      return { totalQty: dir, styleCode: 1 }
    case 'price':
    case 'livePrice':
      return { displayPrice: dir, styleCode: 1 }
    case 'jewelCode':
      return { styleCode: dir }
    case 'createdAt':
    default:
      return { latestCreatedAt: dir, styleCode: 1 }
  }
}

export const listProducts = async (
  params: IServiceParams & { includeAssignedClones?: boolean },
  liveRates?: { GoldRate?: number; SilverRate?: number }
) => {
  const { page = 1, limit = 10, includeAssignedClones = false, sortBy = 'createdAt', sortDir = 'desc' } = params

  const goldRate = Number(liveRates?.GoldRate ?? 0)
  const silverRate = Number(liveRates?.SilverRate ?? 0)
  const { query, holderRoleKey, holderUserIdKey } = buildProductListQuery({ ...params, includeAssignedClones })
  const sort = buildSortCriteria(sortBy, sortDir)

  const aggregatedPipeline = buildAggregatedProductPipeline({ query, sort, goldRate, silverRate, holderRoleKey, holderUserIdKey })
  const skip = (page - 1) * limit
  const qtyExpr = { $convert: { input: getQtyExpression(), to: 'double', onError: 0, onNull: 0 } }
  const finalPriceExpr = { $convert: { input: '$finalPrice', to: 'double', onError: 0, onNull: 0 } }
  const usageTypeExpr = { $toLower: { $ifNull: ['$usage.type', ''] } }
  const amountExpr = { $multiply: [qtyExpr, finalPriceExpr] }

  const [dataRows, countRows, statsRows, totalsRows] = await Promise.all([
    ProductModel.aggregate([...aggregatedPipeline, { $skip: skip }, { $limit: limit }]),
    ProductModel.aggregate([...aggregatedPipeline, { $count: 'count' }]),
    ProductModel.aggregate([...aggregatedPipeline, { $group: { _id: null, totalQty: { $sum: getQtyExpression() } } }]),
    ProductModel.aggregate([
      ...aggregatedPipeline,
      {
        $group: {
          _id: null,
          inventoryQty: { $sum: qtyExpr },
          inventoryPrice: { $sum: amountExpr },
          memoQty: {
            $sum: {
              $cond: [{ $in: [usageTypeExpr, ['memo', 'rented', 'rent']] }, qtyExpr, 0],
            },
          },
          memoPrice: {
            $sum: {
              $cond: [{ $in: [usageTypeExpr, ['memo', 'rented', 'rent']] }, amountExpr, 0],
            },
          },
          purchasedQty: {
            $sum: {
              $cond: [{ $eq: [usageTypeExpr, 'outright'] }, qtyExpr, 0],
            },
          },
          purchasedPrice: {
            $sum: {
              $cond: [{ $eq: [usageTypeExpr, 'outright'] }, amountExpr, 0],
            },
          },
        },
      },
    ]),
  ])

  const stats = statsRows?.[0] || {}
  const totals = totalsRows?.[0] || {}
  const count = countRows?.[0]?.count ?? dataRows.length
  return {
    data: dataRows,
    count: Number(count),
    page,
    limit,
    totalQty: stats.totalQty || 0,
    totals: {
      inventoryQty: Number(totals.inventoryQty || 0),
      inventoryPrice: Number(totals.inventoryPrice || 0),
      memoQty: Number(totals.memoQty || 0),
      memoPrice: Number(totals.memoPrice || 0),
      purchasedQty: Number(totals.purchasedQty || 0),
      purchasedPrice: Number(totals.purchasedPrice || 0),
    },
  }
}

export const listMarketplaceProducts = async (
  params: IServiceParams & { includeAssignedClones?: boolean },
  liveRates?: { GoldRate?: number; SilverRate?: number }
) => {
  const { page = 1, limit = 12, sortBy = 'createdAt', sortDir = 'desc', minPrice, maxPrice } = params
  const includeAssignedClones = false

  const parsedMinPrice = Number.isFinite(Number(minPrice)) ? Number(minPrice) : undefined
  const parsedMaxPrice = Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : undefined
  const normalizedMinPrice =
    typeof parsedMinPrice === 'number' && typeof parsedMaxPrice === 'number' && parsedMinPrice > parsedMaxPrice ? parsedMaxPrice : parsedMinPrice
  const normalizedMaxPrice =
    typeof parsedMinPrice === 'number' && typeof parsedMaxPrice === 'number' && parsedMinPrice > parsedMaxPrice ? parsedMinPrice : parsedMaxPrice
  const finalPriceRange: Record<string, number> = {}
  if (typeof normalizedMinPrice === 'number') finalPriceRange.$gte = normalizedMinPrice
  if (typeof normalizedMaxPrice === 'number') finalPriceRange.$lte = normalizedMaxPrice
  const finalPriceRangeStages = Object.keys(finalPriceRange).length ? [{ $match: { displayPrice: finalPriceRange } }] : []

  const goldRate = Number(liveRates?.GoldRate ?? 0)
  const silverRate = Number(liveRates?.SilverRate ?? 0)
  const { query, holderRoleKey, holderUserIdKey } = buildProductListQuery({
    ...params,
    includeAssignedClones,
    minPrice: undefined,
    maxPrice: undefined,
  })
  const sort = buildSortCriteria(sortBy, sortDir)

  const productPipeline = buildAggregatedProductPipeline({
    query,
    sort,
    goldRate,
    silverRate,
    holderRoleKey,
    holderUserIdKey,
  })

  const marketplaceSort = buildMarketplaceSort(sortBy, sortDir)
  const skip = (page - 1) * limit

  const groupedPipeline: any[] = [
    ...productPipeline,
    { $match: { $expr: { $gt: [getQtyExpression(), 0] } } },
    {
      $addFields: {
        styleCodeKey: { $toUpper: { $ifNull: ['$product.styleCode', ''] } },
      },
    },
    {
      $sort: {
        styleCodeKey: 1,
        'product.jewelCode': 1,
      },
    },
    {
      $group: {
        _id: '$styleCodeKey',
        styleCode: { $first: { $ifNull: ['$product.styleCode', 'N/A'] } },
        totalQty: { $sum: getQtyExpression() },
        totalItems: { $sum: 1 },
        latestCreatedAt: { $max: '$createdAt' },
        minPrice: { $min: '$finalPrice' },
        maxPrice: { $max: '$finalPrice' },
        displayPrice: { $avg: '$finalPrice' },
        sampleProduct: { $first: '$$ROOT' },
        jewelCodes: {
          $push: {
            productId: '$_id',
            jewelCode: { $ifNull: ['$product.jewelCode', ''] },
            qty: getQtyExpression(),
            finalPrice: '$finalPrice',
            liveMetal: '$liveMetal',
            image: '$image',
            status: '$status',
            usage: '$usage',
          },
        },
      },
    },
    ...finalPriceRangeStages,
    { $sort: marketplaceSort },
  ]

  const [dataRows, countRows, statsRows] = await Promise.all([
    ProductModel.aggregate([
      ...groupedPipeline,
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: { $cond: [{ $eq: ['$_id', ''] }, { $toString: '$sampleProduct._id' }, '$_id'] },
          styleCode: 1,
          qty: '$totalQty',
          totalQty: 1,
          totalItems: 1,
          minPrice: 1,
          maxPrice: 1,
          finalPrice: '$displayPrice',
          liveMetal: '$sampleProduct.liveMetal',
          image: '$sampleProduct.image',
          material: '$sampleProduct.material',
          weight: '$sampleProduct.weight',
          diamond: '$sampleProduct.diamond',
          uploadedBy: '$sampleProduct.uploadedBy',
          currentHolder: '$sampleProduct.currentHolder',
          product: {
            styleCode: '$styleCode',
            jewelCode: { $ifNull: [{ $arrayElemAt: ['$jewelCodes.jewelCode', 0] }, ''] },
          },
          jewelCodes: 1,
        },
      },
    ]),
    ProductModel.aggregate([...groupedPipeline, { $count: 'count' }]),
    ProductModel.aggregate([...groupedPipeline, { $group: { _id: null, totalQty: { $sum: '$totalQty' } } }]),
  ])

  const stats = statsRows?.[0] || {}
  const count = countRows?.[0]?.count ?? dataRows.length

  return {
    data: dataRows,
    count: Number(count),
    page,
    limit,
    liveRates: { GoldRate: goldRate, SilverRate: silverRate },
    totalQty: stats.totalQty || 0,
  }
}

// ====================================================== STATISTICS & FILTERS

export const GetProductFilters = async () => {
  const statsAgg = await ProductModel.aggregate([
    {
      $group: {
        _id: null,
        baseMetals: { $addToSet: '$material.baseMetal' },
        baseQualities: { $addToSet: '$material.baseQuality' },
        baseStones: { $addToSet: '$material.baseStone' },
        subCategory: { $addToSet: '$product.subCategory' },
        category: { $addToSet: '$product.categoryName' },
        categoryGroup: { $addToSet: '$product.categoryGroupName' },
        minWeight: { $min: '$weight.grossWeight' },
        maxWeight: { $max: '$weight.grossWeight' },
        minPrice: { $min: '$cost.totalCost' },
        maxPrice: { $max: '$cost.totalCost' },
      },
    },
    {
      $project: {
        _id: 0,
        baseMetals: { $filter: { input: '$baseMetals', as: 'item', cond: { $ne: ['$$item', null] } } },
        baseQualities: { $filter: { input: '$baseQualities', as: 'item', cond: { $ne: ['$$item', null] } } },
        baseStones: { $filter: { input: '$baseStones', as: 'item', cond: { $ne: ['$$item', null] } } },
        subCategory: { $filter: { input: '$subCategory', as: 'item', cond: { $ne: ['$$item', null] } } },
        category: { $filter: { input: '$category', as: 'item', cond: { $ne: ['$$item', null] } } },
        categoryGroup: { $filter: { input: '$categoryGroup', as: 'item', cond: { $ne: ['$$item', null] } } },
        minWeight: 1,
        maxWeight: 1,
        minPrice: 1,
        maxPrice: 1,
      },
    },
  ])

  return (
    statsAgg[0] || {
      baseMetals: [],
      baseQualities: [],
      baseStones: [],
      subCategory: [],
      category: [],
      categoryGroup: [],
      minWeight: 0,
      maxWeight: 0,
      minPrice: 0,
      maxPrice: 0,
    }
  )
}

// ============================================= ASSIGNMENT OPERATIONS

export const cloneAndAssignProduct = async (
  args: { productId: string; jeweler: any; user: any; quantity?: number; remark?: string },
  session?: ClientSession
) => {
  const { productId, jeweler, user, quantity } = args

  const parent: any = await ProductModel.findById(productId).session(session || null)
  if (!parent) {
    throw new Error('Product not found')
  }

  const assignedAt = new Date()
  const assignerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'
  const toName = `${jeweler?.firstName || ''} ${jeweler?.lastName || ''}`.trim() || jeweler?.email || ''
  const toBusinessName = `${jeweler?.businessName || ''}`.trim()

  const logEntry = {
    fromUserId: parent?.currentHolder?.userId || null,
    fromRole: normalizeRole(parent?.currentHolder?.role),
    fromName: parent?.currentHolder?.name || '',
    fromBusinessName: parent?.currentHolder?.businessName || '',
    toUserId: jeweler?._id || null,
    toRole: 'jeweler',
    toName,
    toBusinessName,
    assignedAt,
    assignedByUserId: user?._id || null,
    assignedByRole: normalizeRole(user?.role),
    assignedByName: assignerName,
    remark: args.remark || 'Assigned to jeweler',
  }

  parent.status = 'ASSIGNED'
  parent.usage = { type: 'pending', by: toName, date: assignedAt }
  parent.currentHolder = {
    userId: jeweler?._id || null,
    role: 'jeweler',
    name: toName,
    businessName: toBusinessName,
    assignedAt,
    assignedByUserId: user?._id || null,
    assignedByRole: normalizeRole(user?.role),
    assignedByName: assignerName,
  }
  parent.assignmentLogs = Array.isArray(parent.assignmentLogs) ? parent.assignmentLogs : []
  parent.assignmentLogs.push(logEntry)
  await parent.save({ session })

  return { sourceProduct: parent, assignedProduct: parent, directAssignment: true }
}

export const assignProductHolder = async (
  args: {
    productId: string
    toUserId: string
    toRole?: string
    toName?: string
    toBusinessName?: string
    assignedByUserId?: string
    assignedByRole?: string
    assignedByName?: string
    remark?: string
    quantity?: number
  },
  session?: ClientSession
) => {
  const qtyRequested = Math.max(1, Number(args.quantity || 1))
  const name = `${args.toName || ''}`.trim()

  const jeweler = {
    _id: args.toUserId,
    firstName: name.split(' ')[0] || name,
    lastName: name.split(' ').slice(1).join(' '),
    email: '',
    businessName: `${args.toBusinessName || ''}`,
  }

  const user = { _id: args.assignedByUserId, role: args.assignedByRole, firstName: args.assignedByName, lastName: '', email: '' }
  const param = { productId: args.productId, jeweler, user, quantity: qtyRequested, remark: args.remark }
  const result = await cloneAndAssignProduct(param, session)

  if (!result?.assignedProduct) {
    throw new Error('Failed to assign product')
  }

  if (args.remark) {
    result.assignedProduct.assignmentLogs = Array.isArray(result.assignedProduct.assignmentLogs) ? result.assignedProduct.assignmentLogs : []

    if (result.assignedProduct.assignmentLogs.length) {
      const lastIndex = result.assignedProduct.assignmentLogs.length - 1
      result.assignedProduct.assignmentLogs[lastIndex] = {
        ...result.assignedProduct.assignmentLogs[lastIndex],
        remark: args.remark,
      }
    }

    await result.assignedProduct.save({ session })
  }

  customLog({
    event: 'product.assigned.holder',
    productId: args.productId,
    assignedProductId: result.assignedProduct?._id?.toString() || '',
    toUserId: args.toUserId,
    toRole: normalizeRole(args.toRole),
  })

  return result
}

export const rejectAssignedProduct = async (
  args: {
    assignedProductId: string
    sourceProductId?: string
    performedByUserId: string
    performedByRole: string
    performedByName: string
    remark?: string
  },
  session?: ClientSession
) => {
  const assigned: any = await ProductModel.findById(args.assignedProductId).session(session || null)
  if (!assigned) {
    throw new Error('Assigned product not found')
  }

  const now = new Date()
  const usageType = `${assigned?.usage?.type || ''}`.toLowerCase()
  if (!['pending', 'assigned'].includes(usageType)) {
    throw new Error('Product is not in a pending assignment state')
  }
  const logs = Array.isArray(assigned.assignmentLogs) ? assigned.assignmentLogs : []
  const performedById = `${args.performedByUserId || ''}`

  const lastTransfer =
    [...logs].reverse().find((log: any) => `${log?.toUserId || ''}` === performedById) ||
    [...logs].reverse().find((log: any) => normalizeRole(log?.toRole) === 'jeweler')

  if (!lastTransfer) {
    throw new Error('No assignment history found to restore holder')
  }

  assigned.currentHolder = {
    userId: lastTransfer?.fromUserId || null,
    role: normalizeRole(lastTransfer?.fromRole),
    name: lastTransfer?.fromName || '',
    businessName: lastTransfer?.fromBusinessName || '',
    assignedAt: now,
    assignedByUserId: args.performedByUserId,
    assignedByRole: normalizeRole(args.performedByRole),
    assignedByName: args.performedByName,
  }
  assigned.status = 'AVAILABLE'
  assigned.usage = {
    ...(assigned.usage || {}),
    type: 'owner',
    by: lastTransfer?.fromName || args.performedByName,
    date: now,
  }
  assigned.assignmentLogs = logs
  assigned.assignmentLogs.push({
    fromUserId: lastTransfer?.toUserId || null,
    fromRole: normalizeRole(lastTransfer?.toRole),
    fromName: lastTransfer?.toName || '',
    fromBusinessName: lastTransfer?.toBusinessName || '',
    toUserId: lastTransfer?.fromUserId || null,
    toRole: normalizeRole(lastTransfer?.fromRole),
    toName: lastTransfer?.fromName || '',
    toBusinessName: lastTransfer?.fromBusinessName || '',
    assignedAt: now,
    assignedByUserId: args.performedByUserId,
    assignedByRole: normalizeRole(args.performedByRole),
    assignedByName: args.performedByName,
    remark: args.remark || 'Assignment rejected and holder restored',
  })

  await assigned.save({ session })
  return { parentProduct: assigned }
}

export const acceptAssignedProduct = async (
  args: {
    assignedProductId: string
    performedByUserId: string
    performedByRole: string
    performedByName: string
    performedByEmail?: string
    performedByPhone?: string
    mode: 'memo' | 'rent' | 'outright'
    remark?: string
  },
  session?: ClientSession
) => {
  const assigned: any = await ProductModel.findById(args.assignedProductId).session(session || null)

  if (!assigned) {
    throw new Error('Assigned product not found')
  }

  const logs = Array.isArray(assigned.assignmentLogs) ? assigned.assignmentLogs : []
  const performedById = `${args.performedByUserId || ''}`
  const latestForPerformer = [...logs].reverse().find((log: any) => `${log?.toUserId || ''}` === performedById)
  const usageType = `${assigned?.usage?.type || ''}`.toLowerCase()
  const isPendingUsage = ['pending', 'assigned'].includes(usageType)
  const currentHolderId = `${assigned?.currentHolder?.userId || ''}`
  const allowedByHolder = currentHolderId && currentHolderId === performedById
  const allowedByTransfer = !!latestForPerformer
  if (!isPendingUsage || (!allowedByHolder && !allowedByTransfer)) {
    throw new Error('Product is not in an assignable pending state')
  }

  const now = new Date()
  const isMemoMode = args.mode === 'memo' || args.mode === 'rent'
  const acceptedUsage = isMemoMode ? 'memo' : 'outright'
  const nextStatus: ProductStatus = isMemoMode ? 'RENTED' : 'PURCHASE_PENDING_PAYMENT'
  const acceptedToName = latestForPerformer?.toName || args.performedByName
  const acceptedToBusinessName = latestForPerformer?.toBusinessName || assigned?.currentHolder?.businessName || ''
  const acceptedToRole = normalizeRole(latestForPerformer?.toRole || assigned?.currentHolder?.role || 'jeweler')

  assigned.currentHolder = {
    userId: args.performedByUserId,
    role: acceptedToRole,
    name: acceptedToName,
    businessName: acceptedToBusinessName,
    assignedAt: now,
    assignedByUserId: args.performedByUserId,
    assignedByRole: normalizeRole(args.performedByRole),
    assignedByName: args.performedByName,
  }

  assigned.status = nextStatus
  assigned.usage = { ...(assigned.usage || {}), type: acceptedUsage, date: now, by: args.performedByName }
  assigned.assignmentLogs = logs
  assigned.assignmentLogs.push({
    fromUserId: args.performedByUserId || null,
    fromRole: normalizeRole(args.performedByRole),
    fromName: args.performedByName || '',
    fromBusinessName: acceptedToBusinessName || '',
    toUserId: args.performedByUserId || null,
    toRole: acceptedToRole,
    toName: acceptedToName || '',
    toBusinessName: acceptedToBusinessName || '',
    assignedAt: now,
    assignedByUserId: args.performedByUserId,
    assignedByRole: normalizeRole(args.performedByRole),
    assignedByName: args.performedByName,
    remark: args.remark || `Accepted as ${isMemoMode ? 'memo' : 'outright'}`,
  })

  let invoice: any = null

  if (args.mode === 'outright') {
    const snapshotFinalPrice = Number(assigned?.finalPrice)
    const liveRates = await fetchLiveMetalRates()
    const stagedPricing = await getProductLivePricingById(`${assigned?._id || ''}`, liveRates, session)
    const stagedFinalPrice = Number(stagedPricing?.finalPrice)
    const explicitMrp = [Number(assigned?.saleAmount), Number(assigned?.cost?.saleAmount)].find(
      (value) => Number.isFinite(value) && value > 0
    )
    const resolvedFinalPrice =
      Number.isFinite(stagedFinalPrice) && stagedFinalPrice > 0
        ? stagedFinalPrice
        : Number.isFinite(snapshotFinalPrice) && snapshotFinalPrice > 0
          ? snapshotFinalPrice
          : typeof explicitMrp === 'number'
            ? explicitMrp
            : Number.NaN
    const holderId = `${args.performedByUserId || ''}`
    const holder = holderId
      ? await UserModel.findById(holderId).select('email phone commissionRate commissionConfig').lean()
      : null

    const userEmail = `${holder?.email || args.performedByEmail || ''}`.trim()
    const userPhone = `${holder?.phone || args.performedByPhone || ''}`.trim()
    const productId = `${assigned?._id || args.assignedProductId || ''}`.toString()

    if (!holderId || !productId || !userEmail || !userPhone || !Number.isFinite(resolvedFinalPrice)) {
      const error: any = new Error('Unable to create invoice: missing product/contact/finalPrice details for outright acceptance')
      error.status_code = 400
      throw error
    }

    const productSnapshot = typeof assigned?.toObject === 'function' ? assigned.toObject() : assigned
    const commissionConfig = getUserCommissionConfig(holder as any)
    const commissionCalculation = calculateCommissionForSale({
      product: productSnapshot,
      grossAmount: resolvedFinalPrice,
      config: commissionConfig,
    })

    const payload: any = {
      productId,
      userEmail,
      userPhone,
      finalPrice: commissionCalculation.grossAmount,
      amount: commissionCalculation.payableAmount,
      commissionTotal: commissionCalculation.totalDeduction,
      commissionBreakdown: commissionCalculation.breakdown,
      type: 'purchase',
      requestedByEmail: args.performedByEmail || args.performedByName || '',
      status: 'PURCHASE_PENDING_PAYMENT' as InvoiceStatus,
    }
    invoice = await createInvoice(payload, session)

    await createCommissionRecord(
      {
        userId: holderId,
        productId,
        commissionRate: commissionCalculation.effectiveRate,
        commissionAmount: commissionCalculation.totalDeduction,
        invoiceId: `${invoice?._id || ''}`,
        breakdown: commissionCalculation.breakdown.map((item) => ({
          componentKey: item.componentKey,
          baseAmount: item.baseAmount,
          rate: item.rate,
          deductionAmount: item.deductionAmount,
        })),
      },
      session
    )
  }

  await assigned.save({ session })

  return { product: assigned, invoice }
}

// ================================ STATUS MANAGEMENT

export const updateProductStatus = async (productId: string, status: ProductStatus, session?: ClientSession) => {
  const product: any = await ProductModel.findById(productId).session(session || null)

  if (!product) {
    throw new Error('Product not found')
  }

  const currentStatus: ProductStatus = product.status

  if (!canTransition(currentStatus, status)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${status}`)
  }

  product.status = status
  await product.save({ session })

  customLog({
    event: 'product.status.updated',
    productId,
    previousStatus: currentStatus,
    nextStatus: status,
  })

  return product
}
