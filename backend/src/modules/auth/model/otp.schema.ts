import mongoose, { Schema } from 'mongoose'
import { IOtp } from '../type/otp'

const OtpSchema: Schema<IOtp> = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, sparse: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    otpTaskId: { type: String, required: true },
    otpTaskIdExp: { type: Date, required: true },
  },
  { timestamps: true }
)

export const Otp = mongoose.model<IOtp>('Otp', OtpSchema, 'otp')
