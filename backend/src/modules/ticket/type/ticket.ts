import { Document, Types } from 'mongoose'

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
export type TicketPriority = 'low' | 'medium' | 'high'

export interface ITicketProductSnapshot {
  id: string
  design: string
  styleCode: string
  jewelCode: string
  image: string
  components: any[]
  uploadedByBusinessName: string
  uploadedByName: string
}

export interface ITicketUserSnapshot {
  id: string
  name: string
  email: string
  businessName: string
  role: string
}

export interface ITicket extends Document {
  productId?: Types.ObjectId
  requestedBy: Types.ObjectId
  product?: ITicketProductSnapshot | null
  requestedByDetails?: ITicketUserSnapshot | null
  assignedToDetails?: ITicketUserSnapshot | null
  status: TicketStatus
  priority: TicketPriority
  assignedTo?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}
