import { Document, Types } from 'mongoose'

export interface IWallet extends Document {
  userId: Types.ObjectId
  walletBalance: number
  creditLimit: number
  usedCredit: number
  updatedAt: Date
  createdAt: Date
}
