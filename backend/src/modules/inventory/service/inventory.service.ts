import mongoose from 'mongoose'
import { InventoryRequestModel } from '../model/inventory.schema'
import { InventoryRequestStatus, InventoryUsageChoice } from '../type/inventory'
import { cloneAndAssignProduct, updateProductStatus } from '../../product/model/product.service'
import { ProductModel } from '../../product/model/product.schema'
import { ProductStatus, IServiceParams } from '../../product/type/product'
import { buildQuery as buildProductQuery, buildSortCriteria } from '../../product/model/product.query.builder'
import { UserModel } from '../../auth/model/auth.schema'
import { customLog } from '../../../utils/common'
import { buildLivePricingStages } from '../../product/utils/pricing'

export type InventoryRequestPayload = {
  requestedBy: string
  styleCode: string
  requiredProducts?: number
  usageChoice: InventoryUsageChoice
  preferredUsageNote?: string
  remark?: string
}

const toStringId = (value: unknown): string => `${value || ''}`.trim()
const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const canAssignForJeweler = async (jewelerId: string) => {
  if (!mongoose.Types.ObjectId.isValid(jewelerId)) return false
  const jeweler = await UserModel.findById(jewelerId).select('role creditLimit walletBalance').lean()
  if (!jeweler || `${jeweler.role || ''}`.trim().toLowerCase() !== 'jeweler') return false
  const availableLimit = Math.max(0, toFiniteNumber(jeweler.creditLimit, 0)) + Math.max(0, toFiniteNumber(jeweler.walletBalance, 0))
  return availableLimit > 0
}

const normalizeAssignedProductIds = (request: any): string[] => {
  const source = [...(Array.isArray(request?.assignedProductIds) ? request.assignedProductIds : []), request?.assignedProductId]
  const assignedIds: string[] = []
  const seen = new Set<string>()

  source.forEach((item) => {
    const parsed = toStringId(item)
    if (!parsed || seen.has(parsed)) return
    seen.add(parsed)
    assignedIds.push(parsed)
  })

  return assignedIds
}

