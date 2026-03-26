import { Request, Response } from 'express'
import { ApiResponse, CatchError } from '../../../utils'
import {
  createContactQuery,
  getAllContactQueries,
  getAssignableAdminUsers,
  getContactQueriesByUser,
  getContactQueryById,
  updateContactQueryStatus,
} from '../model/contactQuery.service'
import { S3Service } from '../../../config/aws'
import { sendDynamicEmail } from '../../../config/mail'
import { UserModel } from '../../auth/model/auth.schema'
import { ContactQueryMailTemplate } from '../../../mails-temp'

const getAdminRecipientEmails = async () => {
  const users = await UserModel.find({
    role: { $in: ['admin', 'super-admin'] },
    email: { $exists: true, $ne: '' },
  }).select('email')

  const fromUsers = users.map((u: any) => `${u?.email || ''}`.trim().toLowerCase()).filter(Boolean)
  const fromEnv = `${process.env.CONTACT_ADMIN_MAILS || ''}`
    .split(',')
    .map((i) => i.trim().toLowerCase())
    .filter(Boolean)

  return Array.from(new Set([...fromUsers, ...fromEnv]))
}

export const createContactQueryController = CatchError(
  async (req: Request & { user?: any; files?: any[] }, res: Response) => {
    const user = req.user
    if (!user?._id) {
      return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
    }

    const files = Array.isArray(req.files) ? req.files : []
    const attachments = await Promise.all(
      files.map(async (file: any, idx: number) => {
        const folderPath = S3Service.FoldersPath(`contact-admin/${user._id}`).Client
        const fileUrl = await S3Service.UploadFile(
          file.buffer,
          folderPath,
          `query-${Date.now()}-${idx}`,
          file.mimetype || 'application/octet-stream'
        )
        return {
          fileName: file.originalname || `attachment-${idx + 1}`,
          fileUrl,
          mimeType: file.mimetype,
          uploadedAt: new Date(),
        }
      })
    )

    const queryType = `${req.body?.queryType || 'general'}`.trim().toLowerCase()
    if (queryType === 'product-request' && `${user?.role || ''}`.toLowerCase() !== 'jeweler') {
      return res
        .status(403)
        .json(
          new ApiResponse(
            403,
            { message: 'Only jeweler can raise product-request query type' },
            'Forbidden'
          )
        )
    }

    const query = await createContactQuery({
      userId: user._id.toString(),
      userEmail: user.email,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      subject: `${req.body?.subject || ''}`.trim(),
      message: `${req.body?.message || ''}`.trim(),
      queryType: queryType === 'product-request' ? 'product-request' : 'general',
      productRequest: req.body?.productRequest || undefined,
      priority: req.body?.priority,
      deadlineAt: req.body?.deadlineAt ? new Date(req.body.deadlineAt) : null,
      attachments,
    })

    const recipients = await getAdminRecipientEmails()
    await Promise.all(
      recipients.map((recipient) =>
        sendDynamicEmail(
          recipient,
          `New Contact Query - ${query.subject}`,
          {
            title: 'New Contact Query Raised',
            subject: query.subject,
            status: query.status,
            priority: query.priority,
            message: query.message,
            userName: query.userName,
            userEmail: query.userEmail,
            assignedToName: query.assignedToName || '',
            assignedToEmail: query.assignedToEmail || '',
          },
          ContactQueryMailTemplate
        )
      )
    )

    return res.status(201).json(new ApiResponse(201, { query }, 'Contact query created successfully'))
  }
)

export const getMyContactQueriesController = CatchError(
  async (req: Request & { user?: any }, res: Response) => {
    const userId = req.user?._id?.toString()
    if (!userId) {
      return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
    }

    const queries = await getContactQueriesByUser(userId)
    return res.status(200).json(new ApiResponse(200, { queries }, 'My queries fetched successfully'))
  }
)

export const getAllContactQueriesController = CatchError(async (req: Request, res: Response) => {
  const { status, search, startDate, endDate, page, limit } = req.body
  const data = await getAllContactQueries({
    status,
    search,
    startDate,
    endDate,
    page,
    limit,
  })
  return res.status(200).json(new ApiResponse(200, data as any, 'Queries fetched successfully'))
})

export const getAssignableUsersController = CatchError(async (_req: Request, res: Response) => {
  const users = await getAssignableAdminUsers()
  const assignees = users.map((user: any) => ({
    id: user?._id?.toString(),
    email: user?.email || '',
    name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || '',
    role: user?.role || '',
  }))

  return res.status(200).json(new ApiResponse(200, { assignees }, 'Assignable users fetched successfully'))
})

export const updateContactQueryStatusController = CatchError(
  async (req: Request & { user?: any }, res: Response) => {
    const queryId = `${req.params?.id || ''}`.trim()
    if (!queryId) {
      return res.status(400).json(new ApiResponse(400, { message: 'Query id is required' }, 'Invalid input'))
    }

    const existing = await getContactQueryById(queryId)
    if (!existing) {
      return res.status(404).json(new ApiResponse(404, { message: 'Query not found' }, 'Not found'))
    }

    const rawAssignedToUserId = `${req.body?.assignedToUserId || ''}`.trim()
    const clearAssignment = req.body?.assignedToUserId === null || req.body?.assignedToUserId === ''

    let assignedToUserId: string | null | undefined = undefined
    let assignedToEmail: string | undefined = undefined
    let assignedToName: string | undefined = undefined

    if (clearAssignment) {
      assignedToUserId = null
      assignedToEmail = ''
      assignedToName = ''
    } else if (rawAssignedToUserId) {
      const assignee: any = await UserModel.findOne({
        _id: rawAssignedToUserId,
        role: { $in: ['admin', 'super-admin'] },
      }).select('_id firstName lastName email')

      if (!assignee?._id) {
        return res
          .status(400)
          .json(new ApiResponse(400, { message: 'Invalid assignee user' }, 'Invalid input'))
      }

      assignedToUserId = assignee._id.toString()
      assignedToEmail = `${assignee.email || ''}`.trim().toLowerCase()
      assignedToName =
        `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() ||
        assignedToEmail ||
        'Assigned admin'
    }

    const updated = await updateContactQueryStatus({
      id: queryId,
      status: req.body.status,
      remark: req.body.remark,
      deadlineAt: req.body?.deadlineAt ? new Date(req.body.deadlineAt) : undefined,
      assignedToUserId,
      assignedToEmail,
      assignedToName,
      byUserId: req.user?._id?.toString(),
      byRole: req.user?.role,
    })

    if (!updated) {
      return res.status(404).json(new ApiResponse(404, { message: 'Query not found' }, 'Not found'))
    }

    const recipients = Array.from(new Set([updated.userEmail, ...(await getAdminRecipientEmails())]))
    await Promise.all(
      recipients.map((recipient) =>
        sendDynamicEmail(
          recipient,
          `Contact Query Update - ${updated.subject}`,
          {
            title: 'Contact Query Status Updated',
            subject: updated.subject,
            status: updated.status,
            priority: updated.priority,
            message: updated.message,
            userName: updated.userName,
            userEmail: updated.userEmail,
            remark: req.body?.remark || '',
            assignedToName: updated.assignedToName || '',
            assignedToEmail: updated.assignedToEmail || '',
          },
          ContactQueryMailTemplate
        )
      )
    )

    return res
      .status(200)
      .json(new ApiResponse(200, { query: updated }, 'Query status updated successfully'))
  }
)
