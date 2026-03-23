import mongoose from 'mongoose'
import {
  assignProductHolder,
  findNextAvailableProduct,
  getProductById,
  updateProductStatus,
} from '../../product/model/product.service'
import { canAssignProduct, reserveWalletCredit, releaseWalletCredit } from '../../wallet/service/wallet.service'
import { createInvoice } from '../../invoice/service/invoice.service'
import { InvoiceModel } from '../../invoice/model/invoice.schema'
import { InvoiceStatus, InvoiceType } from '../../invoice/type/invoice'
import { createCommissionRecord } from '../../commission/service/commission.service'
import { createTicket } from '../../ticket/service/ticket.service'
import { UserModel } from '../../auth/model/auth.schema'
import { customLog } from '../../../utils/common'

export const processSale = async (payload: {
  productId: string
  jewelerId: string
  salePrice: number
  choice: 'PURCHASE' | 'RENT'
  soldBy: string
}) => {
  const session = await mongoose.startSession()
  let invoice: any
  const product = await getProductById(payload.productId)
  if (!product) throw new Error('Product not found')
  const currentStatus = `${product.status || ''}`.trim()
  if (payload.choice === 'PURCHASE' && currentStatus !== 'ACTIVE') {
    const error = new Error('Product must be ACTIVE before it can be sold via purchase')
    ;(error as any).status_code = 400
    throw error
  }
  if (payload.choice === 'RENT' && currentStatus !== 'RENTED') {
    const error = new Error('Product must be RENTED before it can be sold via rent')
    ;(error as any).status_code = 400
    throw error
  }

  const jeweler = await UserModel.findById(payload.jewelerId).select('firstName lastName email phone businessName role commissionRate')
  if (!jeweler) throw new Error('Jeweler not found')

  const invoiceType: InvoiceType = payload.choice === 'RENT' ? 'rent' : 'purchase'
  const invoiceStatus: InvoiceStatus = payload.choice === 'RENT' ? 'RENTED' : 'PAID'

  await session.withTransaction(async () => {
    // Ensure purchase path has a prior approved invoice
    if (payload.choice === 'PURCHASE') {
      const existingActive = await InvoiceModel.findOne({
        productId: payload.productId,
        userId: payload.jewelerId,
        type: 'purchase',
        status: { $in: ['ACTIVE', 'PAID'] },
      })
        .sort({ createdAt: -1 })
        .session(session)
      if (!existingActive) {
        const error = new Error('Approved purchase invoice required before sale')
        ;(error as any).status_code = 409
        throw error
      }
    }

    invoice = await createInvoice(
      {
        productId: payload.productId,
        userEmail: jeweler.email || '',
        userPhone: jeweler.phone || '',
        amount: payload.salePrice,
        type: invoiceType,
        status: invoiceStatus,
      },
      session
    )

    await updateProductStatus(payload.productId, 'SOLD', session)
    await releaseWalletCredit(payload.jewelerId, 1, session)
  })
  session.endSession()

  const commissionRate = Number(jeweler.commissionRate || 0)
  const commissionAmount = Number(((commissionRate / 100) * payload.salePrice).toFixed(2))
  await createCommissionRecord({
    userId: payload.jewelerId,
    productId: payload.productId,
    commissionRate,
    commissionAmount,
    invoiceId: invoice._id.toString(),
  })

  customLog({
    event: 'pos.invoice.created',
    invoiceId: invoice._id.toString(),
    jewelerId: payload.jewelerId,
    productId: payload.productId,
    amount: payload.salePrice,
  })

  customLog({
    event: 'pos.sale.completed',
    invoiceId: invoice._id.toString(),
    productId: payload.productId,
    salePrice: payload.salePrice,
    choice: payload.choice,
  })

  const jewelerName = `${jeweler.firstName || ''} ${jeweler.lastName || ''}`.trim() || jeweler.email || 'Jeweler'
  const jewelerBusinessName = `${jeweler.businessName || ''}`.trim()
  await autoAssignProduct(payload.jewelerId, payload.soldBy, payload.productId, jewelerName, jewelerBusinessName)

  return { invoice, product }
}

const autoAssignProduct = async (jewelerId: string, performedBy: string, soldProductId: string, jewelerName: string, jewelerBusinessName: string) => {
  const canAssign = await canAssignProduct(jewelerId)
  if (!canAssign) {
    customLog({
      event: 'pos.auto-assign.failed',
      reason: 'credit-limit',
      jewelerId,
      soldProductId,
    })
    return
  }

  const availableProduct = await findNextAvailableProduct()
  if (availableProduct) {
    const reserved = await reserveWalletCredit(jewelerId)
    if (!reserved) {
      customLog({
        event: 'pos.auto-assign.failed',
        reason: 'reserve-credit',
        jewelerId,
        soldProductId,
      })
      return
    }
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
        remark: 'Auto-assigned after sale',
      })
      customLog({
        event: 'pos.product.assigned',
        productId: availableProduct._id.toString(),
        jewelerId,
        performedBy,
      })
      return
    } catch (error: any) {
      await releaseWalletCredit(jewelerId)
      customLog({
        event: 'pos.auto-assign.failed',
        reason: 'assignment-error',
        error: error?.message || 'Failed during assignment',
        jewelerId,
        soldProductId,
      })
      return
    }
  }

  await createTicket({
    requestedBy: jewelerId,
    priority: 'high',
    productId: null,
  })
  customLog({
    event: 'pos.ticket.created',
    jewelerId,
    reason: 'no-stock',
  })
}
