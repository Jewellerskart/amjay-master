import { CommissionModel } from '../model/commission.schema'

export const createCommissionRecord = async (payload: {
  userId: string
  productId: string
  commissionRate: number
  commissionAmount: number
  invoiceId: string
}) => {
  return CommissionModel.create(payload)
}

export const getCommissionsByUser = async (userId: string) => {
  return CommissionModel.find({ userId }).sort({ createdAt: -1 }).lean()
}

export const getCommissionsByInvoice = async (invoiceId: string) => {
  return CommissionModel.find({ invoiceId }).sort({ createdAt: -1 }).lean()
}
