import { Document, Types } from 'mongoose'

export type ContactQueryStatus =
  | 'new'
  | 'in-progress'
  | 'waiting-user'
  | 'resolved'
  | 'complete'
  | 'cancelled'

export interface IContactQueryAttachment {
  fileName: string
  fileUrl: string
  mimeType?: string
  uploadedAt: Date
}

export interface IContactQueryActionLog {
  action: string
  status: ContactQueryStatus
  remark?: string
  byUserId?: Types.ObjectId
  byRole?: string
  createdAt: Date
}

export interface IContactQuery extends Document {
  userId: Types.ObjectId
  userEmail: string
  userName: string
  subject: string
  message: string
  queryType?: 'general' | 'product-request'
  productRequest?: {
    productRefId?: Types.ObjectId | null
    preferredProductName?: string
    preferredColor?: string
    preferredCut?: string
    preferredCarat?: number
    qty?: number
    budgetPerCarat?: number
  }
  priority: 'low' | 'medium' | 'high'
  status: ContactQueryStatus
  assignedToUserId?: Types.ObjectId | null
  assignedToEmail?: string
  assignedToName?: string
  deadlineAt?: Date | null
  attachments: IContactQueryAttachment[]
  actionLogs: IContactQueryActionLog[]
  createdAt: Date
  updatedAt: Date
}
