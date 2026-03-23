import { TicketModel } from '../model/ticket.schema'
import { TicketPriority, TicketStatus } from '../type/ticket'
import { UserModel } from '../../auth/model/auth.schema'
import { customLog } from '../../../utils/common'

const findPurchaseTeamMember = async () => {
  const purchaseUser = await UserModel.findOne({ role: 'purchase' }).select('_id')
  return purchaseUser?._id?.toString()
}

export const createTicket = async (payload: {
  productId?: string | null
  requestedBy: string
  priority?: TicketPriority
  assignedTo?: string | null
}) => {
  const defaultAssignee = payload.assignedTo || (await findPurchaseTeamMember()) || null
  const ticket = await TicketModel.create({
    productId: payload.productId,
    requestedBy: payload.requestedBy,
    status: 'OPEN',
    priority: payload.priority || 'medium',
    assignedTo: defaultAssignee,
  })
  customLog({
    event: 'ticket.created',
    ticketId: ticket._id.toString(),
    requestedBy: payload.requestedBy,
    assignedTo: `${defaultAssignee || ''}`.trim(),
    productId: `${payload.productId || ''}`.trim(),
  })
  return ticket
}

export const listTickets = async (params: {
  status?: TicketStatus
  assignedTo?: string
  priority?: TicketPriority
  page?: number
  limit?: number
}) => {
  const { status, assignedTo, priority, page = 1, limit = 20 } = params
  const query: any = {}
  if (status) query.status = status
  if (assignedTo) query.assignedTo = assignedTo
  if (priority) query.priority = priority

  const [data, count] = await Promise.all([
    TicketModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    TicketModel.countDocuments(query),
  ])

  return { data, count, page, limit }
}

export const updateTicketStatus = async (id: string, status: TicketStatus, remark?: string) => {
  const ticket = await TicketModel.findById(id)
  if (!ticket) return null
  ticket.status = status
  await ticket.save()
  return ticket
}
