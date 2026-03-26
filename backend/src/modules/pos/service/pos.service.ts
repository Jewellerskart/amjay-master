import mongoose from 'mongoose'
import { assignProductHolder, findNextAvailableProduct, getProductById, updateProductStatus } from '../../product/model/product.service'
import { ProductModel } from '../../product/model/product.schema'
import { createInvoice } from '../../invoice/service/invoice.service'
import { InvoiceModel } from '../../invoice/model/invoice.schema'
import { OrderTransactionModel } from '../model/orderTransaction.schema'
import { createTicket } from '../../ticket/service/ticket.service'
import { UserModel } from '../../auth/model/auth.schema'
import { calculateCommissionForSale, getUserCommissionConfig } from '../../commission/service/commission-calculator'
import { customLog } from '../../../utils/common'
import { sendDynamicEmail } from '../../../config/mail'
import { AutoAssignFailureMailTemplate } from '../../../mails-temp'

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const round2 = (value: number) => Number(value.toFixed(2))

const normalizeRole = (value: unknown) => `${value || ''}`.trim().toLowerCase()

const canViewGlobalPosReport = (role: string) => ['super-admin', 'admin', 'accountant', 'purchase'].includes(role)

const parseObjectId = (value: string) => (mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null)
const toCleanString = (value: unknown) => `${value || ''}`.trim()
const canAutoAssignForJeweler = async (jewelerId: string) => {
  if (!mongoose.Types.ObjectId.isValid(jewelerId)) return false
  const user = await UserModel.findById(jewelerId).select('role creditLimit walletBalance').lean()
  if (!user || normalizeRole(user.role) !== 'jeweler') return false
  const availableLimit = Math.max(0, toFiniteNumber(user.creditLimit, 0)) + Math.max(0, toFiniteNumber(user.walletBalance, 0))
  return availableLimit > 0
}

