import { Request, Response } from 'express'
import { ApiResponse, CatchError } from '../../../utils'
import {
  adjustCreditLimit,
  ensureWalletRecord,
  getWalletByUser,
  updateWalletBalance,
} from '../service/wallet.service'

export const getMyWallet = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const userId = `${req.user?._id || ''}`.trim()
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
  }
  const wallet = (await ensureWalletRecord(userId)) || {}
  return res.status(200).json(new ApiResponse(200, { wallet }, 'Wallet fetched successfully'))
})

export const getWalletByUserId = CatchError(async (req: Request, res: Response) => {
  const userId = `${req.params?.userId || ''}`.trim()
  if (!userId) {
    return res.status(400).json(new ApiResponse(400, { message: 'User id required' }, 'Invalid input'))
  }
  const wallet = await getWalletByUser(userId)
  if (!wallet) {
    return res.status(404).json(new ApiResponse(404, { message: 'Wallet not found' }, 'Not found'))
  }
  return res.status(200).json(new ApiResponse(200, { wallet }, 'Wallet fetched successfully'))
})

export const updateWalletController = CatchError(async (req: Request, res: Response) => {
  const userId = `${req.params?.userId || ''}`.trim()
  if (!userId) {
    return res.status(400).json(new ApiResponse(400, { message: 'User id required' }, 'Invalid input'))
  }

  const updatePayload: { walletBalance?: number; creditLimit?: number; usedCredit?: number } = {}
  if (req.body.walletBalance !== undefined) {
    updatePayload.walletBalance = Number(req.body.walletBalance)
  }
  if (req.body.creditLimit !== undefined) {
    updatePayload.creditLimit = Number(req.body.creditLimit)
  }
  if (req.body.usedCredit !== undefined) {
    updatePayload.usedCredit = Number(req.body.usedCredit)
  }

  if (updatePayload.walletBalance !== undefined || updatePayload.usedCredit !== undefined) {
    const deltaBalance = updatePayload.walletBalance ?? 0
    const deltaUsed = updatePayload.usedCredit ?? 0
    const wallet = await updateWalletBalance(userId, deltaBalance, deltaUsed)
    if (!wallet) {
      return res.status(404).json(new ApiResponse(404, { message: 'Wallet not found' }, 'Not found'))
    }
  }

  if (updatePayload.creditLimit !== undefined) {
    await adjustCreditLimit(userId, updatePayload.creditLimit)
  }

  const wallet = await getWalletByUser(userId)
  return res.status(200).json(new ApiResponse(200, { wallet }, 'Wallet updated successfully'))
})
