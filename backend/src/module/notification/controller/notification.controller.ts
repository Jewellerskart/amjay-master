import { Request, Response } from 'express'
import { ApiResponse, CatchError } from '../../../utils'
import { UserModel } from '../../auth/model/auth.schema'
import { getActiveQueriesExceptComplete, getExpiredOpenQueries } from '../../contact-admin/model/contactQuery.service'
import { ProductModel } from '../../product/model/product.schema'

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

  const assignedProducts = await ProductModel.find({
    origin: 'assignment',
    'currentHolder.userId': userId,
  })
    .sort({ 'currentHolder.assignedAt': -1 })
    .limit(20)
    .select('product currentHolder assignmentLogs status usage')
    .lean()

  const notifications = assignedProducts.map((p: any) => ({
    type: 'product-assigned',
    message: `Product ${p?.product?.jewelCode || ''} assigned to you`,
    assignedAt: p?.currentHolder?.assignedAt || p?.updatedAt || null,
    productId: p?._id?.toString() || '',
  }))

  return res
    .status(200)
    .json(new ApiResponse(200, { assignedProducts, notifications } as any, 'User notifications fetched successfully'))
})