export const processSale = async (payload: {
  productId: string
  jewelerId: string
  salePrice: number
  choice: 'PURCHASE' | 'MEMO' | 'RENT'
  soldBy: string
}) => {
  const session = await mongoose.startSession()
  let invoice: any
  const product = await getProductById(payload.productId)
  if (!product) throw new Error('Product not found')

  const normalizedChoice = payload.choice === 'RENT' ? 'MEMO' : payload.choice
  const currentStatus = `${product.status || ''}`.trim()

  if (normalizedChoice === 'PURCHASE' && !['ACTIVE', 'PURCHASE_PENDING_PAYMENT'].includes(currentStatus)) {
    const error = new Error('Outright product must be ACTIVE or PURCHASE_PENDING_PAYMENT before it can be sold')
    ;(error as any).status_code = 400
    throw error
  }
  if (normalizedChoice === 'MEMO' && currentStatus !== 'RENTED') {
    const error = new Error('Product must be RENTED before it can be sold via memo')
    ;(error as any).status_code = 400
    throw error
  }

  const jeweler = await UserModel.findById(payload.jewelerId).select(
    'firstName lastName email phone businessName role commissionRate commissionConfig'
  )
  if (!jeweler) throw new Error('Jeweler not found')

  try {
    await session.withTransaction(async () => {
      if (normalizedChoice === 'PURCHASE') {
        const existingPurchaseInvoice: any = await InvoiceModel.findOne({
          productId: payload.productId,
          userEmail: `${jeweler.email || ''}`.trim().toLowerCase(),
          type: 'purchase',
          status: { $in: ['PURCHASE_PENDING_PAYMENT', 'ACTIVE', 'PAID'] },
        })
          .sort({ createdAt: -1 })
          .session(session)

        if (!existingPurchaseInvoice) {
          const error = new Error('Purchase invoice required before selling outright product')
          ;(error as any).status_code = 409
          throw error
        }
        invoice = existingPurchaseInvoice
      } else {
        const requestedSalePrice = round2(Math.max(0, toFiniteNumber(payload.salePrice, 0)))
        const productSnapshot = typeof product?.toObject === 'function' ? product.toObject() : product
        const commissionConfig = getUserCommissionConfig(jeweler as any)
        const commissionCalculation = calculateCommissionForSale({
          product: productSnapshot,
          grossAmount: requestedSalePrice,
          config: commissionConfig,
        })

        invoice = await createInvoice(
          {
            productId: payload.productId,
            userEmail: `${jeweler.email || ''}`,
            userPhone: `${jeweler.phone || ''}`,
            finalPrice: commissionCalculation.grossAmount,
            amount: commissionCalculation.payableAmount,
            commissionTotal: commissionCalculation.totalDeduction,
            commissionBreakdown: commissionCalculation.breakdown,
            type: 'memo',
            status: 'MEMO_PENDING_PAYMENT',
          },
          session
        )
      }

      const transactionAmount = round2(Math.max(0, toFiniteNumber(invoice?.amount, payload.salePrice)))
      const transactionGrossAmount = round2(
        Math.max(0, toFiniteNumber(invoice?.grossAmount, toFiniteNumber(invoice?.liveRateAtCreation, payload.salePrice)))
      )

      await updateProductStatus(payload.productId, 'SOLD', session)

      await OrderTransactionModel.create(
        [
          {
            productId: payload.productId,
            jewelerId: payload.jewelerId,
            invoiceId: invoice._id,
            amount: transactionAmount,
            finalPrice: transactionGrossAmount,
            choice: normalizedChoice,
            status: 'SOLD',
            soldBy: payload.soldBy,
            productSnapshot: {
              jewelCode: product?.product?.jewelCode || '',
              styleCode: product?.product?.styleCode || '',
              statusBeforeSale: currentStatus,
            },
          },
        ],
        { session }
      )
    })
  } finally {
    session.endSession()
  }

  const payableAmount = round2(Math.max(0, toFiniteNumber(invoice?.amount, payload.salePrice)))
  const grossAmount = round2(Math.max(0, toFiniteNumber(invoice?.grossAmount, toFiniteNumber(invoice?.liveRateAtCreation, payload.salePrice))))
  const commissionTotal = round2(Math.max(0, toFiniteNumber(invoice?.commissionTotal, Math.max(0, grossAmount - payableAmount))))

  customLog({
    event: normalizedChoice === 'PURCHASE' ? 'pos.invoice.linked' : 'pos.invoice.created',
    invoiceId: invoice._id.toString(),
    jewelerId: payload.jewelerId,
    productId: payload.productId,
    grossAmount,
    payableAmount,
    commissionTotal,
  })

  customLog({
    event: 'pos.sale.completed',
    invoiceId: invoice._id.toString(),
    productId: payload.productId,
    salePrice: payload.salePrice,
    payableAmount,
    commissionTotal,
    choice: normalizedChoice,
  })

  const jewelerName = `${jeweler.firstName || ''} ${jeweler.lastName || ''}`.trim() || jeweler.email || 'Jeweler'
  const jewelerBusinessName = `${jeweler.businessName || ''}`.trim()
  await autoAssignProduct(payload.jewelerId, payload.soldBy, payload.productId, jewelerName, jewelerBusinessName)

  return { invoice, product }
}

