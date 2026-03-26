import mongoose from 'mongoose'
import { Request, Response } from 'express'
import { ApiResponse, CatchError } from '../../../utils'
import {
  createProduct,
  deleteProductById,
  deleteProductsByIds,
  getProductById,
  getProductByIdentifier,
  getProductLivePricingById,
  listProducts,
  listMarketplaceProducts,
  rejectAssignedProduct,
  acceptAssignedProduct,
  updateProductById,
  GetProductFilters,
} from '../model/product.service'
import { sanitizeProductPayload } from '../model/product.sanitize'
import { UserModel } from '../../auth/model/auth.schema'
import { ProductModel } from '../model/product.schema'
import { MetalLiveRate, normalizeRole, processBulkImport } from './product.helper'
import { buildLivePricingStages, type MetalRates } from '../utils/pricing'
import XLSX from 'xlsx'

const canCreateProduct = (role?: string) => ['super-admin', 'admin', 'distributor', 'jeweler'].includes(`${role || ''}`.trim().toLowerCase())

const canAssignProduct = (role?: string) => ['super-admin', 'admin', 'distributor'].includes(`${role || ''}`.trim().toLowerCase())

const isAdminRole = (role?: string) => ['super-admin', 'admin'].includes(`${role || ''}`.trim().toLowerCase())

const sanitizeProductByRole = (product: any, role?: string) => {
  const safe: any = typeof product?.toObject === 'function' ? product.toObject() : { ...product }
  if (role === 'jeweler') {
    delete safe.currentHolder
    delete safe.assignmentLogs
    if (safe?.uploadedBy) {
      delete safe.uploadedBy.userId
      delete safe.uploadedBy.businessName
    }
  } else if (!isAdminRole(role)) {
    if (safe?.uploadedBy) safe.uploadedBy.businessName = ''
    if (safe?.currentHolder) safe.currentHolder.businessName = ''
    if (Array.isArray(safe?.assignmentLogs)) {
      safe.assignmentLogs = safe.assignmentLogs.map((log: any) => ({ ...log, fromBusinessName: '', toBusinessName: '' }))
    }
  }
  return safe
}

const defaultMetalRates: MetalRates = { GoldRate: 0, SilverRate: 0 }
const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const qtyExpr = { $convert: { input: { $ifNull: ['$qty', { $ifNull: ['$product.qty', 0] }] }, to: 'double', onError: 0, onNull: 0 } }
const finalPriceExpr = { $convert: { input: { $ifNull: ['$finalPrice', 0] }, to: 'double', onError: 0, onNull: 0 } }

const getTotalAmountWithGst = async (basePipeline: any[], liveRates: MetalRates) => {
  const goldRate = Number(liveRates?.GoldRate || 0)
  const silverRate = Number(liveRates?.SilverRate || 0)
  const rows = await ProductModel.aggregate([
    ...basePipeline,
    ...buildLivePricingStages(goldRate, silverRate),
    { $group: { _id: null, totalAmount: { $sum: { $multiply: [qtyExpr, finalPriceExpr] } } } },
  ])
  return Number(rows?.[0]?.totalAmount || 0)
}

const getAssignProductAmount = async (product: any, liveRates: MetalRates) => {
  const idValue = `${product?._id || ''}`.trim()
  if (!idValue || !mongoose.Types.ObjectId.isValid(idValue)) return 0
  return getTotalAmountWithGst([{ $match: { _id: new mongoose.Types.ObjectId(idValue) } }], liveRates)
}

