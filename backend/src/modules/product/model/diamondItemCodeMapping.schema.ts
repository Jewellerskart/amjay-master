import mongoose, { Schema } from 'mongoose'

export interface IDiamondItemCodeMapping extends mongoose.Document {
  key: string
  clarityMap: Map<string, string>
  shapeMap: Map<string, string>
  createdAt: Date
  updatedAt: Date
}

const DiamondItemCodeMappingSchema = new Schema<IDiamondItemCodeMapping>(
  {
    key: { type: String, required: true, unique: true, default: 'default', trim: true, lowercase: true },
    clarityMap: { type: Map, of: String, default: {} },
    shapeMap: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
)

export const DiamondItemCodeMappingModel = mongoose.model<IDiamondItemCodeMapping>(
  'DiamondItemCodeMapping',
  DiamondItemCodeMappingSchema,
  'diamond_item_code_mapping'
)
