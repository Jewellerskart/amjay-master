import mongoose, { Schema } from 'mongoose'
import { ITicket, TicketStatus, TicketPriority } from '../type/ticket'

const TicketSchema: Schema<ITicket> = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'], default: 'OPEN', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  }
)

TicketSchema.index({ status: 1, priority: 1, assignedTo: 1 })
TicketSchema.index({ createdAt: -1 })

export const TicketModel = mongoose.model<ITicket>('Ticket', TicketSchema, 'ticket')
