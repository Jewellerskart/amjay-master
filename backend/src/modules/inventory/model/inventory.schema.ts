import mongoose, { Schema } from 'mongoose'
import { IInventoryRequest } from '../type/inventory'

const InventoryRequestSchema = new Schema<IInventoryRequest>(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    styleCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'FULFILLED', 'CANCELLED'],
      default: 'OPEN',
      index: true,
    },
    requiredProducts: { type: Number, default: 1 },
    usageChoice: { type: String, enum: ['PURCHASE', 'MEMO', 'RENT'], required: true },
    preferredUsageNote: { type: String, trim: true, default: '' },
    assignedProductId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    assignedProductIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
    assignedCount: { type: Number, default: 0 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assignedAt: { type: Date, default: null },
    remark: { type: String, trim: true, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  }
)

InventoryRequestSchema.index({ requestedBy: 1, status: 1 })
InventoryRequestSchema.index({ createdAt: -1 })

export const InventoryRequestModel = mongoose.model<IInventoryRequest>(
  'InventoryRequest',
  InventoryRequestSchema,
  'inventory_requests'
)