const getJewelerHeldProductAmount = async (jewelerId: string, liveRates: MetalRates) => {
  const basePipeline = [
    { $match: { status: { $ne: 'SOLD' } } },
    { $addFields: { latestAssignmentLog: { $arrayElemAt: [{ $ifNull: ['$assignmentLogs', []] }, -1] } } },
    {
      $addFields: {
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
    { $match: { effectiveHolderUserId: jewelerId } },
  ]

  return getTotalAmountWithGst(basePipeline, liveRates)
}

const buildAssignPreview = async (product: any, jeweler: any) => {
  const liveRates = await getLiveRatesSafe()
  const creditLimit = Math.max(0, toFiniteNumber(jeweler?.creditLimit, 0))
  const walletBalance = Math.max(0, toFiniteNumber(jeweler?.walletBalance, 0))
  const currentProductAmount = await getJewelerHeldProductAmount(`${jeweler?._id || ''}`, liveRates)
  const assignProductAmount = await getAssignProductAmount(product, liveRates)
  const projectedProductAmount = Number((currentProductAmount + assignProductAmount).toFixed(2))
  const thresholdAmount = Number((creditLimit * 0.75).toFixed(2))
  const utilizationPercent = creditLimit > 0 ? Number(((projectedProductAmount / creditLimit) * 100).toFixed(2)) : 0
  const canAssignForLimit = creditLimit > 0 && projectedProductAmount <= thresholdAmount
  const reason = canAssignForLimit
    ? 'Assignment allowed'
    : creditLimit <= 0
      ? 'Credit limit is not set for this jeweler'
      : `Projected product amount exceeds 75% of credit limit (${utilizationPercent}%)`

  return {
    creditLimit,
    walletBalance,
    currentProductAmount: Number(currentProductAmount.toFixed(2)),
    assignProductAmount,
    projectedProductAmount,
    gstPercent: 3,
    thresholdPercent: 75,
    thresholdAmount,
    utilizationPercent,
    canAssignForLimit,
    reason,
  }
}

const getLiveRatesSafe = async (): Promise<MetalRates> => {
  try {
    const rates = await MetalLiveRate()
    return {
      GoldRate: Number(rates?.GoldRate ?? 0) || 0,
      SilverRate: Number(rates?.SilverRate ?? 0) || 0,
    }
  } catch (error) {
    return defaultMetalRates
  }
}

export const createProductController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const user = req.user
  if (!canCreateProduct(user?.role)) {
    return res.status(403).json(new ApiResponse(403, { message: 'User role cannot upload product' }, 'Forbidden'))
  }

  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'
  const businessName = `${user?.businessName || ''}`.trim()
  const role = normalizeRole(user?.role)

  const created = await createProduct({
    ...sanitizeProductPayload(req.body),
    uploadedBy: { userId: user?._id, role, name, businessName, at: new Date() },
    currentHolder: {
      userId: user?._id,
      role,
      name,
      businessName,
      assignedAt: new Date(),
      assignedByUserId: user?._id,
      assignedByRole: role,
      assignedByName: name,
    },
    assignmentLogs: [
      {
        fromUserId: null,
        fromRole: role,
        fromName: name,
        fromBusinessName: businessName,
        toUserId: user?._id,
        toRole: role,
        toName: name,
        toBusinessName: businessName,
        remark: 'Default assignment at product upload',
      },
    ],
  })

  return res.status(201).json(new ApiResponse(201, {}, 'Product created successfully'))
})

export const bulkImportProductsFileController = CatchError(async (req: any, res: Response) => {
  const user = req.user
  if (!canCreateProduct(user?.role)) {
    return res.status(403).json(new ApiResponse(403, { message: 'User role cannot upload product' }, 'Forbidden'))
  }

  if (!req.file || !req.file.buffer) {
    return res.status(400).json(new ApiResponse(400, { message: 'No file provided' }, 'Invalid input'))
  }

  const format = `${req.body?.importFormat || 'default'}`.toLowerCase()
  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const items: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })

  if (!items.length) {
    return res.status(400).json(new ApiResponse(400, { message: 'No rows found in file' }, 'Invalid input'))
  }

  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'
  const businessName = `${user?.businessName || ''}`.trim()
  const role = normalizeRole(user?.role)
  const params = { items, format, user, name, businessName, role }
  const { statusCode, message, data } = await processBulkImport(params)

  return res.status(statusCode).json(new ApiResponse(statusCode, data, message))
})

