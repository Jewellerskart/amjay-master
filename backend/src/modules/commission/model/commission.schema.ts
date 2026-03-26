import mongoose, { Schema } from 'mongoose'
import { ICommission } from '../type/commission'

const CommissionSchema: Schema<ICommission> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    commissionRate: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    breakdown: [
      {
        componentKey: { type: String, required: true, trim: true, lowercase: true },
        baseAmount: { type: Number, required: true, default: 0 },
        rate: { type: Number, required: true, default: 0 },
        deductionAmount: { type: Number, required: true, default: 0 },
      },
    ],
  },
  {
    timestamps: true,
  }
)

CommissionSchema.index({ userId: 1, productId: 1, invoiceId: 1 })

export const CommissionModel = mongoose.model<ICommission>('Commission', CommissionSchema, 'commission')
