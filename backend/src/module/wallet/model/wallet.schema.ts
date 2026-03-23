import mongoose, { Schema } from 'mongoose'
import { IWallet } from '../type/wallet'

const WalletSchema: Schema<IWallet> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    walletBalance: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    usedCredit: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
)

WalletSchema.index({ userId: 1 })
WalletSchema.index({ walletBalance: -1 })
WalletSchema.index({ creditLimit: -1 })

export const WalletModel = mongoose.model<IWallet>('Wallet', WalletSchema, 'wallet')