export const getPosReport = async (params: { userId?: string; userEmail?: string; role?: string; recentLimit?: number }) => {
  const normalizedRole = normalizeRole(params.role)
  const allowGlobal = canViewGlobalPosReport(normalizedRole)
  const recentLimit = Math.max(3, Math.min(25, Number(params.recentLimit || 8)))
  const userObjectId = parseObjectId(`${params.userId || ''}`.trim())
  const userEmail = `${params.userEmail || ''}`.trim().toLowerCase()

  const emptyScope = !allowGlobal && !userObjectId

  const transactionMatch: Record<string, unknown> = emptyScope ? { _id: null } : {}
  const memoMatch: Record<string, unknown> = emptyScope
    ? { _id: null }
    : {
        status: 'RENTED',
        'usage.type': { $in: ['memo', 'rented'] },
      }
  const outrightMatch: Record<string, unknown> = emptyScope
    ? { _id: null }
    : {
        status: { $in: ['ACTIVE', 'PURCHASE_PENDING_PAYMENT'] },
        'usage.type': 'outright',
      }
  const pendingInvoiceMatch: Record<string, unknown> = emptyScope
    ? { _id: null }
    : {
        status: { $in: ['PURCHASE_PENDING_PAYMENT', 'MEMO_PENDING_PAYMENT'] },
      }

  if (!allowGlobal && userObjectId) {
    transactionMatch.jewelerId = userObjectId
    memoMatch['currentHolder.userId'] = userObjectId
    outrightMatch['currentHolder.userId'] = userObjectId
    pendingInvoiceMatch.userEmail = userEmail
  }

  const [transactionSummaryRows, recentTransactionsRaw, memoSummaryRows, memoAgingRaw, activeOutrightCount, pendingRows] = await Promise.all([
    OrderTransactionModel.aggregate([
      { $match: transactionMatch },
      {
        $group: {
          _id: null,
          soldCount: { $sum: 1 },
          soldOutrightCount: { $sum: { $cond: [{ $eq: ['$choice', 'PURCHASE'] }, 1, 0] } },
          soldMemoCount: { $sum: { $cond: [{ $eq: ['$choice', 'MEMO'] }, 1, 0] } },
          totalGrossSales: { $sum: { $ifNull: ['$finalPrice', 0] } },
          totalNetPayable: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },
    ]),
    OrderTransactionModel.aggregate([
      { $match: transactionMatch },
      { $sort: { createdAt: -1 } },
      { $limit: recentLimit },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $lookup: {
          from: 'user',
          localField: 'jewelerId',
          foreignField: '_id',
          as: 'jeweler',
        },
      },
      {
        $project: {
          _id: 1,
          invoiceId: 1,
          choice: 1,
          createdAt: 1,
          amount: { $ifNull: ['$amount', 0] },
          finalPrice: { $ifNull: ['$finalPrice', '$amount'] },
          commissionDeduction: {
            $subtract: [{ $ifNull: ['$finalPrice', '$amount'] }, { $ifNull: ['$amount', 0] }],
          },
          jewelCode: {
            $ifNull: [{ $first: '$product.product.jewelCode' }, { $ifNull: ['$productSnapshot.jewelCode', '-'] }],
          },
          styleCode: {
            $ifNull: [{ $first: '$product.product.styleCode' }, { $ifNull: ['$productSnapshot.styleCode', '-'] }],
          },
          jewelerName: {
            $trim: {
              input: {
                $concat: [{ $ifNull: [{ $first: '$jeweler.firstName' }, ''] }, ' ', { $ifNull: [{ $first: '$jeweler.lastName' }, ''] }],
              },
            },
          },
          jewelerBusinessName: { $ifNull: [{ $first: '$jeweler.businessName' }, ''] },
        },
      },
    ]),
    ProductModel.aggregate([
      { $match: memoMatch },
      {
        $addFields: {
          memoSince: { $ifNull: ['$usage.date', { $ifNull: ['$currentHolder.assignedAt', '$createdAt'] }] },
        },
      },
      {
        $addFields: {
          memoDays: { $floor: { $divide: [{ $subtract: ['$$NOW', '$memoSince'] }, 86_400_000] } },
        },
      },
      {
        $group: { _id: null, activeMemoCount: { $sum: 1 }, avgMemoDays: { $avg: '$memoDays' }, maxMemoDays: { $max: '$memoDays' } },
      },
    ]),
    ProductModel.aggregate([
      { $match: memoMatch },
      {
        $addFields: {
          memoSince: { $ifNull: ['$usage.date', { $ifNull: ['$currentHolder.assignedAt', '$createdAt'] }] },
        },
      },
      {
        $addFields: {
          memoDays: { $floor: { $divide: [{ $subtract: ['$$NOW', '$memoSince'] }, 86_400_000] } },
        },
      },
      { $sort: { memoDays: -1, memoSince: 1 } },
      { $limit: recentLimit },
      {
        $project: {
          _id: 1,
          jewelCode: { $ifNull: ['$product.jewelCode', '-'] },
          styleCode: { $ifNull: ['$product.styleCode', '-'] },
          holderName: { $ifNull: ['$currentHolder.name', '-'] },
          holderBusinessName: { $ifNull: ['$currentHolder.businessName', '-'] },
          memoDays: 1,
          memoSince: 1,
        },
      },
    ]),
    ProductModel.countDocuments(outrightMatch),
    InvoiceModel.aggregate([
      { $match: pendingInvoiceMatch },
      {
        $group: {
          _id: null,
          pendingInvoiceCount: { $sum: 1 },
          pendingInvoiceAmount: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },
    ]),
  ])

  const transactionSummary = transactionSummaryRows?.[0] || {}
  const memoSummary = memoSummaryRows?.[0] || {}
  const pendingSummary = pendingRows?.[0] || {}

  const totalGrossSales = round2(toFiniteNumber(transactionSummary.totalGrossSales, 0))
  const totalNetPayable = round2(toFiniteNumber(transactionSummary.totalNetPayable, 0))
  const totalCommissionDeduction = round2(Math.max(0, totalGrossSales - totalNetPayable))

  const recentTransactions = (recentTransactionsRaw || []).map((item: any) => ({
    _id: item?._id?.toString?.() || `${item?._id || ''}`,
    invoiceId: item?.invoiceId?.toString?.() || `${item?.invoiceId || ''}`,
    choice: `${item?.choice || ''}`.toUpperCase(),
    createdAt: item?.createdAt || null,
    amount: round2(toFiniteNumber(item?.amount, 0)),
    finalPrice: round2(toFiniteNumber(item?.finalPrice, 0)),
    commissionDeduction: round2(toFiniteNumber(item?.commissionDeduction, 0)),
    jewelCode: item?.jewelCode || '-',
    styleCode: item?.styleCode || '-',
    jewelerName: item?.jewelerName || item?.jewelerBusinessName || '-',
    jewelerBusinessName: item?.jewelerBusinessName || '',
  }))

  const memoAging = (memoAgingRaw || []).map((item: any) => ({
    _id: item?._id?.toString?.() || `${item?._id || ''}`,
    jewelCode: item?.jewelCode || '-',
    styleCode: item?.styleCode || '-',
    holderName: item?.holderName || '-',
    holderBusinessName: item?.holderBusinessName || '',
    memoDays: Math.max(0, Math.floor(toFiniteNumber(item?.memoDays, 0))),
    memoSince: item?.memoSince || null,
  }))

  return {
    metrics: {
      soldCount: toFiniteNumber(transactionSummary.soldCount, 0),
      soldOutrightCount: toFiniteNumber(transactionSummary.soldOutrightCount, 0),
      soldMemoCount: toFiniteNumber(transactionSummary.soldMemoCount, 0),
      activeMemoCount: toFiniteNumber(memoSummary.activeMemoCount, 0),
      activeOutrightCount,
      avgMemoDays: round2(Math.max(0, toFiniteNumber(memoSummary.avgMemoDays, 0))),
      maxMemoDays: Math.max(0, Math.floor(toFiniteNumber(memoSummary.maxMemoDays, 0))),
      totalGrossSales,
      totalNetPayable,
      totalCommissionDeduction,
      pendingInvoiceCount: toFiniteNumber(pendingSummary.pendingInvoiceCount, 0),
      pendingInvoiceAmount: round2(toFiniteNumber(pendingSummary.pendingInvoiceAmount, 0)),
    },
    recentTransactions,
    memoAging,
  }
}

const AUTO_ASSIGN_FAILURE_REASON_LABEL: Record<string, string> = {
  'credit-limit': 'Jeweler credit limit exceeded',
  'reserve-credit': 'Unable to reserve jeweler credit',
  'assignment-error': 'System error during auto assignment',
  'no-stock': 'No stock found for same design',
  'missing-style-code': 'Sold product does not have style code',
}

const resolveDistributorFromSoldProduct = async (soldProduct: any, jewelerId: string) => {
  const jewelerIdKey = toCleanString(jewelerId)
  const logs = Array.isArray(soldProduct?.assignmentLogs) ? [...soldProduct.assignmentLogs] : []

  const matchedLog =
    [...logs].reverse().find((entry: any) => {
      if (normalizeRole(entry?.fromRole) !== 'distributor') return false
      if (normalizeRole(entry?.toRole) !== 'jeweler') return false
      const toUserId = toCleanString(entry?.toUserId)
      return !jewelerIdKey || !toUserId || toUserId === jewelerIdKey
    }) || [...logs].reverse().find((entry: any) => normalizeRole(entry?.fromRole) === 'distributor')

  let distributorId = toCleanString(matchedLog?.fromUserId)
  if (!distributorId && normalizeRole(soldProduct?.uploadedBy?.role) === 'distributor') {
    distributorId = toCleanString(soldProduct?.uploadedBy?.userId)
  }
  if (!distributorId || !mongoose.Types.ObjectId.isValid(distributorId)) return null

  const distributor = await UserModel.findById(distributorId).select('_id firstName lastName email businessName role').lean()
  if (!distributor || normalizeRole(distributor?.role) !== 'distributor') return null
  return distributor
}

const sendAutoAssignFailureMail = async (params: {
  distributor: any
  soldProduct: any
  soldProductId: string
  jewelerName: string
  jewelerBusinessName: string
  reason: string
  errorMessage?: string
}) => {
  const recipientEmail = toCleanString(params.distributor?.email).toLowerCase()
  if (!recipientEmail) return

  const distributorName =
    `${params.distributor?.firstName || ''} ${params.distributor?.lastName || ''}`.trim() ||
    params.distributor?.email ||
    params.distributor?.businessName ||
    'Distributor'
  const soldJewelCode = toCleanString(params.soldProduct?.product?.jewelCode)
  const soldStyleCode = toCleanString(params.soldProduct?.product?.styleCode)
  const reasonText = AUTO_ASSIGN_FAILURE_REASON_LABEL[params.reason] || params.reason
  const subjectTag = soldJewelCode || soldStyleCode || toCleanString(params.soldProductId)

  await sendDynamicEmail(
    recipientEmail,
    `Auto Assignment Failed${subjectTag ? ` - ${subjectTag}` : ''}`,
    {
      distributorName,
      distributorBusinessName: toCleanString(params.distributor?.businessName),
      jewelerName: params.jewelerName,
      jewelerBusinessName: params.jewelerBusinessName,
      soldProductId: toCleanString(params.soldProductId),
      soldJewelCode,
      soldStyleCode,
      reason: reasonText,
      errorMessage: toCleanString(params.errorMessage),
      occurredAt: new Date().toISOString(),
    },
    AutoAssignFailureMailTemplate
  )
}

const autoAssignProduct = async (jewelerId: string, performedBy: string, soldProductId: string, jewelerName: string, jewelerBusinessName: string) => {
  const soldProduct = await getProductById(soldProductId)
  if (!soldProduct) return

  const soldStyleCode = toCleanString(soldProduct?.product?.styleCode)
  const distributor = await resolveDistributorFromSoldProduct(soldProduct, jewelerId)
  const distributorId = toCleanString(distributor?._id)

  if (!soldStyleCode) {
    await sendAutoAssignFailureMail({
      distributor,
      soldProduct,
      soldProductId,
      jewelerName,
      jewelerBusinessName,
      reason: 'missing-style-code',
    })
    return
  }

  const canAssign = await canAutoAssignForJeweler(jewelerId)
  if (!canAssign) {
    await sendAutoAssignFailureMail({
      distributor,
      soldProduct,
      soldProductId,
      jewelerName,
      jewelerBusinessName,
      reason: 'credit-limit',
    })
    return
  }

  let availableProduct: any = null
  if (distributorId) {
    availableProduct = await findNextAvailableProduct({ styleCode: soldStyleCode, distributorId })
  }
  if (!availableProduct) {
    availableProduct = await findNextAvailableProduct({ styleCode: soldStyleCode })
  }

  if (availableProduct) {
    try {
      await assignProductHolder({
        productId: availableProduct._id.toString(),
        toUserId: jewelerId,
        toRole: 'jeweler',
        toName: jewelerName,
        toBusinessName: jewelerBusinessName,
        assignedByUserId: performedBy,
        assignedByRole: 'system',
        assignedByName: 'AutoAssignment',
        remark: 'Auto-assigned after sale (Same Design)',
      })
      customLog({
        event: 'pos.product.assigned',
        productId: availableProduct._id.toString(),
        jewelerId,
        performedBy,
      })
      return
    } catch (error: any) {
      await sendAutoAssignFailureMail({
        distributor,
        soldProduct,
        soldProductId,
        jewelerName,
        jewelerBusinessName,
        reason: 'assignment-error',
        errorMessage: error?.message || 'Failed during assignment',
      })
      return
    }
  }

  await createTicket({
    requestedBy: jewelerId,
    priority: 'high',
    productId: null,
  })
  await sendAutoAssignFailureMail({
    distributor,
    soldProduct,
    soldProductId,
    jewelerName,
    jewelerBusinessName,
    reason: 'no-stock',
  })
  customLog({
    event: 'pos.ticket.created',
    jewelerId,
    reason: 'no-stock',
  })
}
