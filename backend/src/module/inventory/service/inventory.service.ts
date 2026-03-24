import mongoose from 'mongoose'
import { InventoryRequestModel } from '../model/inventory.schema'
import { InventoryRequestStatus, InventoryUsageChoice } from '../type/inventory'
import { cloneAndAssignProduct, updateProductStatus } from '../../product/model/product.service'
import { ProductModel } from '../../product/model/product.schema'
import { ProductStatus, IServiceParams } from '../../product/type/product'
import { canAssignProduct, reserveWalletCredit, recalcUsedCredit, releaseWalletCredit } from '../../wallet/service/wallet.service'
import { UserModel } from '../../auth/model/auth.schema'
import { customLog } from '../../../utils/common'

export type InventoryRequestPayload = {
  requestedBy: string
  styleCode: string
  requiredProducts?: number
  usageChoice: InventoryUsageChoice
  preferredUsageNote?: string
  remark?: string
}

export const createInventoryRequest = async (payload: InventoryRequestPayload) => {
  const request = await InventoryRequestModel.create({
    requestedBy: payload.requestedBy,
    styleCode: `${payload.styleCode || ''}`.trim().toUpperCase(),
    requiredProducts: payload.requiredProducts || 1,
    usageChoice: payload.usageChoice,
    preferredUsageNote: payload.preferredUsageNote || '',
    remark: payload.remark || '',
  })
  customLog({
    event: 'inventory.request.created',
    requestId: request._id.toString(),
    userId: payload.requestedBy,
    usageChoice: payload.usageChoice,
  })
  return request
}

const normalizeRole = (role: any) => `${role || ''}`.trim().toLowerCase()

