import { ProductModel } from './product.schema'
import { IServiceParams, ProductStatus } from '../type/product'
import { customLog } from '../../../utils/common'
import mongoose, { ClientSession } from 'mongoose'
import { createInvoice } from '../../invoice/service/invoice.service'
import { InvoiceStatus } from '../../invoice/type/invoice'
import { UserModel } from '../../auth/model/auth.schema'
import { buildQuery, buildSortCriteria } from './product.query.builder'

// =====================================  CONSTANTS & HELPERS

const ALLOWED_ROLES = ['super-admin', 'admin', 'distributor', 'jeweler'] as const

const PRODUCT_STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  AVAILABLE: ['ASSIGNED'],
  ASSIGNED: ['PURCHASE_PENDING_PAYMENT', 'RENTED'],
  PURCHASE_PENDING_PAYMENT: ['ACTIVE'],
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

const getLivePriceStages = (goldRate: number, silverRate: number) => [
  {
    $addFields: {
      liveMetal: {
        $cond: [
          { $regexMatch: { input: { $toLower: '$material.baseMetal' }, regex: 'silver' } },
          { $multiply: [{ $ifNull: ['$weight.pureWeight', 0] }, silverRate] },
          { $multiply: [{ $ifNull: ['$weight.pureWeight', 0] }, goldRate] },
        ],
      },
    },
  },
  {
    $addFields: {
      finalPrice: { $add: [{ $ifNull: ['$cost.totalCost', 0] }, { $ifNull: ['$liveMetal', 0] }] },
    },
  },
]

const getRootNormalizationStage = () => ({
  $addFields: {
    origin: { $ifNull: ['$origin', 'root'] },
    _origin: {
      $cond: [{ $eq: [{ $ifNull: ['$origin', 'root'] }, 'assignment'] }, 'assigned', { $ifNull: ['$origin', 'root'] }],
    },
    rootProductId: { $ifNull: ['$rootProductId', { $ifNull: ['$parentProductId', '$_id'] }] },
    originSort: { $cond: [{ $eq: ['$origin', 'assignment'] }, 1, 0] },
  },
})

const getGroupByRootStage = () => ({
  $group: {
    _id: '$rootProductId',
    doc: { $first: '$$ROOT' },
    totalQty: { $sum: { $ifNull: ['$qty', { $ifNull: ['$product.qty', 0] }] } },
    childCount: { $sum: { $cond: [{ $eq: ['$origin', 'assignment'] }, 1, 0] } },
    childIds: { $addToSet: '$_id' },
    liveMetal: { $first: '$liveMetal' },
    finalPrice: { $first: '$finalPrice' },
  },
})

