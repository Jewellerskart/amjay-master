import { Document } from 'mongoose'

export interface IDiamondRateChart extends Document {
  size: string
  clarity: string
  shape?: string
  ratePerCarat: number
  currency: string
  effectiveDate?: Date
  remark?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