export const getProductByIdController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const id = `${req.params?.id || ''}`.trim()
  const product = await getProductByIdentifier(id)
  if (!product) {
    return res.status(404).json(new ApiResponse(404, { message: 'Product not found' }, 'Not found'))
  }

  const userRole = `${req.user?.role || ''}`.trim().toLowerCase()
  const userId = `${req.user?._id || ''}`.trim()
  if (!isAdminRole(userRole)) {
    const holderRole = `${product?.currentHolder?.role || ''}`.trim().toLowerCase()
    const holderUserId = `${product?.currentHolder?.userId || ''}`.trim()
    const allowedByRole = holderRole === 'distributor' || holderRole === 'jeweler'
    const allowedByOwner = holderUserId && holderUserId === userId
    if (!allowedByRole && !allowedByOwner) {
      return res.status(403).json(new ApiResponse(403, { message: 'Not allowed' }, 'Forbidden'))
    }
  }

  const rates = await getLiveRatesSafe()
  const safeProduct = sanitizeProductByRole(product, req.user?.role)
  const stagedPricing = await getProductLivePricingById(`${safeProduct?._id || ''}`, rates)
  const productWithLivePrice = {
    ...safeProduct,
    liveMetal: stagedPricing.liveMetal,
    finalPrice: stagedPricing.finalPrice,
  }

  return res.status(200).json(new ApiResponse(200, { product: productWithLivePrice }, 'Product fetched successfully'))
})

export const listProductsController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const rates = await getLiveRatesSafe()
  const data = await listProducts({ ...(req.body || {}) }, rates)
  const products = Array.isArray((data as any)?.data) ? (data as any).data : []
  const safeProducts = products.map((product: any) => sanitizeProductByRole(product, req.user?.role))

  const { liveRates = rates, ...rest } = (data || {}) as any
  return res.status(200).json(new ApiResponse(200, { ...rest, data: safeProducts, liveRates }, 'successfully'))
})

export const listMarketplaceProductsController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const rates = await getLiveRatesSafe()
  const data = await listMarketplaceProducts({ ...(req.body || {}) }, rates)
  const groups = Array.isArray((data as any)?.data) ? (data as any).data : []
  const safeGroups = groups.map((group: any) => sanitizeProductByRole(group, req.user?.role))

  const { liveRates = rates, ...rest } = (data || {}) as any
  return res.status(200).json(new ApiResponse(200, { ...rest, data: safeGroups, liveRates }, 'successfully'))
})

export const ListProductsFilter = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const filters = await GetProductFilters()

  return res.status(200).json(new ApiResponse(200, { filters } as any, 'successfully'))
})

export const updateProductController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const id = `${req.params?.id || ''}`.trim()
  const existing = await getProductById(id)
  if (!existing) {
    return res.status(404).json(new ApiResponse(404, { message: 'Product not found' }, 'Not found'))
  }

  const userRole = `${req.user?.role || ''}`.toLowerCase()
  const userId = `${req.user?._id || ''}`.trim()
  const holderUserId = `${(existing as any)?.currentHolder?.userId || ''}`.trim()
  const canUpdate = canAssignProduct(userRole) || (userRole === 'jeweler' && holderUserId === userId)
  if (!canUpdate) {
    return res.status(403).json(new ApiResponse(403, { message: 'Not allowed to update this product' }, 'Forbidden'))
  }

  const payload: any = { ...req.body }
  if (payload.qty !== undefined || payload?.product?.qty !== undefined) {
    return res
      .status(400)
      .json(new ApiResponse(400, { message: 'Quantity update is disabled. One jewelCode has one product record.' }, 'Invalid input'))
  }

  const updated = await updateProductById(id, payload)
  if (!updated) {
    return res.status(404).json(new ApiResponse(404, { message: 'Product not found' }, 'Not found'))
  }
  const rates = await getLiveRatesSafe()
  const stagedPricing = await getProductLivePricingById(`${updated?._id || ''}`, rates)
  const baseProduct = typeof updated?.toObject === 'function' ? updated.toObject() : updated
  const productWithLivePrice = {
    ...baseProduct,
    liveMetal: stagedPricing.liveMetal,
    finalPrice: stagedPricing.finalPrice,
  }

  return res.status(200).json(new ApiResponse(200, { product: productWithLivePrice }, 'Product updated successfully'))
})

export const deleteProductController = CatchError(async (req: Request, res: Response) => {
  const id = `${req.params?.id || ''}`.trim()
  const deleted = await deleteProductById(id)
  if (!deleted) {
    return res.status(404).json(new ApiResponse(404, { message: 'Product not found' }, 'Not found'))
  }
  return res.status(200).json(new ApiResponse(200, {}, 'Product deleted successfully'))
})

