import { TicketModel } from '../model/ticket.schema'
import { TicketPriority, TicketStatus } from '../type/ticket'
import { UserModel } from '../../auth/model/auth.schema'
import { ProductModel } from '../../product/model/product.schema'
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
    TicketModel.find(query)
      .populate('productId', 'product image components uploadedBy')
      .populate('requestedBy', 'firstName lastName email businessName role')
      .populate('assignedTo', 'firstName lastName email businessName role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TicketModel.countDocuments(query),
  ])

  const resolveRawId = (value: any): string => {
    if (!value) return ''
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'object') {
      if (value?._id) return `${value._id}`.trim()
      if (typeof value?.toString === 'function') {
        const text = `${value.toString()}`.trim()
        if (text && text !== '[object Object]') return text
      }
      return ''
    }
    return `${value}`.trim()
  }

  const hasPopulatedProductData = (value: any): boolean => {
    if (!value || typeof value !== 'object') return false
    return !!(value?.product || value?.image || Array.isArray(value?.components))
  }

  const missingProductIds = Array.from(
    new Set(
      (Array.isArray(data) ? data : [])
        .map((ticket: any) => {
          if (hasPopulatedProductData(ticket?.productId)) return ''
          return resolveRawId(ticket?.productId)
        })
        .filter(Boolean),
    ),
  )

  const missingProductDocs = missingProductIds.length
    ? await ProductModel.find({ _id: { $in: missingProductIds } }).select('product image components uploadedBy').lean()
    : []
  const missingProductMap = new Map<string, any>((Array.isArray(missingProductDocs) ? missingProductDocs : []).map((doc: any) => [`${doc?._id || ''}`, doc]))

  const mapped = (Array.isArray(data) ? data : []).map((ticket: any) => {
    const productIdValue = resolveRawId(ticket?.productId)
    const populatedProductDoc = hasPopulatedProductData(ticket?.productId) ? ticket.productId : null
    const productDoc = populatedProductDoc || missingProductMap.get(productIdValue) || null
    const requestedByDoc = ticket?.requestedBy && typeof ticket.requestedBy === 'object' ? ticket.requestedBy : null
    const assignedToDoc = ticket?.assignedTo && typeof ticket.assignedTo === 'object' ? ticket.assignedTo : null

    const requestedByName = `${requestedByDoc?.firstName || ''} ${requestedByDoc?.lastName || ''}`.trim()
    const assignedToName = `${assignedToDoc?.firstName || ''} ${assignedToDoc?.lastName || ''}`.trim()

    return {
      ...ticket,
      productId: productDoc?._id?.toString?.() || productIdValue || null,
      requestedBy: requestedByDoc?._id?.toString?.() || `${ticket?.requestedBy || ''}` || '',
      assignedTo: assignedToDoc?._id?.toString?.() || `${ticket?.assignedTo || ''}` || null,
      product: productDoc
        ? {
            id: productDoc?._id?.toString?.() || '',
            design: `${productDoc?.product?.styleCode || ''}`.trim(),
            styleCode: `${productDoc?.product?.styleCode || ''}`.trim(),
            jewelCode: `${productDoc?.product?.jewelCode || ''}`.trim(),
            image: productDoc?.image || '',
            components: Array.isArray(productDoc?.components) ? productDoc.components : [],
            uploadedByBusinessName: `${productDoc?.uploadedBy?.businessName || ''}`.trim(),
            uploadedByName: `${productDoc?.uploadedBy?.name || ''}`.trim(),
          }
        : null,
      requestedByDetails: requestedByDoc
        ? {
            id: requestedByDoc?._id?.toString?.() || '',
            name: requestedByName,
            email: `${requestedByDoc?.email || ''}`.trim(),
            businessName: `${requestedByDoc?.businessName || ''}`.trim(),
            role: `${requestedByDoc?.role || ''}`.trim(),
          }
        : null,
      assignedToDetails: assignedToDoc
        ? {
            id: assignedToDoc?._id?.toString?.() || '',
            name: assignedToName,
            email: `${assignedToDoc?.email || ''}`.trim(),
            businessName: `${assignedToDoc?.businessName || ''}`.trim(),
            role: `${assignedToDoc?.role || ''}`.trim(),
          }
        : null,
    }
  })

  return { data: mapped, count, page, limit }
}

export const updateTicketStatus = async (id: string, status: TicketStatus, remark?: string) => {
  const ticket = await TicketModel.findById(id)
  if (!ticket) return null
  ticket.status = status
  await ticket.save()
  return ticket
}
