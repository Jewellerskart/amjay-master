import mongoose, { Schema } from 'mongoose'
import { IDiamondRateChart } from '../type/diamondRateChart'

const DiamondRateChartSchema = new Schema<IDiamondRateChart>(
  {
    size: { type: String, required: true, trim: true, uppercase: true, index: true }, // e.g., "0.18 - 0.22"
    clarity: { type: String, required: true, trim: true, uppercase: true, index: true }, // e.g., "VVS-VS"
    shape: { type: String, trim: true, uppercase: true, default: 'ROUND' },
    ratePerCarat: { type: Number, required: true, min: 0 },
    currency: { type: String, trim: true, uppercase: true, default: 'INR' },
    effectiveDate: { type: Date, default: Date.now },
    remark: { type: String, default: '', trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

DiamondRateChartSchema.index({ size: 1, clarity: 1, shape: 1, currency: 1 }, { unique: true })

export const DiamondRateChartModel = mongoose.model<IDiamondRateChart>(
  'DiamondRateChart',
  DiamondRateChartSchema,
  'diamond_rate_chart'
)
