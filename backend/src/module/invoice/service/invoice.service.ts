import { ClientSession } from 'mongoose'
import { InvoiceModel } from '../model/invoice.schema'
import { IInvoice, InvoiceStatus, InvoiceType } from '../type/invoice'
import { customLog } from '../../../utils/common'
import { ProductModel } from '../../product/model/product.schema'

export const createInvoice = async (
  payload: {
    productId: string
    userEmail: string
    userPhone: string
    amount: number
    type: InvoiceType
    status?: InvoiceStatus
    requestedByEmail?: string
  },
  session?: ClientSession
): Promise<any> => {
  const trimmedEmail = `${payload.userEmail || ''}`.trim()
  const trimmedPhone = `${payload.userPhone || ''}`.trim()
  const safeAmount = Number(payload.amount)
  const missing: string[] = []
  if (!payload.productId) missing.push('productId')
  if (!payload.type) missing.push('type')
  if (!Number.isFinite(safeAmount)) missing.push('amount')
  if (!trimmedEmail) missing.push('userEmail')
  if (!trimmedPhone) missing.push('userPhone')

  if (missing.length) {
    customLog({
      event: 'invoice.create.missing-fields',
      missing,
      payloadKeys: Object.keys(payload || {}),
    })
    const error = new Error(`Missing required invoice fields: ${missing.join(', ')}`)
    ;(error as any).status_code = 400
    throw error
  }

  customLog({
    event: 'invoice.create.attempt',
    productId: payload.productId,
    type: payload.type,
    amount: safeAmount,
    hasEmail: !!trimmedEmail,
    hasPhone: !!trimmedPhone,
  })

  try {
    const productSnapshot = payload.productId ? await ProductModel.findById(payload.productId).lean() : null
    const liveRateAtCreation = productSnapshot?.saleAmount ?? productSnapshot?.cost?.totalCost ?? safeAmount

    const created = await InvoiceModel.create(
      [
        {
          productId: payload.productId,
          userEmail: trimmedEmail,
          userPhone: trimmedPhone,
          amount: safeAmount,
          type: payload.type,
          requestedByEmail: payload.requestedByEmail || null,
          status: payload.status || (payload.type === 'rent' ? 'RENTED' : 'PURCHASE_PENDING_PAYMENT'),
          productSnapshot: productSnapshot || null,
          liveRateAtCreation,
        },
      ],
      { session }
    )
    return Array.isArray(created) ? created[0] : (created as any)
  } catch (error: any) {
    customLog({
      event: 'invoice.create.error',
      message: error?.message || 'unknown',
      productId: payload.productId,
      type: payload.type,
      amount: safeAmount,
      hasEmail: !!trimmedEmail,
      hasPhone: !!trimmedPhone,
    })
    throw error
  }
}

export const updateInvoiceStatus = async (
  invoiceId: string,
  status: InvoiceStatus,
  approvedByEmail?: string,
  session?: ClientSession,
  paidByEmail?: string
): Promise<any> => {
  const payload: any = { status, approvedByEmail: approvedByEmail || null }
  if (status === 'PAID') {
    payload.paidAt = new Date()
    payload.paidByEmail = paidByEmail || approvedByEmail || null
  }
  return InvoiceModel.findByIdAndUpdate(invoiceId, payload, { new: true, session })
}

export const getInvoiceById = async (invoiceId: string): Promise<IInvoice | null> => {
  return InvoiceModel.findById(invoiceId)
}

export const listInvoices = async (params: {
  page?: number
  limit?: number
  status?: InvoiceStatus
  type?: InvoiceType
  userEmail?: string
}) => {
  const { page = 1, limit = 20, status, type, userEmail } = params as any
  const query: any = {}
  if (status) query.status = status
  if (type) query.type = type
  if (userEmail) query.userEmail = userEmail

  const [data, count, totals] = await Promise.all([
    InvoiceModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InvoiceModel.countDocuments(query),
    InvoiceModel.aggregate([
      { $match: query },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]),
  ])

  const productIds = Array.from(new Set(data.map((inv: any) => `${inv.productId || ''}`).filter(Boolean)))
  const products = productIds.length
    ? await ProductModel.find({ _id: { $in: productIds } })
        .select('product category subCategory image status')
        .lean()
    : []
  const productMap = new Map(products.map((p: any) => [`${p._id}`, p]))

  const dataWithProduct = data.map((inv: any) => ({
    ...inv,
    product: productMap.get(`${inv.productId || ''}`) || inv.productSnapshot || null,
  }))

  const totalAmount = totals?.[0]?.totalAmount || 0

  return { data: dataWithProduct, count, page, limit, totalAmount }
}
