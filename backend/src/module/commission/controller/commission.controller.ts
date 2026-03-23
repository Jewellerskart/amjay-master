import { Request, Response } from 'express'
import { ApiResponse, CatchError } from '../../../utils'
import { createCommissionRecord, getCommissionsByInvoice, getCommissionsByUser } from '../service/commission.service'

export const createCommission = CatchError(async (req: Request, res: Response) => {
  const { userId, productId, commissionRate, commissionAmount, invoiceId } = req.body
  if (!userId || !productId || !invoiceId) {
    return res.status(400).json(new ApiResponse(400, { message: 'Missing required identifiers' }, 'Invalid input'))
  }
  const commission = await createCommissionRecord({ userId, productId, commissionRate, commissionAmount, invoiceId })
  return res.status(201).json(new ApiResponse(201, { commission }, 'Commission recorded'))
})

export const listCommissionsForUser = CatchError(async (req: Request, res: Response) => {
  const userId = `${req.params?.userId || ''}`.trim()
  if (!userId) {
    return res.status(400).json(new ApiResponse(400, { message: 'User id required' }, 'Invalid input'))
  }
  const commissions = await getCommissionsByUser(userId)
  return res.status(200).json(new ApiResponse(200, { commissions }, 'Commissions fetched'))
})

export const listCommissionsForInvoice = CatchError(async (req: Request, res: Response) => {
  const invoiceId = `${req.params?.invoiceId || ''}`.trim()
  if (!invoiceId) {
    return res.status(400).json(new ApiResponse(400, { message: 'Invoice id required' }, 'Invalid input'))
  }
  const commissions = await getCommissionsByInvoice(invoiceId)
  return res.status(200).json(new ApiResponse(200, { commissions }, 'Commissions fetched'))
})
