import { ClientSession } from 'mongoose'
import { InvoiceModel } from '../model/invoice.schema'
import { IInvoice, IInvoiceCommissionComponent, InvoiceStatus, InvoiceType } from '../type/invoice'
import { customLog } from '../../../utils/common'
import { ProductModel } from '../../product/model/product.schema'

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const round2 = (value: number) => Number(value.toFixed(2))

const sanitizeCommissionBreakdown = (value: unknown): IInvoiceCommissionComponent[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      const componentKey = `${item?.componentKey || ''}`.trim().toLowerCase()
      if (!componentKey) return null
      const baseAmount = round2(Math.max(0, toFiniteNumber(item?.baseAmount, 0)))
      const rate = round2(Math.max(0, toFiniteNumber(item?.rate, 0)))
      const deductionAmount = round2(Math.max(0, toFiniteNumber(item?.deductionAmount, 0)))
      return { componentKey, baseAmount, rate, deductionAmount }
    })
    .filter(Boolean) as IInvoiceCommissionComponent[]
}

export const createInvoice = async (
  payload: {
    productId: string
    userEmail: string
    userPhone: string
    amount?: number
    finalPrice?: number
    grossAmount?: number
    taxAmount?: number
    taxPercent?: number
    commissionTotal?: number
    commissionBreakdown?: IInvoiceCommissionComponent[]
    type: InvoiceType
    status?: InvoiceStatus
    requestedByEmail?: string
  },
  session?: ClientSession
): Promise<any> => {
  const trimmedEmail = `${payload.userEmail || ''}`.trim()
  const trimmedPhone = `${payload.userPhone || ''}`.trim()
  const fallbackAmount = toFiniteNumber(payload.amount, NaN)
  const payloadFinalPrice = Number(payload.finalPrice)
  const payloadGrossAmount = Number(payload.grossAmount)
  const payloadTaxAmount = Number(payload.taxAmount)
  const payloadTaxPercent = Number(payload.taxPercent)
  const commissionTotal = round2(Math.max(0, toFiniteNumber(payload.commissionTotal, 0)))
  const commissionBreakdown = sanitizeCommissionBreakdown(payload.commissionBreakdown)
  const missing: string[] = []
  if (!payload.productId) missing.push('productId')
  if (!payload.type) missing.push('type')
  if (!Number.isFinite(payloadFinalPrice) && !Number.isFinite(fallbackAmount)) missing.push('finalPrice')
  if (!trimmedEmail) missing.push('userEmail')
  if (!trimmedPhone) missing.push('userPhone')

  if (missing.length) {
    const error = new Error(`Missing required invoice fields: ${missing.join(', ')}`)
    ;(error as any).status_code = 400
    throw error
  }

  try {
    const productSnapshot = payload.productId ? await ProductModel.findById(payload.productId).lean() : null
    const snapshotSaleAmount = Number(productSnapshot?.saleAmount)
    const snapshotTotalCost = Number(productSnapshot?.cost?.totalCost)

    const resolvedFinalPrice = Number.isFinite(payloadFinalPrice)
      ? payloadFinalPrice
      : Number.isFinite(snapshotSaleAmount)
        ? snapshotSaleAmount
        : Number.isFinite(snapshotTotalCost)
          ? snapshotTotalCost
          : fallbackAmount
    const resolvedGrossAmount = Number.isFinite(payloadGrossAmount) ? payloadGrossAmount : resolvedFinalPrice
    const resolvedTaxableAmount = Math.max(0, resolvedGrossAmount + commissionTotal)
    const resolvedTaxAmount = Number.isFinite(payloadTaxAmount)
      ? Math.max(0, payloadTaxAmount)
      : Number.isFinite(payloadFinalPrice)
        ? Math.max(0, payloadFinalPrice - resolvedTaxableAmount)
        : 0
    const resolvedPayableAmount = Number.isFinite(fallbackAmount)
      ? Math.max(0, fallbackAmount)
      : Math.max(0, resolvedTaxableAmount + resolvedTaxAmount)
    const resolvedTaxPercent = Number.isFinite(payloadTaxPercent)
      ? Math.max(0, payloadTaxPercent)
      : resolvedTaxableAmount > 0
        ? round2((resolvedTaxAmount / resolvedTaxableAmount) * 100)
        : 3

    if (!Number.isFinite(resolvedFinalPrice) || !Number.isFinite(resolvedGrossAmount) || !Number.isFinite(resolvedPayableAmount)) {
      const error = new Error('Unable to resolve finalPrice for invoice')
      ;(error as any).status_code = 400
      throw error
    }

    const created = await InvoiceModel.create(
      [
        {
          productId: payload.productId,
          userEmail: trimmedEmail,
          userPhone: trimmedPhone,
          amount: round2(resolvedPayableAmount),
          grossAmount: round2(resolvedGrossAmount),
          taxAmount: round2(resolvedTaxAmount),
          taxPercent: round2(resolvedTaxPercent),
          commissionTotal,
          commissionBreakdown,
          type: payload.type,
          requestedByEmail: payload.requestedByEmail || null,
          status: payload.status || (payload.type === 'memo' || payload.type === 'rent' ? 'MEMO_PENDING_PAYMENT' : 'PURCHASE_PENDING_PAYMENT'),
          productSnapshot: productSnapshot || null,
          liveRateAtCreation: round2(resolvedFinalPrice),
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
      finalPrice: Number.isFinite(payloadFinalPrice) ? payloadFinalPrice : Number.isFinite(payloadGrossAmount) ? payloadGrossAmount : fallbackAmount,
      commissionTotal,
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

export const listInvoices = async (params: { page?: number; limit?: number; status?: InvoiceStatus; type?: InvoiceType; userEmail?: string }) => {
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
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalGrossAmount: { $sum: { $ifNull: ['$grossAmount', '$amount'] } },
          totalTaxAmount: { $sum: { $ifNull: ['$taxAmount', 0] } },
          totalCommissionTotal: { $sum: { $ifNull: ['$commissionTotal', 0] } },
        },
      },
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
  const totalGrossAmount = totals?.[0]?.totalGrossAmount || 0
  const totalTaxAmount = totals?.[0]?.totalTaxAmount || 0
  const totalCommissionTotal = totals?.[0]?.totalCommissionTotal || 0

  return { data: dataWithProduct, count, page, limit, totalAmount, totalGrossAmount, totalTaxAmount, totalCommissionTotal }
}
