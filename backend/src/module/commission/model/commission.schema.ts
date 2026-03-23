import mongoose, { Schema } from 'mongoose'
import { ICommission } from '../type/commission'

const CommissionSchema: Schema<ICommission> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    commissionRate: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  },
  {
    timestamps: true,
  }
)

CommissionSchema.index({ userId: 1, productId: 1, invoiceId: 1 })

export const CommissionModel = mongoose.model<ICommission>('Commission', CommissionSchema, 'commission')
