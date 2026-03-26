import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { ApiResponse, CatchError } from '../../../utils'
import { customLog } from '../../../utils/common'
import { updateProductStatus } from '../../product/model/product.service'
import { ProductModel } from '../../product/model/product.schema'
import { createInvoice, getInvoiceById, listInvoices, updateInvoiceStatus } from '../service/invoice.service'
import { InvoiceModel } from '../model/invoice.schema'

export const createInvoiceController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const { productId, userEmail, userPhone, amount, finalPrice, type } = req.body
  const parsedFinalPrice = Number(finalPrice)
  const parsedAmount = Number(amount)
  const resolvedFinalPrice = Number.isFinite(parsedFinalPrice) ? parsedFinalPrice : parsedAmount

  if (!productId || !userEmail || !userPhone || !type || !Number.isFinite(resolvedFinalPrice)) {
    return res.status(400).json(new ApiResponse(400, { message: 'Missing required fields' }, 'Invalid input'))
  }
  const invoice = await createInvoice({
    productId,
    userEmail,
    userPhone,
    finalPrice: resolvedFinalPrice,
    type,
    requestedByEmail: `${req.user?.email || ''}`.trim() || undefined,
  })
  customLog({
    event: 'invoice.created',
    invoiceId: invoice._id.toString(),
    productId,
    userEmail,
    userPhone,
    finalPrice: resolvedFinalPrice,
    type,
  })
  return res.status(201).json(new ApiResponse(201, { invoice }, 'Invoice created successfully'))
})

export const approveInvoiceController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const invoiceId = `${req.params?.id || ''}`.trim()
  if (!invoiceId) {
    return res.status(400).json(new ApiResponse(400, { message: 'invoice id required' }, 'Invalid input'))
  }
  const session = await mongoose.startSession()
  let invoice: any
  try {
    await session.withTransaction(async () => {
      const existing = await InvoiceModel.findById(invoiceId).session(session)
      if (!existing) {
        throw new Error('Invoice not found')
      }

      const targetStatus = req.body?.forceStatus || undefined
      const isMemoInvoice = existing.type === 'memo' || existing.type === 'rent' || existing.status === 'MEMO_PENDING_PAYMENT'
      const computedStatus = 'PAID'
      const nextInvoiceStatus = (targetStatus as any) || (computedStatus as any)

      const approverEmail = `${req.user?.email || ''}`.trim() || undefined
      invoice = await updateInvoiceStatus(invoiceId, nextInvoiceStatus || 'PAID', approverEmail, session, approverEmail)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      const productId = `${invoice.productId || ''}`.trim()
      if (productId && !isMemoInvoice) {
        const product: any = await ProductModel.findById(productId).select('status').session(session)
        const currentProductStatus = `${product?.status || ''}`.trim()
        if (currentProductStatus === 'PURCHASE_PENDING_PAYMENT') {
          await updateProductStatus(productId, 'ACTIVE', session)
        }
      }
    })
  } finally {
    session.endSession()
  }

  if (!invoice) {
    return res.status(404).json(new ApiResponse(404, { message: 'Invoice not found' }, 'Not found'))
  }

  customLog({
    event: 'invoice.approved',
    invoiceId,
    productId: `${invoice.productId || ''}`.trim(),
    approvedBy: `${req.user?._id || ''}`.trim(),
    nextStatus: invoice.status,
  })

  return res.status(200).json(new ApiResponse(200, { invoice }, 'Invoice approved'))
})

export const fetchInvoiceController = CatchError(async (req: Request, res: Response) => {
  const invoiceId = `${req.params?.id || ''}`.trim()
  if (!invoiceId) {
    return res.status(400).json(new ApiResponse(400, { message: 'invoice id required' }, 'Invalid input'))
  }
  const invoice = await getInvoiceById(invoiceId)
  if (!invoice) {
    return res.status(404).json(new ApiResponse(404, { message: 'Invoice not found' }, 'Not found'))
  }
  return res.status(200).json(new ApiResponse(200, { invoice }, 'Invoice fetched successfully'))
})

export const listInvoicesController = CatchError(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status, type, userEmail } = req.body || {}
  const role = `${(req as any).user?.role || ''}`.trim().toLowerCase()
  const isPrivileged = ['super-admin', 'admin', 'accountant'].includes(role)

  const data = await listInvoices({
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    status: status || undefined,
    type: type || undefined,
    userEmail: isPrivileged ? userEmail || undefined : `${(req as any).user?.email || ''}`.trim() || undefined,
  })
  return res.status(200).json(new ApiResponse(200, data as any, 'Invoices fetched successfully'))
})
