import mongoose, { Schema } from 'mongoose'
import { IInvoice } from '../type/invoice'

const InvoiceSchema: Schema<IInvoice> = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    userPhone: { type: String, required: true, trim: true },
    requestedByEmail: { type: String, default: null, lowercase: true, trim: true },
    amount: { type: Number, required: true },
    grossAmount: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 3 },
    commissionTotal: { type: Number, default: 0 },
    commissionBreakdown: [
      {
        componentKey: { type: String, required: true, trim: true, lowercase: true },
        baseAmount: { type: Number, required: true, default: 0 },
        rate: { type: Number, required: true, default: 0 },
        deductionAmount: { type: Number, required: true, default: 0 },
      },
    ],
    status: {
      type: String,
      enum: ['PURCHASE_PENDING_PAYMENT', 'MEMO_PENDING_PAYMENT', 'ACTIVE', 'PAID', 'RENTED'],
      default: 'PURCHASE_PENDING_PAYMENT',
      index: true,
    },
    type: { type: String, enum: ['purchase', 'memo', 'rent'], required: true },
    approvedByEmail: { type: String, default: null, lowercase: true, trim: true },
    paidAt: { type: Date, default: null },
    paidByEmail: { type: String, default: null, lowercase: true, trim: true },
    productSnapshot: { type: Schema.Types.Mixed, default: null },
    liveRateAtCreation: { type: Number, default: null },
  },
  {
    timestamps: true,
  }
)

InvoiceSchema.index({ status: 1, type: 1 })
InvoiceSchema.index({ userEmail: 1, status: 1, createdAt: -1 })
InvoiceSchema.index({ createdAt: -1 })

export const InvoiceModel = mongoose.model<IInvoice>('Invoice', InvoiceSchema, 'invoice')