const getExpandGroupStage = () => ({
  $addFields: {
    'doc.product.qty': '$totalQty',
    'doc.qty': '$totalQty',
    'doc.childCount': '$childCount',
    'doc.childIds': '$childIds',
    'doc._origin': 'root',
    'doc.liveMetal': '$liveMetal',
    'doc.finalPrice': '$finalPrice',
  },
})

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

        const rootProductId = updateDoc.rootProductId || newId
        delete updateDoc.rootProductId

        return {
          updateOne: {
            filter: { 'product.jewelCode': item.product.jewelCode },
            update: { $set: updateDoc, $setOnInsert: { _id: newId, rootProductId } },
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

export const findNextAvailableProduct = async () => {
  return ProductModel.findOne({
    origin: { $in: ['root', null] },
    status: 'AVAILABLE',
    $expr: { $gt: [{ $ifNull: ['$qty', { $ifNull: ['$product.qty', 0] }] }, 0] },
  }).sort({ createdAt: 1 })
}

// ===============================  PRODUCT LISTING

export const listProducts = async (
  params: IServiceParams & { includeAssignedClones?: boolean },
  liveRates?: { GoldRate?: number; SilverRate?: number }
) => {
  const {
    page = 1,
    limit = 10,
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
    diamonds = '',
    minWeight,
    maxWeight,
    minPrice,
    maxPrice,
    distributorId = '',
    includeAssignedClones = false,
    includePending = false,
    sortBy = 'createdAt',
    sortDir = 'desc',
  } = params

  const goldRate = Number(liveRates?.GoldRate ?? 0)
  const silverRate = Number(liveRates?.SilverRate ?? 0)
  const param = { search, usageType, group, subCategory, metals, diamonds, distributorId, holderRole, status }
  const range = { startDate, endDate, minWeight, maxWeight, minPrice, maxPrice, currentHolderUserId }
  const query = buildQuery({ ...param, ...range })

  if (!includeAssignedClones && !includePending && !query['usage.type']) {
    query['usage.type'] = { $nin: ['pending', 'rejected'] }
  }

  const sort = buildSortCriteria(sortBy, sortDir)

  const basePipeline: any[] = [
    { $match: query },
    getRootNormalizationStage(),
    ...getLivePriceStages(goldRate, silverRate),
    { $sort: { ...sort, rootProductId: 1, originSort: 1 } },
  ]

  const aggregatedPipeline = includeAssignedClones
    ? basePipeline
    : [...basePipeline, getGroupByRootStage(), getExpandGroupStage(), { $replaceRoot: { newRoot: '$doc' } }, { $sort: sort }]

  const skip = (page - 1) * limit

  const [dataRows, countRows, statsRows] = await Promise.all([
    ProductModel.aggregate([...aggregatedPipeline, { $skip: skip }, { $limit: limit }]),
    ProductModel.aggregate([...aggregatedPipeline, { $count: 'count' }]),
    ProductModel.aggregate([
      ...aggregatedPipeline,
      { $group: { _id: null, totalQty: { $sum: { $ifNull: ['$qty', { $ifNull: ['$product.qty', 0] }] } } } },
    ]),
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

  const qtyRequested = Math.max(1, Number(quantity || 1))
  const availableQty = Number(parent?.qty ?? parent?.product?.qty ?? 0)

  if (availableQty < qtyRequested) {
    throw new Error('Insufficient quantity available to assign')
  }

  // Reduce available quantity on parent
  parent.qty = availableQty - qtyRequested
  parent.product = parent.product || {}
  parent.product.qty = parent.qty

  const assignedAt = new Date()
  const assignerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'

  const logEntry = {
    fromUserId: parent?.currentHolder?.userId || null,
    fromRole: normalizeRole(parent?.currentHolder?.role),
    fromName: parent?.currentHolder?.name || '',
    fromBusinessName: parent?.currentHolder?.businessName || '',
    toUserId: jeweler?._id || null,
    toRole: 'jeweler',
    toName: `${jeweler?.firstName || ''} ${jeweler?.lastName || ''}`.trim() || jeweler?.email || '',
    toBusinessName: `${jeweler?.businessName || ''}`.trim(),
  }

  parent.assignmentLogs = parent.assignmentLogs || []
  parent.assignmentLogs.push(logEntry)
  await parent.save({ session })

  // Create child clone
  const baseClone: any = parent.toObject({ depopulate: true })
  delete baseClone._id
  delete baseClone.id

  baseClone.parentProductId = parent._id
  baseClone.rootProductId = parent.rootProductId || parent._id
  baseClone.origin = 'assignment'
  baseClone.status = 'ASSIGNED'
  baseClone.qty = qtyRequested
  baseClone.product = { ...(baseClone.product || {}), qty: qtyRequested }
  baseClone.usage = { type: 'pending', by: logEntry.toName, date: assignedAt }
  baseClone.currentHolder = {
    userId: jeweler?._id || null,
    role: 'jeweler',
    name: logEntry.toName,
    businessName: logEntry.toBusinessName,
    assignedAt,
    assignedByUserId: user?._id || null,
    assignedByRole: normalizeRole(user?.role),
    assignedByName: assignerName,
  }
  baseClone.assignmentLogs = [logEntry]

  const created = await ProductModel.create([baseClone], { session })
  const assignedProduct = Array.isArray(created) ? created[0] : created

  customLog({
    event: 'product.assigned.clone',
    productId: parent._id.toString(),
    assignedProductId: assignedProduct?._id?.toString(),
    toUserId: jeweler?._id?.toString() || '',
    qty: qtyRequested,
  })

  return { sourceProduct: parent, assignedProduct }
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
    businessName: `${args.toBusinessName || ''}`.trim(),
  }

  const user = {
    _id: args.assignedByUserId,
    role: args.assignedByRole,
    firstName: args.assignedByName,
    lastName: '',
    email: '',
  }
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

  if ((assigned.origin || 'root') !== 'assignment') {
    throw new Error('Product is not an assignment clone')
  }

  const parentId = assigned.parentProductId || args.sourceProductId
  const parent: any = parentId ? await ProductModel.findById(parentId).session(session || null) : null

  if (!parent) {
    throw new Error('Parent product not found')
  }

  const qty = Number(assigned?.qty ?? assigned?.product?.qty ?? 0)
  parent.product = parent.product || {}
  parent.qty = Number(parent.qty ?? parent.product.qty ?? 0) + qty
  parent.product.qty = parent.qty

  const logEntry = {
    fromUserId: assigned?.currentHolder?.userId || null,
    fromRole: normalizeRole(assigned?.currentHolder?.role),
    fromName: assigned?.currentHolder?.name || '',
    fromBusinessName: assigned?.currentHolder?.businessName || '',
    toUserId: parent?.currentHolder?.userId || null,
    toRole: normalizeRole(parent?.currentHolder?.role),
    toName: parent?.currentHolder?.name || '',
    toBusinessName: parent?.currentHolder?.businessName || '',
    assignedAt: new Date(),
    assignedByUserId: args.performedByUserId,
    assignedByRole: normalizeRole(args.performedByRole),
    assignedByName: args.performedByName,
    remark: args.remark || 'Assignment rejected and inventory restored',
  }

  parent.assignmentLogs = Array.isArray(parent.assignmentLogs) ? parent.assignmentLogs : []
  parent.assignmentLogs.push(logEntry)

  await parent.save({ session })
  await assigned.deleteOne({ session })

  return { parentProduct: parent }
}

export const acceptAssignedProduct = async (
  args: {
    assignedProductId: string
    performedByUserId: string
    performedByRole: string
    performedByName: string
    performedByEmail?: string
    performedByPhone?: string
    mode: 'rent' | 'outright'
    remark?: string
  },
  session?: ClientSession
) => {
  const assigned: any = await ProductModel.findById(args.assignedProductId).session(session || null)

  if (!assigned) {
    throw new Error('Assigned product not found')
  }

  if ((assigned.origin || 'root') !== 'assignment') {
    throw new Error('Product is not an assignment clone')
  }

  if (`${assigned?.currentHolder?.userId || ''}` !== `${args.performedByUserId}`) {
    throw new Error('Not allowed to accept this assignment')
  }

  const now = new Date()
  const acceptedUsage = args.mode === 'rent' ? 'rented' : 'outright'
  const nextStatus: ProductStatus = args.mode === 'rent' ? 'RENTED' : 'PURCHASE_PENDING_PAYMENT'

  assigned.status = nextStatus
  assigned.usage = { ...(assigned.usage || {}), type: acceptedUsage, date: now, by: args.performedByName }
  assigned.assignmentLogs = Array.isArray(assigned.assignmentLogs) ? assigned.assignmentLogs : []
  assigned.assignmentLogs.push({
    fromUserId: assigned?.currentHolder?.userId || null,
    fromRole: normalizeRole(assigned?.currentHolder?.role),
    fromName: assigned?.currentHolder?.name || '',
    fromBusinessName: assigned?.currentHolder?.businessName || '',
    toUserId: assigned?.currentHolder?.userId || null,
    toRole: normalizeRole(assigned?.currentHolder?.role),
    toName: assigned?.currentHolder?.name || '',
    toBusinessName: assigned?.currentHolder?.businessName || '',
    remark: args.remark || `Accepted as ${args.mode}`,
  })

  let invoice: any = null

  if (args.mode === 'outright') {
    const amount = Number(assigned?.cost?.totalCost ?? 0)
    const holderId = assigned?.currentHolder?.userId?.toString() || ''
    const holder = holderId ? await UserModel.findById(holderId).select('email phone').lean() : null

    const userEmail = `${holder?.email || args.performedByEmail || ''}`.trim()
    const userPhone = `${holder?.phone || args.performedByPhone || ''}`.trim()
    const productId = `${assigned?._id || args.assignedProductId || ''}`.toString()

    customLog({
      event: 'accept-assignment.invoice.payload',
      productId,
      hasEmail: !!userEmail,
      hasPhone: !!userPhone,
      amount,
      holderId,
      performedBy: args.performedByUserId,
    })

    if (!productId || !userEmail || !userPhone || !Number.isFinite(amount)) {
      const error: any = new Error('Unable to create invoice: missing product/contact/amount details for outright acceptance')
      error.status_code = 400
      throw error
    }

    invoice = await createInvoice(
      {
        productId,
        userEmail,
        userPhone,
        amount,
        type: 'purchase',
        requestedByEmail: args.performedByEmail || args.performedByName || '',
        status: 'PURCHASE_PENDING_PAYMENT' as InvoiceStatus,
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
