import { CommissionModel } from '../model/commission.schema'
import { ClientSession } from 'mongoose'

export const createCommissionRecord = async (payload: {
  userId: string
  productId: string
  commissionRate: number
  commissionAmount: number
  invoiceId: string
  breakdown?: Array<{ componentKey: string; baseAmount: number; rate: number; deductionAmount: number }>
}, session?: ClientSession) => {
  return CommissionModel.create([payload], { session }).then((rows) => rows[0])
}

export const getCommissionsByUser = async (userId: string) => {
  return CommissionModel.find({ userId }).sort({ createdAt: -1 }).lean()
}

export const getCommissionsByInvoice = async (invoiceId: string) => {
  return CommissionModel.find({ invoiceId }).sort({ createdAt: -1 }).lean()
}
