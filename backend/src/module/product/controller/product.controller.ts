import { Request, Response } from 'express'
import { ApiResponse, CatchError } from '../../../utils'
import {
  cloneAndAssignProduct,
  createProduct,
  deleteProductById,
  deleteProductsByIds,
  getProductById,
  getProductByIdentifier,
  listProducts,
  rejectAssignedProduct,
  acceptAssignedProduct,
  updateProductById,
  GetProductFilters,
} from '../model/product.service'
import { sanitizeProductPayload } from '../model/product.sanitize'
import { UserModel } from '../../auth/model/auth.schema'
import { MetalLiveRate, MetalRates, normalizeRole, processBulkImport } from './product.helper'
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

const applyLivePricing = (product: any, rates: MetalRates) => {
  const base = typeof product?.toObject === 'function' ? product.toObject() : { ...product }
  const metal = `${base?.material?.baseMetal || ''}`.toLowerCase()
  const rate = metal.includes('silver') ? Number(rates?.SilverRate || 0) : Number(rates?.GoldRate || 0)
  const pureWeight = Number(base?.weight?.pureWeight || 0)
  const liveMetal = pureWeight * rate
  const finalPrice = Number(base?.cost?.totalCost || 0) + liveMetal
  return { ...base, liveMetal, finalPrice }
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
  const productWithLivePrice = applyLivePricing(safeProduct, rates)

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

  // Keep qty in sync at both root level and nested product payload for aggregations.
  const payload: any = { ...req.body }
  const nextQty = req.body?.product?.qty
  if (nextQty !== undefined) {
    payload.qty = nextQty
  }

  const updated = await updateProductById(id, payload)
  if (!updated) {
    return res.status(404).json(new ApiResponse(404, { message: 'Product not found' }, 'Not found'))
  }
  const rates = await getLiveRatesSafe()
  const productWithLivePrice = applyLivePricing(updated, rates)

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
  const { toUserId, quantity } = req.body
  const productId = `${req.params?.id || ''}`.trim()
  if (!productId || !toUserId) {
    return res.status(400).json(new ApiResponse(400, { message: 'product id and toUserId are required' }, 'Invalid input'))
  }
  const sourceProduct: any = await getProductById(productId)
  const hasDiamondAmount = Array.isArray((sourceProduct as any)?.components)
    ? (sourceProduct as any).components.some((c: any) => c?.type === 'diamond' && Number(c?.amount || 0) !== 0)
    : false
  if (hasDiamondAmount) {
    return res
      .status(400)
      .json(new ApiResponse(400, { message: 'Product with diamond amount cannot be assigned until amount is cleared (0)' }, 'Invalid input'))
  }
  if (Number((sourceProduct as any)?.cost?.diamondValue || 0) !== 0) {
    return res.status(400).json(new ApiResponse(400, { message: 'Diamond amount must be 0 before assignment' }, 'Invalid input'))
  }
  const availableQty = Number(sourceProduct?.qty ?? sourceProduct?.product?.qty ?? 0)
  if (!Number.isFinite(availableQty) || availableQty <= 0) {
    return res.status(400).json(new ApiResponse(400, { message: 'No quantity available to assign' }, 'Invalid input'))
  }
  const select = '_id firstName lastName email businessName role'
  const jeweler: any = await UserModel.findOne({ _id: toUserId, role: 'jeweler' }).select(select).lean()
  if (!jeweler?._id) {
    return res.status(400).json(new ApiResponse(400, { message: 'Assignee must be a jeweler user' }, 'Invalid input'))
  }
  const updated = await cloneAndAssignProduct({ productId, jeweler, user, quantity }, undefined)

  if (!updated) {
    return res.status(404).json(new ApiResponse(404, { message: 'Product not found' }, 'Not found'))
  }

  return res.status(200).json(new ApiResponse(200, {}, 'Product assigned to jeweler successfully'))
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

  await acceptAssignedProduct({
    assignedProductId,
    performedByUserId: user?._id?.toString(),
    performedByRole: role,
    performedByName,
    performedByEmail: `${user?.email || ''}`.trim(),
    performedByPhone: `${user?.phone || ''}`.trim(),
    mode: req.body?.mode === 'rent' ? 'rent' : 'outright',
    remark: `${req.body?.remark || ''}`.trim(),
  })

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
      p?.product?.qty || p?.qty || 0,
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