export const bulkDeleteProductsController = CatchError(async (req: Request, res: Response) => {
  const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.filter((id: any) => typeof id === 'string' && id.trim()) : []
  if (!ids.length) return res.status(400).json(new ApiResponse(400, { message: 'ids array is required' }, 'Invalid input'))
  await deleteProductsByIds(ids)
  return res.status(200).json(new ApiResponse(200, { deleted: ids.length }, 'Products deleted successfully'))
})

export const assignProductToJewelerController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const user = req.user
  if (!canAssignProduct(user?.role)) {
    return res.status(403).json(new ApiResponse(403, { message: 'Only admin/distributor can assign product' }, 'Forbidden'))
  }
  const { toUserId, remark } = req.body
  const productId = `${req.params?.id || ''}`.trim()
  if (!productId || !toUserId) {
    return res.status(400).json(new ApiResponse(400, { message: 'product id and toUserId are required' }, 'Invalid input'))
  }

  const sourceProduct: any = await getProductById(productId)
  if (!sourceProduct) {
    return res.status(404).json(new ApiResponse(404, { message: 'Product not found' }, 'Not found'))
  }

  const select = '_id firstName lastName email businessName role creditLimit walletBalance'
  const jeweler: any = await UserModel.findOne({ _id: toUserId, role: 'jeweler' }).select(select).lean()
  if (!jeweler?._id) {
    return res.status(400).json(new ApiResponse(400, { message: 'Assignee must be a jeweler user' }, 'Invalid input'))
  }
  const assignPreview = await buildAssignPreview(sourceProduct, jeweler)
  if (!assignPreview.canAssignForLimit) {
    return res.status(400).json(new ApiResponse(400, assignPreview, assignPreview.reason || 'Assignment blocked by 75% limit rule'))
  }
  const assignedAt = new Date()
  const assignerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'
  const toName = `${jeweler?.firstName || ''} ${jeweler?.lastName || ''}`.trim() || jeweler?.email || ''
  const toBusinessName = `${jeweler?.businessName || ''}`.trim()
  const productDoc: any = sourceProduct

  const logs = Array.isArray(productDoc?.assignmentLogs) ? productDoc.assignmentLogs : []
  const fromHolder = productDoc?.currentHolder || {}

  productDoc.usage = { ...(productDoc?.usage || {}), type: 'pending', by: toName, date: assignedAt }
  productDoc.assignmentLogs = [
    ...logs,
    {
      fromUserId: fromHolder?.userId || null,
      fromRole: normalizeRole(fromHolder?.role),
      fromName: fromHolder?.name || '',
      fromBusinessName: fromHolder?.businessName || '',
      toUserId: jeweler?._id || null,
      toRole: 'jeweler',
      toName,
      toBusinessName,
      assignedAt,
      assignedByUserId: user?._id || null,
      assignedByRole: normalizeRole(user?.role),
      assignedByName: assignerName,
      remark: `${remark || ''}`.trim() || 'Assigned to jeweler',
    },
  ]
  await productDoc.save()

  return res.status(200).json(new ApiResponse(200, { product: productDoc, assignPreview }, 'Product assigned to jeweler successfully'))
})

export const previewAssignProductController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const user = req.user
  if (!canAssignProduct(user?.role)) {
    return res.status(403).json(new ApiResponse(403, { message: 'Only admin/distributor can preview assignment' }, 'Forbidden'))
  }

  const productId = `${req.params?.id || ''}`.trim()
  const jewelerId = `${req.params?.jewelerId || ''}`.trim()
  if (!productId || !jewelerId) {
    return res.status(400).json(new ApiResponse(400, { message: 'product id and jeweler id are required' }, 'Invalid input'))
  }

  const product: any = await getProductById(productId)
  if (!product) {
    return res.status(404).json(new ApiResponse(404, { message: 'Product not found' }, 'Not found'))
  }

  const jeweler: any = await UserModel.findOne({ _id: jewelerId, role: 'jeweler' })
    .select('_id firstName lastName email businessName creditLimit walletBalance')
    .lean()
  if (!jeweler?._id) {
    return res.status(400).json(new ApiResponse(400, { message: 'Assignee must be a jeweler user' }, 'Invalid input'))
  }

  const assignPreview = await buildAssignPreview(product, jeweler)
  return res.status(200).json(new ApiResponse(200, assignPreview, 'Assignment preview fetched successfully'))
})

