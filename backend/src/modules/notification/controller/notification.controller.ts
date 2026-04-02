import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { ApiResponse, CatchError } from '../../../utils'
import { UserModel } from '../../auth/model/auth.schema'
import { getActiveQueriesExceptComplete, getExpiredOpenQueries } from '../../contact-admin/model/contactQuery.service'
import { ContactQueryModel } from '../../contact-admin/model/contactQuery.schema'
import { InvoiceModel } from '../../invoice/model/invoice.schema'
import { ProductModel } from '../../product/model/product.schema'
import { TicketModel } from '../../ticket/model/ticket.schema'

export const getAdminNotificationsController = CatchError(async (_req: Request, res: Response) => {
  const [usersWithIncompleteKyc, expiredQueries, activeQueries] = await Promise.all([
    UserModel.find({
      $or: [{ kycVerified: { $ne: true } }, { kycDocuments: { $exists: false } }, { kycDocuments: { $size: 0 } }],
    }).select('firstName lastName email role kycVerified kycDocuments updatedAt'),
    getExpiredOpenQueries(),
    getActiveQueriesExceptComplete(),
  ])

  const notifications = [
    ...usersWithIncompleteKyc.map((user: any) => ({
      type: 'kyc-incomplete',
      severity: 'high',
      message: `KYC incomplete for ${user?.email || 'user'}`,
      userEmail: user?.email || '',
      updatedAt: user?.updatedAt || null,
    })),
    ...expiredQueries.map((query: any) => ({
      type: 'query-deadline-expired',
      severity: 'high',
      message: `Deadline expired for query "${query?.subject || '-'}"`,
      queryId: query?._id?.toString() || '',
      userEmail: query?.userEmail || '',
      deadlineAt: query?.deadlineAt || null,
    })),
    ...activeQueries.map((query: any) => ({
      type: 'query-active-status',
      severity: 'medium',
      message: `Query "${query?.subject || '-'}" is in status "${query?.status}"`,
      queryId: query?._id?.toString() || '',
      userEmail: query?.userEmail || '',
      status: query?.status || '',
      updatedAt: query?.updatedAt || null,
    })),
  ]

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        usersWithIncompleteKyc,
        expiredQueries,
        activeQueries,
        notifications,
      } as any,
      'Admin notifications fetched successfully'
    )
  )
})

export const getUserNotificationsController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const userId = `${req.user?._id || ''}`.trim()
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
  }

  const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null
  const assignedProducts = await ProductModel.aggregate([
    { $match: { 'usage.type': { $in: ['pending', 'assigned'] } } },
    {
      $addFields: {
        latestAssignmentLog: { $arrayElemAt: [{ $ifNull: ['$assignmentLogs', []] }, -1] },
      },
    },
    {
      $match: userObjectId
        ? {
            $or: [{ 'latestAssignmentLog.toUserId': userObjectId }, { 'currentHolder.userId': userObjectId }],
          }
        : { _id: null },
    },
    { $sort: { 'latestAssignmentLog.assignedAt': -1, updatedAt: -1 } },
    { $limit: 20 },
    { $project: { product: 1, currentHolder: 1, assignmentLogs: 1, status: 1, usage: 1, updatedAt: 1, latestAssignmentLog: 1 } },
  ])

  const notifications = assignedProducts.map((p: any) => ({
    type: 'product-assigned',
    message: `Product ${p?.product?.jewelCode || ''} assigned to you`,
    assignedAt: p?.latestAssignmentLog?.assignedAt || p?.currentHolder?.assignedAt || p?.updatedAt || null,
    productId: p?._id?.toString() || '',
  }))

  return res
    .status(200)
    .json(new ApiResponse(200, { assignedProducts, notifications } as any, 'User notifications fetched successfully'))
})

const isAdminRole = (role: string) => ['super-admin', 'admin'].includes(role)
const isAccountantRole = (role: string) => role === 'accountant'
const isDistributorRole = (role: string) => role === 'distributor'
const isJewelerRole = (role: string) => role === 'jeweler'
const isPurchaseRole = (role: string) => role === 'purchase'

export const getHeaderSummaryController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const userId = `${req.user?._id || ''}`.trim()
  const userEmail = `${req.user?.email || ''}`.trim().toLowerCase()
  const role = `${req.user?.role || ''}`.trim().toLowerCase()
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
  }

  const userObjectId = new mongoose.Types.ObjectId(userId)
  const adminUser = isAdminRole(role)
  const canApproveInvoices = adminUser || isAccountantRole(role)
  const canViewMyInvoices = adminUser || isDistributorRole(role) || isJewelerRole(role)
  const canManageRateCharts = adminUser || isDistributorRole(role)
  const canViewAllTickets = adminUser || isPurchaseRole(role)
  const unresolvedContactStatuses = ['new', 'in-progress', 'waiting-user']
  const pendingInvoiceStatuses = ['PURCHASE_PENDING_PAYMENT', 'MEMO_PENDING_PAYMENT']

  const [
    pendingKycCount,
    pendingAssignmentCount,
    invoiceApprovalCount,
    myPendingInvoiceCount,
    contactPendingCount,
    supportTicketCount,
    missingDiamondCount,
  ] = await Promise.all([
    adminUser
      ? UserModel.countDocuments({
          $or: [{ kycVerified: { $ne: true } }, { kycDocuments: { $exists: false } }, { kycDocuments: { $size: 0 } }],
        })
      : Promise.resolve(0),
    ProductModel.countDocuments({
      'usage.type': { $in: ['pending', 'assigned'] },
      $or: [{ 'currentHolder.userId': userObjectId }, { 'assignmentLogs.toUserId': userObjectId }],
    }),
    canApproveInvoices ? InvoiceModel.countDocuments({ status: { $in: pendingInvoiceStatuses } }) : Promise.resolve(0),
    canViewMyInvoices && userEmail
      ? InvoiceModel.countDocuments({ status: { $in: pendingInvoiceStatuses }, userEmail })
      : Promise.resolve(0),
    adminUser
      ? ContactQueryModel.countDocuments({ status: { $in: unresolvedContactStatuses } })
      : ContactQueryModel.countDocuments({ userId: userObjectId, status: { $in: unresolvedContactStatuses } }),
    canViewAllTickets
      ? TicketModel.countDocuments({ status: { $in: ['OPEN', 'IN_PROGRESS'] } })
      : TicketModel.countDocuments({ requestedBy: userObjectId, status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
    canManageRateCharts
      ? ProductModel.aggregate([
          { $unwind: '$components' },
          {
            $match: {
              'components.type': 'diamond',
              $or: [{ 'components.amount': { $lte: 0 } }, { 'components.amount': { $exists: false } }],
            },
          },
          { $group: { _id: '$components.itemCode' } },
          { $count: 'count' },
        ]).then((rows: any[]) => Number(rows?.[0]?.count || 0))
      : Promise.resolve(0),
  ])

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        pendingKycCount: Number(pendingKycCount || 0),
        pendingAssignmentCount: Number(pendingAssignmentCount || 0),
        invoiceApprovalCount: Number(invoiceApprovalCount || 0),
        myPendingInvoiceCount: Number(myPendingInvoiceCount || 0),
        contactPendingCount: Number(contactPendingCount || 0),
        supportTicketCount: Number(supportTicketCount || 0),
        missingDiamondCount: Number(missingDiamondCount || 0),
      } as any,
      'Header summary fetched successfully'
    )
  )
})
