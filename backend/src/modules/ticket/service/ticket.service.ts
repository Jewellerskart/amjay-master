import { TicketModel } from '../model/ticket.schema'
import { TicketPriority, TicketStatus } from '../type/ticket'
import { UserModel } from '../../auth/model/auth.schema'
import { ProductModel } from '../../product/model/product.schema'
import { OrderTransactionModel } from '../../pos/model/orderTransaction.schema'
import { customLog } from '../../../utils/common'

const findPurchaseTeamMember = async () => {
  const purchaseUser = await UserModel.findOne({ role: 'purchase' }).select('_id')
  return purchaseUser?._id?.toString()
}

const toCleanString = (value: any): string => {
  if (value === null || value === undefined) return ''
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

const buildProductSnapshot = (value: any) => {
  if (!value || typeof value !== 'object') return null
  const id = toCleanString(value?.id || value?._id)
  const styleCode = toCleanString(value?.styleCode || value?.product?.styleCode)
  const design = toCleanString(value?.design || styleCode)
  const jewelCode = toCleanString(value?.jewelCode || value?.product?.jewelCode)
  const image = toCleanString(value?.image)
  const components = Array.isArray(value?.components) ? value.components : []
  const uploadedByBusinessName = toCleanString(value?.uploadedByBusinessName || value?.uploadedBy?.businessName)
  const uploadedByName = toCleanString(value?.uploadedByName || value?.uploadedBy?.name)

  if (!id && !styleCode && !design && !jewelCode && !image && components.length === 0 && !uploadedByBusinessName && !uploadedByName) {
    return null
  }

  return {
    id,
    design,
    styleCode,
    jewelCode,
    image,
    components,
    uploadedByBusinessName,
    uploadedByName,
  }
}

const hasProductSnapshot = (value: any): boolean => {
  const snapshot = buildProductSnapshot(value)
  if (!snapshot) return false
  return !!(snapshot.id || snapshot.design || snapshot.styleCode || snapshot.jewelCode || snapshot.image || snapshot.components.length)
}

const buildUserSnapshot = (value: any, fallbackId = '') => {
  if (!value || typeof value !== 'object') {
    const id = toCleanString(fallbackId)
    return id ? { id, name: '', email: '', businessName: '', role: '' } : null
  }

  const id = toCleanString(value?.id || value?._id || fallbackId)
  const firstName = toCleanString(value?.firstName)
  const lastName = toCleanString(value?.lastName)
  const name = toCleanString(value?.name || `${firstName} ${lastName}`.trim())
  const email = toCleanString(value?.email)
  const businessName = toCleanString(value?.businessName)
  const role = toCleanString(value?.role)

  if (!id && !name && !email && !businessName && !role) return null

  return { id, name, email, businessName, role }
}

const hasUserSnapshot = (value: any): boolean => {
  const snapshot = buildUserSnapshot(value)
  if (!snapshot) return false
  return !!(snapshot.name || snapshot.email || snapshot.businessName || snapshot.role)
}

export const createTicket = async (payload: {
  productId?: string | null
  requestedBy: string
  priority?: TicketPriority
  assignedTo?: string | null
}) => {
  const normalizedProductId = toCleanString(payload.productId)
  const normalizedRequestedBy = toCleanString(payload.requestedBy)
  const defaultAssignee = toCleanString(payload.assignedTo) || (await findPurchaseTeamMember()) || null

  const [productDoc, requestedByDoc, assignedToDoc] = await Promise.all([
    normalizedProductId ? ProductModel.findById(normalizedProductId).select('product image components uploadedBy').lean() : null,
    normalizedRequestedBy ? UserModel.findById(normalizedRequestedBy).select('_id firstName lastName email businessName role').lean() : null,
    defaultAssignee ? UserModel.findById(defaultAssignee).select('_id firstName lastName email businessName role').lean() : null,
  ])

  const productSnapshot = buildProductSnapshot(productDoc)
  const requestedByDetails = buildUserSnapshot(requestedByDoc, normalizedRequestedBy)
  const assignedToDetails = buildUserSnapshot(assignedToDoc, defaultAssignee || '')

  const ticket = await TicketModel.create({
    productId: normalizedProductId || null,
    requestedBy: normalizedRequestedBy,
    product: productSnapshot,
    requestedByDetails,
    status: 'OPEN',
    priority: payload.priority || 'medium',
    assignedTo: defaultAssignee,
    assignedToDetails,
  })
  customLog({
    event: 'ticket.created',
    ticketId: ticket._id.toString(),
    requestedBy: normalizedRequestedBy,
    assignedTo: `${defaultAssignee || ''}`.trim(),
    productId: normalizedProductId,
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
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TicketModel.countDocuments(query),
  ])

  const resolveRequestedById = (ticket: any): string => {
    return toCleanString(ticket?.requestedBy)
  }

  const rows = Array.isArray(data) ? data : []
  const ticketsNeedingProductSnapshot = rows.filter((ticket: any) => !hasProductSnapshot(ticket?.product))
  const ticketsMissingDirectProductId = ticketsNeedingProductSnapshot.filter((ticket: any) => !toCleanString(ticket?.productId))
  const fallbackWindowMs = 1000 * 60 * 10
  const fallbackTransactionsByUser = new Map<string, any[]>()
  if (ticketsMissingDirectProductId.length) {
    const requestedByIds = Array.from(new Set(ticketsMissingDirectProductId.map((ticket: any) => resolveRequestedById(ticket)).filter(Boolean)))
    const createdAtValues = ticketsMissingDirectProductId
      .map((ticket: any) => {
        const date = new Date(ticket?.createdAt || 0)
        return Number.isNaN(date.getTime()) ? null : date
      })
      .filter(Boolean) as Date[]

    if (requestedByIds.length && createdAtValues.length) {
      const minTime = Math.min(...createdAtValues.map((date) => date.getTime())) - fallbackWindowMs
      const maxTime = Math.max(...createdAtValues.map((date) => date.getTime())) + fallbackWindowMs
      const transactions = await OrderTransactionModel.find({
        jewelerId: { $in: requestedByIds },
        createdAt: { $gte: new Date(minTime), $lte: new Date(maxTime) },
      })
        .select('jewelerId productId createdAt')
        .sort({ createdAt: -1 })
        .lean()

      for (const transaction of Array.isArray(transactions) ? transactions : []) {
        const key = `${transaction?.jewelerId || ''}`.trim()
        if (!key) continue
        const list = fallbackTransactionsByUser.get(key) || []
        list.push(transaction)
        fallbackTransactionsByUser.set(key, list)
      }
    }
  }

  const fallbackProductIdByTicketId = new Map<string, string>()
  for (const ticket of ticketsMissingDirectProductId) {
    const ticketId = `${ticket?._id || ''}`.trim()
    const requestedById = resolveRequestedById(ticket)
    const createdAt = new Date(ticket?.createdAt || 0)
    if (!ticketId || !requestedById || Number.isNaN(createdAt.getTime())) continue

    const candidates = (fallbackTransactionsByUser.get(requestedById) || [])
      .map((transaction: any) => {
        const txCreatedAt = new Date(transaction?.createdAt || 0)
        if (Number.isNaN(txCreatedAt.getTime())) return null
        const diffMs = Math.abs(txCreatedAt.getTime() - createdAt.getTime())
        const productId = `${transaction?.productId || ''}`.trim()
        if (!productId) return null
        return { diffMs, productId }
      })
      .filter(Boolean) as Array<{ diffMs: number; productId: string }>

    const best = candidates.sort((a, b) => a.diffMs - b.diffMs)[0]
    if (best && best.diffMs <= fallbackWindowMs) {
      fallbackProductIdByTicketId.set(ticketId, best.productId)
    }
  }

  const missingProductIds = Array.from(
    new Set(
      rows
        .map((ticket: any) => {
          if (hasProductSnapshot(ticket?.product)) return ''
          const directProductId = toCleanString(ticket?.productId)
          if (directProductId) return directProductId
          const ticketId = `${ticket?._id || ''}`.trim()
          return ticketId ? fallbackProductIdByTicketId.get(ticketId) || '' : ''
        })
        .filter(Boolean),
    ),
  )

  const missingProductDocs = missingProductIds.length
    ? await ProductModel.find({ _id: { $in: missingProductIds } }).select('product image components uploadedBy').lean()
    : []
  const missingProductMap = new Map<string, any>((Array.isArray(missingProductDocs) ? missingProductDocs : []).map((doc: any) => [`${doc?._id || ''}`, doc]))

  const missingRequestedByIds = Array.from(
    new Set(
      rows
        .map((ticket: any) => {
          if (hasUserSnapshot(ticket?.requestedByDetails)) return ''
          return resolveRequestedById(ticket)
        })
        .filter(Boolean),
    ),
  )

  const missingAssignedToIds = Array.from(
    new Set(
      rows
        .map((ticket: any) => {
          if (hasUserSnapshot(ticket?.assignedToDetails)) return ''
          return toCleanString(ticket?.assignedTo)
        })
        .filter(Boolean),
    ),
  )

  const missingUserIds = Array.from(new Set([...missingRequestedByIds, ...missingAssignedToIds]))
  const missingUserDocs = missingUserIds.length ? await UserModel.find({ _id: { $in: missingUserIds } }).select('_id firstName lastName email businessName role').lean() : []
  const missingUserMap = new Map<string, any>((Array.isArray(missingUserDocs) ? missingUserDocs : []).map((doc: any) => [`${doc?._id || ''}`, doc]))

  const backfillOps: any[] = []

  const mapped = rows.map((ticket: any) => {
    const ticketId = `${ticket?._id || ''}`.trim()
    const directProductId = toCleanString(ticket?.productId)
    const productIdValue = directProductId || (ticketId ? fallbackProductIdByTicketId.get(ticketId) || '' : '')
    const storedProduct = buildProductSnapshot(ticket?.product)
    const productDoc = missingProductMap.get(productIdValue) || null
    const productSnapshot = storedProduct || buildProductSnapshot(productDoc)

    const requestedById = resolveRequestedById(ticket)
    const assignedToId = toCleanString(ticket?.assignedTo)
    const storedRequestedByDetails = hasUserSnapshot(ticket?.requestedByDetails) ? buildUserSnapshot(ticket?.requestedByDetails, requestedById) : null
    const storedAssignedToDetails = hasUserSnapshot(ticket?.assignedToDetails) ? buildUserSnapshot(ticket?.assignedToDetails, assignedToId) : null
    const requestedByDetails = storedRequestedByDetails || buildUserSnapshot(missingUserMap.get(requestedById), requestedById)
    const assignedToDetails = storedAssignedToDetails || (assignedToId ? buildUserSnapshot(missingUserMap.get(assignedToId), assignedToId) : null)

    const setPayload: Record<string, any> = {}
    if (!storedProduct && productSnapshot) setPayload.product = productSnapshot
    if (!directProductId && productIdValue) setPayload.productId = productIdValue
    if (!storedRequestedByDetails && requestedByDetails) setPayload.requestedByDetails = requestedByDetails
    if (!storedAssignedToDetails && assignedToDetails) setPayload.assignedToDetails = assignedToDetails
    if (Object.keys(setPayload).length > 0 && ticketId) {
      backfillOps.push({
        updateOne: {
          filter: { _id: ticketId },
          update: { $set: setPayload },
        },
      })
    }

    return {
      ...ticket,
      productId: productDoc?._id?.toString?.() || productIdValue || null,
      requestedBy: requestedById || '',
      assignedTo: assignedToId || null,
      product: productSnapshot,
      requestedByDetails,
      assignedToDetails,
    }
  })

  if (backfillOps.length) {
    try {
      await TicketModel.bulkWrite(backfillOps, { ordered: false })
    } catch (error: any) {
      customLog({
        event: 'ticket.snapshot.backfill.error',
        count: backfillOps.length,
        error: error?.message || 'Ticket snapshot backfill failed',
      })
    }
  }

  return { data: mapped, count, page, limit }
}

export const updateTicketStatus = async (id: string, status: TicketStatus, remark?: string) => {
  const ticket = await TicketModel.findById(id)
  if (!ticket) return null
  ticket.status = status
  await ticket.save()
  return ticket
}