export const rejectAssignedProductController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const user = req.user
  const role = `${user?.role || ''}`.trim().toLowerCase()
  if (!['super-admin', 'admin', 'distributor', 'jeweler'].includes(role)) {
    return res.status(403).json(new ApiResponse(403, { message: 'Not allowed' }, 'Forbidden'))
  }

  const assignedProductId = `${req.params?.id || ''}`.trim()
  const sourceProductId = `${req.body?.sourceProductId || ''}`.trim()
  if (!assignedProductId) {
    return res.status(400).json(new ApiResponse(400, { message: 'assigned product id is required' }, 'Invalid input'))
  }

  const performedByName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'
  await rejectAssignedProduct({
    assignedProductId,
    sourceProductId: sourceProductId || undefined,
    performedByUserId: user?._id?.toString(),
    performedByRole: role,
    performedByName,
    remark: `${req.body?.remark || ''}`.trim(),
  })

  return res.status(200).json(new ApiResponse(200, {}, 'Assignment rejected and inventory restored'))
})

export const acceptAssignedProductController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const user = req.user
  const role = `${user?.role || ''}`.trim().toLowerCase()
  const assignedProductId = `${req.params?.id || ''}`.trim()
  if (!assignedProductId) {
    return res.status(400).json(new ApiResponse(400, { message: 'assigned product id is required' }, 'Invalid input'))
  }

  const performedByName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'
  const requestedMode = `${req.body?.mode || ''}`.trim().toLowerCase()
  const mode = requestedMode === 'memo' || requestedMode === 'rent' ? (requestedMode as 'memo' | 'rent') : 'outright'

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      await acceptAssignedProduct(
        {
          assignedProductId,
          performedByUserId: user?._id?.toString(),
          performedByRole: role,
          performedByName,
          performedByEmail: `${user?.email || ''}`.trim(),
          performedByPhone: `${user?.phone || ''}`.trim(),
          mode,
          remark: `${req.body?.remark || ''}`.trim(),
        },
        session
      )
    })
  } finally {
    session.endSession()
  }

  return res.status(200).json(new ApiResponse(200, {}, 'Assignment accepted'))
})

export const exportProductsController = CatchError(async (req: Request, res: Response) => {
  const { page, limit, ...filters } = req.body || {}
  const data: any = await listProducts({ page: 1, limit: Math.max(10000, Number(limit) || 10000), ...filters, includeAssignedClones: true })
  const rows = Array.isArray(data?.data) ? data.data : []

  const sheetData = [
    [
      'Jewel Code',
      'Trans No',
      'Style Code',
      'Qty',
      'Gross Wt',
      'Net Wt',
      'Pure Wt',
      'Old Pure Wt',
      'Diamond Pcs',
      'Diamond Wt',
      'Diamond Amount',
      'HOID',
      'Certification No',
    ],
    ...rows.map((p: any) => [
      p?.product?.jewelCode || '',
      p?.product?.transNo || '',
      p?.product?.styleCode || '',
      p?.qty || p?.product?.qty || 0,
      p?.weight?.grossWeight || 0,
      p?.weight?.netWeight || 0,
      p?.weight?.pureWeight || 0,
      p?.weight?.oldPureWeight || 0,
      p?.diamond?.pieces || 0,
      p?.diamond?.weight || 0,
      p?.cost?.diamondValue || 0,
      p?.product?.HOID || '',
      p?.product?.CertificationNo || '',
    ]),
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename=\"products.xlsx\"')
  return res.status(200).send(buffer)
})

export const sampleProductsExportController = CatchError(async (_req: Request, res: Response) => {
  const sheetData = [
    [
      'Jewel Code',
      'Trans No',
      'Style Code',
      'Qty',
      'Gross Wt',
      'Net Wt',
      'Pure Wt',
      'Old Pure Wt',
      'Diamond Pcs',
      'Diamond Wt',
      'Diamond Amount',
      'HOID',
      'Certification No',
    ],
  ]
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename=\"products-sample.xlsx\"')
  return res.status(200).send(buffer)
})