const mapRequestProgress = (request: any) => {
  const requiredProducts = Math.max(1, Number(request?.requiredProducts || 1))
  const assignedProductIds = normalizeAssignedProductIds(request)
  const parsedAssignedCount = Number(request?.assignedCount)
  const assignedCount = Math.min(requiredProducts, Number.isFinite(parsedAssignedCount) ? parsedAssignedCount : assignedProductIds.length)
  const pendingProducts = Math.max(0, requiredProducts - assignedCount)
  const latestAssignedProductId = assignedProductIds.length ? assignedProductIds[assignedProductIds.length - 1] : null

  return {
    ...request,
    requiredProducts,
    assignedProductIds,
    assignedProductId: request?.assignedProductId || latestAssignedProductId,
    assignedCount,
    pendingProducts,
  }
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
      .populate('requestedBy', 'firstName lastName email businessName role')
      .populate('assignedTo', 'firstName lastName email businessName role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InventoryRequestModel.countDocuments(query),
  ])
  return { data: data.map((item: any) => mapRequestProgress(item)), count, page, limit }
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

  const nextAssignedIds = normalizeAssignedProductIds(request)
  const incomingAssignedProductId = toStringId(payload?.assignedProductId)

  if (incomingAssignedProductId && !nextAssignedIds.includes(incomingAssignedProductId)) {
    nextAssignedIds.push(incomingAssignedProductId)
  }

  if (incomingAssignedProductId) {
    request.assignedProductId = incomingAssignedProductId as any
    request.assignedProductIds = nextAssignedIds as any
    request.assignedAt = new Date()
  }

  const requiredProducts = Math.max(1, Number(request.requiredProducts || 1))
  const assignedCount = Math.min(requiredProducts, nextAssignedIds.length)
  request.assignedCount = assignedCount

  request.status = incomingAssignedProductId ? (assignedCount >= requiredProducts ? 'FULFILLED' : 'IN_PROGRESS') : status

  if (payload?.assignedTo) request.assignedTo = payload.assignedTo as any
  if (payload?.remark) request.remark = payload.remark
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
  } else {
    query.status = { $nin: ['SOLD'] }
  }

  const [data, count] = await Promise.all([
    ProductModel.find(query)
      .sort({ status: 1, createdAt: -1 })
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
  requestId?: string
  remark?: string
}) => {
  const session = await mongoose.startSession()
  let result: any
  await session.withTransaction(async () => {
    const request = args.requestId ? await InventoryRequestModel.findById(args.requestId).session(session) : null
    if (args.requestId && !request) throw new Error('Inventory request not found')

    const product = await ProductModel.findById(args.productId).session(session)
    if (!product) throw new Error('Product not found')

    if (request) {
      const requestStatus = `${request.status || ''}`.toUpperCase()
      if (requestStatus === 'CANCELLED') {
        throw new Error('Cannot assign product to a cancelled request')
      }

      const requestStyleCode = `${request.styleCode || ''}`.trim().toUpperCase()
      const productStyleCode = `${product?.product?.styleCode || ''}`.trim().toUpperCase()
      if (requestStyleCode && productStyleCode && requestStyleCode !== productStyleCode) {
        throw new Error('Selected product style does not match request style')
      }

      const requestedById = toStringId(request.requestedBy)
      if (requestedById && requestedById !== args.jewelerId) {
        throw new Error('Request does not belong to selected jeweler')
      }

      const assignedProductIds = normalizeAssignedProductIds(request)
      const requiredProducts = Math.max(1, Number(request.requiredProducts || 1))
      if (assignedProductIds.includes(args.productId)) {
        throw new Error('Selected product is already assigned for this request')
      }
      if (assignedProductIds.length >= requiredProducts || requestStatus === 'FULFILLED') {
        throw new Error('Request is already fulfilled')
      }
    }

    const jeweler = await UserModel.findOne({ _id: args.jewelerId, role: 'jeweler' })
      .select('_id firstName lastName email businessName')
      .session(session)
    if (!jeweler) throw new Error('Jeweler not found')

    const canAssign = await canAssignForJeweler(args.jewelerId)
    if (!canAssign) throw new Error('Jeweler wallet limit exceeded')

    const assignedAt = new Date()
    const targetName = `${jeweler.firstName || ''} ${jeweler.lastName || ''}`.trim() || jeweler.email || ''

    // Assign by updating the same jewelCode record (no clone).
    const status = `${product?.status || ''}`.toUpperCase()
    const usageType = `${product?.usage?.type || ''}`.toLowerCase()
    const previousHolderId = `${product?.currentHolder?.userId || ''}`.trim()
    const isReassignablePending = status === 'ASSIGNED' && ['pending', 'assigned'].includes(usageType)
    if (status !== 'AVAILABLE' && !isReassignablePending) {
      throw new Error('Product is not available for assignment')
    }

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
        quantity: 1,
      },
      session
    )

    if (!assignmentResult?.assignedProduct || !assignmentResult?.sourceProduct) {
      throw new Error('Failed to assign product')
    }

    const { assignedProduct, sourceProduct } = assignmentResult

    // Keep assignment pending until jeweler accepts.
    assignedProduct.usage = { type: 'pending' as any, by: targetName, date: assignedAt }
    await assignedProduct.save({ session })

    // Keep parent status available; do not auto-mark active until acceptance.
    await updateProductStatus(sourceProduct._id, sourceProduct.status as ProductStatus, session)

    let updatedRequest = null
    if (args.requestId) {
      updatedRequest = await updateInventoryRequestStatus(
        args.requestId,
        'IN_PROGRESS',
        { assignedProductId: assignedProduct._id?.toString(), assignedTo: args.jewelerId, remark: args.remark },
        session
      )
    }

    result = { assignedProduct, reassigned: !!previousHolderId && previousHolderId !== args.jewelerId, request: updatedRequest }
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
    holderRole: '',
    currentHolderUserId: '',
    status,
    startDate,
    endDate,
  }
  const query: any = buildProductQuery(payload as any)

  query['usage.type'] = includePending ? { $in: ['pending', 'assigned'] } : { $in: ['outright', 'memo', 'rented'] }
  const holderRoleKey = `${holderRole || ''}`.trim().toLowerCase()
  const holderUserId = `${currentHolderUserId || ''}`.trim()

  const skip = (page - 1) * limit
  const goldRate = Number(liveRates?.GoldRate ?? 0)
  const silverRate = Number(liveRates?.SilverRate ?? 0)
  const sort = buildSortCriteria(sortBy, sortDir)

  const basePipeline: any[] = [
    { $match: query },
    {
      $addFields: {
        latestAssignmentLog: { $arrayElemAt: [{ $ifNull: ['$assignmentLogs', []] }, -1] },
      },
    },
    {
      $addFields: {
        assignmentToUserIdStr: { $toString: { $ifNull: ['$latestAssignmentLog.toUserId', ''] } },
        currentHolderUserIdStr: { $toString: { $ifNull: ['$currentHolder.userId', ''] } },
        assignmentToRole: { $toLower: { $ifNull: ['$latestAssignmentLog.toRole', ''] } },
        currentHolderRoleKey: { $toLower: { $ifNull: ['$currentHolder.role', ''] } },
      },
    },
    ...buildLivePricingStages(goldRate, silverRate),
  ]

  if (holderUserId) {
    basePipeline.push({
      $match: {
        $or: [{ currentHolderUserIdStr: holderUserId }, { assignmentToUserIdStr: holderUserId }],
      },
    })
  } else if (holderRoleKey) {
    basePipeline.push({
      $match: {
        $or: [{ currentHolderRoleKey: holderRoleKey }, { assignmentToRole: holderRoleKey }],
      },
    })
  }

  basePipeline.push({ $sort: sort })
  basePipeline.push({
    $project: {
      latestAssignmentLog: 0,
      assignmentToUserIdStr: 0,
      currentHolderUserIdStr: 0,
      assignmentToRole: 0,
      currentHolderRoleKey: 0,
    },
  })

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
  return { data, count, page, limit, ...stats }
}
