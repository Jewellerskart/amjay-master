import { Document, Types } from 'mongoose'

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
export type TicketPriority = 'low' | 'medium' | 'high'

export interface ITicket extends Document {
  productId?: Types.ObjectId
  requestedBy: Types.ObjectId
  status: TicketStatus
  priority: TicketPriority
  assignedTo?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}
