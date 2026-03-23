import { WalletModel } from '../model/wallet.schema'
import { UserModel } from '../../auth/model/auth.schema'
import { Types, ClientSession } from 'mongoose'

export const PRODUCT_RESERVATION_COST = 1000

const syncWalletToUser = async (userId: string, wallet: any, session?: ClientSession) => {
  await UserModel.findByIdAndUpdate(
    userId,
    {
      walletBalance: wallet.walletBalance,
      creditLimit: wallet.creditLimit,
    },
    { session }
  )
}

export const ensureWalletRecord = async (userId: string, session?: ClientSession) => {
  if (!Types.ObjectId.isValid(userId)) return null
  let wallet = await WalletModel.findOne({ userId }).session(session || null)
  if (!wallet) {
    const created = await WalletModel.create(
      [{ userId, walletBalance: 0, creditLimit: 0, usedCredit: 0 }],
      { session }
    )
    wallet = Array.isArray(created) ? created[0] : (created as any)
  }
  return wallet
}

export const getWalletByUser = async (userId: string) => {
  return WalletModel.findOne({ userId })
}

export const updateWalletBalance = async (
  userId: string,
  deltaBalance: number,
  deltaUsedCredit: number = 0,
  session?: ClientSession
) => {
  const wallet = await ensureWalletRecord(userId, session)
  if (!wallet) return null
  wallet.walletBalance = Math.max(0, wallet.walletBalance + deltaBalance)
  wallet.usedCredit = Math.max(0, wallet.usedCredit + deltaUsedCredit)
  await wallet.save({ session })
  await syncWalletToUser(userId, wallet, session)
  return wallet
}

export const adjustCreditLimit = async (userId: string, creditLimit: number, session?: ClientSession) => {
  const wallet = await ensureWalletRecord(userId, session)
  if (!wallet) return null
  wallet.creditLimit = creditLimit
  await wallet.save({ session })
  await syncWalletToUser(userId, wallet, session)
  return wallet
}

export const reserveWalletCredit = async (userId: string, productCount: number = 1, session?: ClientSession) => {
  if (productCount <= 0) return null
  const wallet = await ensureWalletRecord(userId, session)
  if (!wallet) return null
  const increment = PRODUCT_RESERVATION_COST * productCount
  wallet.usedCredit = wallet.usedCredit + increment
  await wallet.save({ session })
  await syncWalletToUser(userId, wallet, session)
  return wallet
}

export const releaseWalletCredit = async (userId: string, productCount: number = 1, session?: ClientSession) => {
  if (productCount <= 0) return null
  const wallet = await ensureWalletRecord(userId, session)
  if (!wallet) return null
  const decrement = PRODUCT_RESERVATION_COST * productCount
  wallet.usedCredit = Math.max(0, wallet.usedCredit - decrement)
  await wallet.save({ session })
  await syncWalletToUser(userId, wallet, session)
  return wallet
}

export const canAssignProduct = async (jewelerId: string, requiredProducts: number = 1) => {
  if (!Types.ObjectId.isValid(jewelerId)) return false
  const user = await UserModel.findById(jewelerId).select('creditLimit walletBalance role')
  if (!user) return false
  if (`${user.role || ''}`.toLowerCase() !== 'jeweler') {
    return false
  }
  const wallet = await ensureWalletRecord(jewelerId)
  if (!wallet) return false
  const available =
    (user.creditLimit || 0) + (user.walletBalance || 0) - Math.max(0, wallet.usedCredit || 0)
  return available > requiredProducts * PRODUCT_RESERVATION_COST
}

export const recalcUsedCredit = async (jewelerId: string, activeCount: number, session?: ClientSession) => {
  if (!Types.ObjectId.isValid(jewelerId)) return null
  const wallet = await ensureWalletRecord(jewelerId, session)
  if (!wallet) return null
  wallet.usedCredit = Math.max(0, PRODUCT_RESERVATION_COST * Math.max(0, activeCount))
  await wallet.save({ session })
  await syncWalletToUser(jewelerId, wallet, session)
  return wallet
}