export const listInventoryRequests = async (params: {
  page?: number
  limit?: number
  status?: InventoryRequestStatus
  requestedBy?: string
  styleCode?: string
}) => {
  const { page = 1, limit = 20, status, requestedBy, styleCode } = params
  const query: any = {}
  if (status) query.status = status
  if (requestedBy) query.requestedBy = requestedBy
  if (styleCode) query.styleCode = new RegExp(`^${styleCode.trim().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i')
  const [data, count] = await Promise.all([
    InventoryRequestModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InventoryRequestModel.countDocuments(query),
  ])
  return { data, count, page, limit }
}

export const getInventoryRequestById = async (id: string) => {
  return InventoryRequestModel.findById(id)
}

export const updateInventoryRequestStatus = async (
  id: string,
  status: InventoryRequestStatus,
  payload?: { assignedProductId?: string | null; assignedTo?: string | null; remark?: string },
  session?: mongoose.ClientSession
) => {
  const request = await InventoryRequestModel.findById(id).session(session || null)
  if (!request) return null
  request.status = status
  if (payload?.assignedProductId) request.assignedProductId = payload.assignedProductId as any
  if (payload?.assignedTo) request.assignedTo = payload.assignedTo as any
  if (payload?.remark) request.remark = payload.remark
  request.assignedAt = payload?.assignedProductId ? new Date() : request.assignedAt
  await request.save({ session })
  return request
}

export const listAvailableProducts = async (limit: number = 20, page: number = 1, filters?: { styleCode?: string; includeAssignments?: boolean }) => {
  const { styleCode, includeAssignments = !!(filters?.styleCode || false) } = filters || {}

  const query: any = {}
  if (styleCode) {
    query['product.styleCode'] = new RegExp(`^${styleCode.trim().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i')
  }

  if (!includeAssignments) {
    query.status = 'AVAILABLE' as ProductStatus
    query.origin = 'root'
  } else {
    query.status = { $nin: ['SOLD'] }
  }

  const [data, count] = await Promise.all([
    ProductModel.find(query)
      .sort({ origin: 1, status: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ProductModel.countDocuments(query),
  ])
  return { data, count, page, limit }
}

export const assignProductToJeweler = async (args: {
  productId: string
  jewelerId: string
  usageChoice: InventoryUsageChoice
  assignedBy: string
  assignedByRole: string
  assignedByName: string
  amount?: number
  requestId?: string
  remark?: string
}) => {
  const session = await mongoose.startSession()
  let result: any
  await session.withTransaction(async () => {
    const product = await ProductModel.findById(args.productId).session(session)
    if (!product) throw new Error('Product not found')

    const jeweler = await UserModel.findOne({ _id: args.jewelerId, role: 'jeweler' })
      .select('_id firstName lastName email businessName')
      .session(session)
    if (!jeweler) throw new Error('Jeweler not found')

    const canAssign = await canAssignProduct(args.jewelerId)
    if (!canAssign) throw new Error('Jeweler wallet limit exceeded')

    const assignedAt = new Date()
    const targetName = `${jeweler.firstName || ''} ${jeweler.lastName || ''}`.trim() || jeweler.email || ''

    if ((product.origin || 'root') === 'assignment') {
      const previousHolderId = `${product?.currentHolder?.userId || ''}`.trim()

      if (!previousHolderId || previousHolderId !== args.jewelerId) {
        const reserved = await reserveWalletCredit(args.jewelerId, 1, session)
        if (!reserved) throw new Error('Failed to reserve wallet credit')
        if (previousHolderId) {
          await releaseWalletCredit(previousHolderId, 1, session)
        }
      }

      const logEntry: any = {
        fromUserId: product?.currentHolder?.userId || null,
        fromRole: normalizeRole(product?.currentHolder?.role),
        fromName: product?.currentHolder?.name || '',
        fromBusinessName: product?.currentHolder?.businessName || '',
        toUserId: jeweler?._id || null,
        toRole: 'jeweler',
        toName: targetName,
        toBusinessName: `${jeweler?.businessName || ''}`.trim(),
        assignedByUserId: args.assignedBy,
        assignedByRole: args.assignedByRole,
        assignedByName: args.assignedByName,
        remark: args.remark || 'Reassigned to jeweler',
        assignedAt,
      }

      product.assignmentLogs = Array.isArray(product.assignmentLogs) ? product.assignmentLogs : []
      product.assignmentLogs.push(logEntry)
      product.currentHolder = {
        userId: jeweler?._id || null,
        role: 'jeweler',
        name: targetName,
        businessName: `${jeweler?.businessName || ''}`.trim(),
        assignedAt,
        assignedByUserId: args?.assignedBy || '',
        assignedByRole: args?.assignedByRole || '',
        assignedByName: args.assignedByName || '',
      }
      product.usage = { type: 'pending' as any, by: targetName, date: assignedAt }
      product.status = 'ASSIGNED'
      await product.save({ session })

      if (args.requestId) {
        await updateInventoryRequestStatus(
          args.requestId,
          'FULFILLED',
          {
            assignedProductId: args.productId,
            assignedTo: args.jewelerId,
            remark: args.remark,
          },
          session
        )
      }

      result = { assignedProduct: product, reassigned: true }
    } else {
      // ASSIGN FROM ROOT (clone)
      if (product.status !== 'AVAILABLE' && product.origin === 'root') {
        throw new Error('Product is not available for assignment')
      }

      const reserved = await reserveWalletCredit(args.jewelerId, 1, session)
      if (!reserved) throw new Error('Failed to reserve wallet credit')

      const assignmentResult = await cloneAndAssignProduct(
        {
          productId: args.productId,
          jeweler,
          user: {
            _id: args.assignedBy,
            role: args.assignedByRole,
            firstName: args.assignedByName?.split(' ')?.[0] || '',
            lastName: args.assignedByName?.split(' ')?.slice(1).join(' ') || '',
          },
          remark: args.remark,
          quantity: args.amount ? 1 : undefined,
        },
        session
      )

      if (!assignmentResult?.assignedProduct || !assignmentResult?.sourceProduct) {
        throw new Error('Failed to assign product')
      }

      const { assignedProduct, sourceProduct } = assignmentResult

      // Keep child pending until jeweler accepts.
      assignedProduct.usage = {
        type: 'pending' as any,
        by: targetName,
        date: new Date(),
      }
      await assignedProduct.save({ session })

      // Keep parent status available; do not auto-mark active until acceptance.
      await updateProductStatus(sourceProduct._id, sourceProduct.status as ProductStatus, session)

      if (args.requestId) {
        await updateInventoryRequestStatus(
          args.requestId,
          'FULFILLED',
          {
            assignedProductId: args.productId,
            assignedTo: args.jewelerId,
            remark: args.remark,
          },
          session
        )
      }

      result = { assignedProduct }
    }
  })

  session.endSession()

  customLog({
    event: 'inventory.product.assigned',
    productId: args.productId,
    jewelerId: args.jewelerId,
    usageChoice: args.usageChoice,
    invoiceId: result?.invoice?._id?.toString() || '',
  })

  return result
}

export const syncWalletUsageForJeweler = async (jewelerId: string) => {
  const activeCount = await ProductModel.countDocuments({
    'currentHolder.userId': jewelerId,
    status: { $in: ['ASSIGNED', 'RENTED', 'PURCHASE_PENDING_PAYMENT', 'ACTIVE'] },
  })
  await recalcUsedCredit(jewelerId, activeCount)
  return { activeCount }
}

const addRangeFilter = (query: any, field: string, min?: number, max?: number) => {
  if (typeof min === 'number' || typeof max === 'number') {
    query[field] = {}
    if (typeof min === 'number') query[field].$gte = min
    if (typeof max === 'number') query[field].$lte = max
  }
}

const buildQuery = (params: any): any => {
  const query: any = {}

  if (params.search) {
    query.$or = [
      { 'product.jewelCode': new RegExp(params.search, 'i') },
      { 'product.styleCode': new RegExp(params.search, 'i') },
      { 'client.clientName': new RegExp(params.search, 'i') },
      { 'client.clientCode': new RegExp(params.search, 'i') },
      { 'category.group': new RegExp(params.search, 'i') },
      { remarks: new RegExp(params.search, 'i') },
    ]
  }

  if (params.usageType) {
    query['usage.type'] = params.usageType === 'assigned' ? { $in: ['assigned', 'pending'] } : params.usageType
  }
  if (params.group) query['category.group'] = new RegExp(params.group, 'i')
  if (params.subCategory) query['category.subCategory'] = new RegExp(params.subCategory, 'i')
  if (params.metals) query['material.baseMetal'] = new RegExp(params.metals, 'i')
  if (params.diamonds) query['material.baseStone'] = new RegExp(params.diamonds, 'i')
  if (params.status) query.status = params.status
  if (params.holderRole) query['currentHolder.role'] = params.holderRole
  if (params.currentHolderUserId) {
    query['currentHolder.userId'] = new mongoose.Types.ObjectId(params.currentHolderUserId)
  }
  if (params.distributorId) query['uploadedBy.userId'] = params.distributorId

  addRangeFilter(query, 'weight.grossWeight', params.minWeight, params.maxWeight)
  addRangeFilter(query, 'cost.totalCost', params.minPrice, params.maxPrice)

  if (params.startDate || params.endDate) {
    query.createdAt = {}
    if (params.startDate) query.createdAt.$gte = new Date(params.startDate)
    if (params.endDate) query.createdAt.$lte = new Date(params.endDate)
  }

  return query
}

export const listInventory = async (
  params: IServiceParams & { includePending?: boolean },
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
    distributorId = '',
    includePending = false,
    sortBy = 'createdAt',
    sortDir = 'desc',
  } = params
  const { minWeight, maxWeight, minPrice, maxPrice } = params
  const payload = {
    search,
    usageType,
    group,
    subCategory,
    metals,
    diamonds,
    minWeight,
    maxWeight,
    minPrice,
    maxPrice,
    distributorId,
    holderRole,
    currentHolderUserId,
    status,
    startDate,
    endDate,
  }
  const query: any = buildQuery(payload)

  query.origin = 'assignment'
  query['currentHolder.role'] = 'jeweler'
  query['usage.type'] = includePending ? { $in: ['pending', 'assigned'] } : { $in: ['outright', 'rented'] }
  // if (currentHolderUserId) query['currentHolder.userId'] = currentHolderUserId

  const skip = (page - 1) * limit
  const goldRate = Number(liveRates?.GoldRate ?? 0)
  const silverRate = Number(liveRates?.SilverRate ?? 0)
  const dir = sortDir === 'asc' ? 1 : -1
  const sort: any = {}
  switch (sortBy) {
    case 'jewelCode':
      sort['product.jewelCode'] = dir
      break
    case 'qty':
      sort['qty'] = dir
      sort['product.qty'] = dir
      break
    case 'weight':
      sort['weight.grossWeight'] = dir
      break
    case 'price':
      sort['cost.totalCost'] = dir
      break
    case 'livePrice':
      sort['finalPrice'] = dir
      break
    default:
      sort['createdAt'] = dir
      break
  }

  const basePipeline: any[] = [
    { $match: query },
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
    { $sort: sort },
  ]

  const [data, countRows, statsRows] = await Promise.all([
    ProductModel.aggregate([...basePipeline, { $skip: skip }, { $limit: limit }]),
    ProductModel.aggregate([...basePipeline, { $count: 'count' }]),
    ProductModel.aggregate([
      ...basePipeline,
      {
        $group: {
          _id: null,
          totalQty: { $sum: { $ifNull: ['$qty', { $ifNull: ['$product.qty', 0] }] } },
          minWeight: { $min: '$weight.grossWeight' },
          maxWeight: { $max: '$weight.grossWeight' },
          minPrice: { $min: '$finalPrice' },
          maxPrice: { $max: '$finalPrice' },
        },
      },
    ]),
  ])
  const count = countRows?.[0]?.count ?? (data?.length || 0)
  const stats = statsRows?.[0] || {}
  const enriched = data.map((item: any) => ({ ...item, _origin: item?.origin || 'assignment' }))

  return { data: enriched, count, page, limit, ...stats }
}
