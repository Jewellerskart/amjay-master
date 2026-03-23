import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { ApiResponse, CatchError, preDataProcess } from '../../../utils'
import { InventoryRequestStatus, InventoryUsageChoice } from '../type/inventory'
import {
  assignProductToJeweler,
  createInventoryRequest,
  getInventoryRequestById,
  listAvailableProducts,
  listInventory,
  listInventoryRequests,
  updateInventoryRequestStatus,
} from '../service/inventory.service'
import { MetalLiveRate, MetalRates } from '../../product/controller/product.helper'
import { ProductModel } from '../../product/model/product.schema'

const getUserId = (req: Request & { user?: any }) => `${req.user?._id || ''}`.trim()
const getUserRole = (req: Request & { user?: any }) => `${req.user?.role || ''}`.trim().toLowerCase()
const defaultMetalRates: MetalRates = { GoldRate: 0, SilverRate: 0 }
const getLiveRatesSafe = async (): Promise<MetalRates> => {
  try {
    return await MetalLiveRate()
  } catch {
    return defaultMetalRates
  }
}

export const createInventoryRequestController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const userId = getUserId(req)
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
  }

  let styleCode = `${req.body?.styleCode || ''}`.trim().toUpperCase()
  const jewelCode = `${req.body?.jewelCode || ''}`.trim()
  const productIdRaw = `${req.body?.productId || ''}`.trim()
  const hexMatcher = /[a-f\d]{24}/i
  const fallbackId =
    productIdRaw || hexMatcher.exec(`${req.body?.remark || ''}`)?.[0] || hexMatcher.exec(`${req.body?.preferredUsageNote || ''}`)?.[0] || ''

  if (!styleCode && jewelCode) {
    const product = await ProductModel.findOne({ 'product.jewelCode': jewelCode }).select('product.styleCode')
    if (product?.product?.styleCode) {
      styleCode = `${product.product.styleCode}`.trim().toUpperCase()
    }
  }

  if (!styleCode && fallbackId && mongoose.Types.ObjectId.isValid(fallbackId)) {
    const product = await ProductModel.findById(fallbackId).select('product.styleCode')
    if (product?.product?.styleCode) {
      styleCode = `${product.product.styleCode}`.trim().toUpperCase()
    }
  }

  if (!styleCode) {
    return res.status(400).json(new ApiResponse(400, { message: 'styleCode is required' }, 'Invalid input'))
  }

  const payload = {
    requestedBy: userId,
    styleCode,
    requiredProducts: req.body?.requiredProducts || 1,
    usageChoice: req.body.usageChoice as InventoryUsageChoice,
    preferredUsageNote: req.body?.preferredUsageNote,
    remark: req.body?.remark,
  }
  const request = await createInventoryRequest(payload)
  return res.status(201).json(new ApiResponse(201, { request }, 'Inventory request created successfully'))
})

export const listInventoryRequestsController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const userId = getUserId(req)
  const role = getUserRole(req)
  const { page, limit } = preDataProcess(req)
  const status = `${req.body?.status || ''}`.trim().toUpperCase() as InventoryRequestStatus
  const requestedBy = `${req.body?.requestedBy || ''}`.trim()
  const styleCode = `${req.body?.styleCode || ''}`.trim().toUpperCase()

  if (requestedBy && !['admin', 'super-admin', 'distributor'].includes(role)) {
    return res.status(403).json(new ApiResponse(403, { message: 'Not authorized to filter by requestedBy' }, 'Forbidden'))
  }

  const targetRequestedBy = requestedBy && requestedBy.length ? requestedBy : role === 'jeweler' ? userId : undefined

  const data = await listInventoryRequests({
    page,
    limit,
    status: status || undefined,
    requestedBy: targetRequestedBy,
    styleCode: styleCode || undefined,
  })

  return res.status(200).json(new ApiResponse(200, data as any, 'Inventory requests fetched successfully'))
})

export const getInventoryRequestController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const userId = getUserId(req)
  const role = getUserRole(req)
  const requestId = `${req.params?.id || ''}`.trim()
  if (!requestId) {
    return res.status(400).json(new ApiResponse(400, { message: 'request id required' }, 'Invalid input'))
  }
  const request = await getInventoryRequestById(requestId)
  if (!request) {
    return res.status(404).json(new ApiResponse(404, { message: 'Request not found' }, 'Not found'))
  }
  if (role === 'jeweler' && request.requestedBy.toString() !== userId) {
    return res.status(403).json(new ApiResponse(403, { message: 'Forbidden' }, 'Forbidden'))
  }
  return res.status(200).json(new ApiResponse(200, { request }, 'Inventory request fetched successfully'))
})

export const updateInventoryRequestStatusController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const requestId = `${req.params?.id || ''}`.trim()
  if (!requestId) {
    return res.status(400).json(new ApiResponse(400, { message: 'request id required' }, 'Invalid input'))
  }
  const status = `${req.body?.status || ''}`.trim().toUpperCase() as InventoryRequestStatus
  if (!status) {
    return res.status(400).json(new ApiResponse(400, { message: 'status required' }, 'Invalid input'))
  }
  const updated = await updateInventoryRequestStatus(requestId, status, {
    remark: req.body?.remark,
  })
  if (!updated) {
    return res.status(404).json(new ApiResponse(404, { message: 'Request not found' }, 'Not found'))
  }
  return res.status(200).json(new ApiResponse(200, { request: updated }, 'Inventory request updated'))
})

export const assignProductController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const user = req.user
  const userId = `${user?._id || ''}`.trim()
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
  }

  const { productId, jewelerId, usageChoice, amount, remark } = req.body
  const requestId = `${req.params?.id || req.body?.requestId || ''}`.trim()
  if (!requestId) {
    return res.status(400).json(new ApiResponse(400, { message: 'request id required' }, 'Invalid input'))
  }
  const assignedByName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Inventory Manager'
  const role = `${user?.role || ''}`.trim().toLowerCase()

  const result = await assignProductToJeweler({
    productId,
    jewelerId,
    usageChoice: usageChoice as InventoryUsageChoice,
    assignedBy: userId,
    assignedByName,
    assignedByRole: role,
    amount,
    requestId,
    remark,
  })

  return res.status(200).json(new ApiResponse(200, result, 'Product assigned to jeweler successfully'))
})

export const listAvailableProductsController = CatchError(async (req: Request, res: Response) => {
  const { page, limit } = preDataProcess(req)
  const styleCode = `${req.body?.styleCode || ''}`.trim().toUpperCase()
  const includeAssignments = typeof req.body?.includeAssignments === 'boolean' ? req.body.includeAssignments : !!styleCode
  const data = await listAvailableProducts(limit, page, { styleCode, includeAssignments })
  return res.status(200).json(new ApiResponse(200, data as any, 'Available products fetched successfully'))
})

export const listInventoryController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const { page, limit } = preDataProcess(req)
  const role = getUserRole(req)
  const userId = getUserId(req)

  const bodyHolderRole = `${req.body?.holderRole || ''}`.trim().toLowerCase()
  const bodyHolderUserId = `${req.body?.currentHolderUserId || ''}`.trim()
  const holderRole = role === 'jeweler' ? 'jeweler' : bodyHolderRole || 'jeweler'
  const currentHolderUserId = role === 'jeweler' ? userId : bodyHolderUserId

  const rates = await getLiveRatesSafe()
  const data = await listInventory(
    {
      page,
      limit,
      ...(req.body || {}),
      holderRole,
      currentHolderUserId,
    },
    rates
  )
  return res.status(200).json(new ApiResponse(200, data as any, 'Inventory fetched successfully'))
})
