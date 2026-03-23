import mongoose, { Schema } from 'mongoose'

const OtherRateChartSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: 'OTHER', trim: true },
    unit: { type: String, default: 'PER_UNIT', trim: true },
    rate: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    effectiveDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true, index: true },
    remark: { type: String, default: '' },
    attributes: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

OtherRateChartSchema.index({ name: 1, category: 1, effectiveDate: -1 })

export const OtherRateChartModel = mongoose.model('OtherRateChart', OtherRateChartSchema, 'other_rate_chart')
