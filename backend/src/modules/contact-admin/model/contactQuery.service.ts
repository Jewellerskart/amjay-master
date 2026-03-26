import { ContactQueryModel } from './contactQuery.schema'
import { ContactQueryStatus } from '../type/contactQuery'
import { UserModel } from '../../auth/model/auth.schema'

type CreateContactQueryPayload = {
  userId: string
  userEmail: string
  userName: string
  subject: string
  message: string
  queryType?: 'general' | 'product-request'
  productRequest?: {
    productRefId?: string | null
    preferredProductName?: string
    preferredColor?: string
    preferredCut?: string
    preferredCarat?: number
    qty?: number
    budgetPerCarat?: number
  }
  priority?: 'low' | 'medium' | 'high'
  deadlineAt?: Date | null
  attachments?: Array<{ fileName: string; fileUrl: string; mimeType?: string; uploadedAt: Date }>
}

export const createContactQuery = async (payload: CreateContactQueryPayload) => {
  return ContactQueryModel.create({
    ...payload,
    assignedToUserId: null,
    assignedToEmail: '',
    assignedToName: '',
    queryType: payload.queryType || 'general',
    productRequest: payload.productRequest || {},
    attachments: payload.attachments || [],
    actionLogs: [
      {
        action: 'query-created',
        status: 'new',
        remark: 'Query created by user',
        byUserId: payload.userId,
        createdAt: new Date(),
      },
    ],
  })
}

export const getContactQueryById = async (id: string) => {
  return ContactQueryModel.findById(id)
}

export const getContactQueriesByUser = async (userId: string) => {
  return ContactQueryModel.find({ userId }).sort({ createdAt: -1 }).lean()
}

export const getAllContactQueries = async (params: {
  status?: string
  search?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}) => {
  const {
    status = '',
    search = '',
    startDate = '',
    endDate = '',
    page = 1,
    limit = 10,
  } = params

  const query: any = {}
  if (status) query.status = status

  if (search) {
    query.$or = [
      { subject: new RegExp(search, 'i') },
      { message: new RegExp(search, 'i') },
      { 'productRequest.preferredProductName': new RegExp(search, 'i') },
      { userEmail: new RegExp(search, 'i') },
      { userName: new RegExp(search, 'i') },
    ]
  }

  if (startDate || endDate) {
    query.createdAt = {}
    if (startDate) query.createdAt.$gte = new Date(startDate)
    if (endDate) query.createdAt.$lte = new Date(endDate)
  }

  const [data, count] = await Promise.all([
    ContactQueryModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ContactQueryModel.countDocuments(query),
  ])

  return { data, count }
}

export const updateContactQueryStatus = async (args: {
  id: string
  status: ContactQueryStatus
  remark?: string
  deadlineAt?: Date | null
  assignedToUserId?: string | null
  assignedToEmail?: string
  assignedToName?: string
  byUserId?: string
  byRole?: string
}) => {
  const query = await ContactQueryModel.findById(args.id)
  if (!query) return null

  query.status = args.status
  if (args.deadlineAt !== undefined) query.deadlineAt = args.deadlineAt
  if (args.assignedToUserId !== undefined) query.assignedToUserId = args.assignedToUserId as any
  if (args.assignedToEmail !== undefined) query.assignedToEmail = args.assignedToEmail
  if (args.assignedToName !== undefined) query.assignedToName = args.assignedToName
  query.actionLogs.push({
    action: 'status-updated',
    status: args.status,
    remark: args.remark || '',
    byUserId: args.byUserId as any,
    byRole: args.byRole || '',
    createdAt: new Date(),
  } as any)

  await query.save()
  return query
}

export const getAssignableAdminUsers = async () => {
  return UserModel.find({
    role: { $in: ['admin', 'super-admin'] },
    email: { $exists: true, $ne: '' },
  })
    .select('_id firstName lastName email role')
    .sort({ firstName: 1, email: 1 })
}

export const getActiveQueriesExceptComplete = async () => {
  return ContactQueryModel.find({ status: { $ne: 'complete' } }).sort({ updatedAt: -1 })
}

export const getExpiredOpenQueries = async () => {
  return ContactQueryModel.find({
    deadlineAt: { $lt: new Date() },
    status: { $nin: ['complete', 'cancelled'] },
  }).sort({ deadlineAt: 1 })
}
