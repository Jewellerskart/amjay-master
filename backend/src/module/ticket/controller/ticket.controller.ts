import { Request, Response } from 'express'
import { ApiResponse, CatchError, preDataProcess } from '../../../utils'
import { createTicket, listTickets, updateTicketStatus } from '../service/ticket.service'

export const createPurchaseTicket = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const userId = `${req.user?._id || ''}`.trim()
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
  }
  const ticket = await createTicket({
    productId: req.body?.productId || null,
    requestedBy: userId,
    priority: req.body?.priority || 'high',
    assignedTo: null,
  })
  return res.status(201).json(new ApiResponse(201, { ticket }, 'Ticket created successfully'))
})

export const listPurchaseTickets = CatchError(async (req: Request, res: Response) => {
  const { page, limit } = preDataProcess(req.body)
  const status = `${req.body?.status || ''}`.toUpperCase() as any
  const priority = `${req.body?.priority || ''}`.toLowerCase() as any
  const data = await listTickets({ status, priority, page, limit })
  return res.status(200).json(new ApiResponse(200, data as any, 'Tickets fetched successfully'))
})

export const updateTicket = CatchError(async (req: Request, res: Response) => {
  const id = `${req.params?.id || ''}`.trim()
  const status = `${req.body?.status || ''}`.toUpperCase() as any
  if (!id || !status) {
    return res.status(400).json(new ApiResponse(400, { message: 'id and status are required' }, 'Invalid input'))
  }
  const updated = await updateTicketStatus(id, status)
  if (!updated) {
    return res.status(404).json(new ApiResponse(404, { message: 'Ticket not found' }, 'Not found'))
  }
  return res.status(200).json(new ApiResponse(200, { ticket: updated }, 'Ticket updated successfully'))
})
