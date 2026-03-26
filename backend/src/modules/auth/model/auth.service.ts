import { UserModel } from './auth.schema'
import { normalizeLowercase, normalizeString, toCaseInsensitiveExactRegex } from '../../../utils/normalizer'
import { applyDateRangeFilter } from '../../../utils/dateRange'
import { applySearchFilter } from '../../../utils/queryFilter'
import { ProductModel } from '../../product/model/product.schema'
import { InvoiceModel } from '../../invoice/model/invoice.schema'
const selectFields =
  '-password -refreshToken -createdAt -updatedAt -__v -kycDocuments -address -businessName -gstNumber -panNumber -creditLimit -walletBalance -commissionRate -lastLogin -createdBy -updatedBy'
const selectDetailFields = '-password -refreshToken   -__v'
const selectProfileFields = '-password -refreshToken -__v'
export const registerUserService = async (data: any) => {
  const normalizedEmail = normalizeLowercase(data.email)
  const normalizedPhone = normalizeString(data.phone)
  const normalizedBusinessName = sanitizeBusinessName(data.businessName || '')

  if (normalizedEmail) {
    const existingEmail = await UserModel.findOne({
      email: toCaseInsensitiveExactRegex(normalizedEmail),
    })
    if (existingEmail) return { error: 'Email already exists' }
  }

  if (normalizedPhone) {
    const existingPhone = await UserModel.findOne({ phone: normalizedPhone })
    if (existingPhone) return { error: 'Phone already exists' }
  }

  if (normalizedBusinessName) {
    const availability = await checkBusinessNameAvailability(normalizedBusinessName)
    if (!availability.available) {
      return {
        error: 'Business name already exists',
        suggestions: availability.suggestions,
      }
    }
  }

  const user = await UserModel.create({
    ...data,
    email: normalizedEmail || undefined,
    phone: normalizedPhone,
    businessName: normalizedBusinessName || undefined,
  })

  return user
}

const sanitizeBusinessName = (value: string) =>
  normalizeLowercase(value)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const checkBusinessNameAvailability = async (businessName: string) => {
  const normalizedName = sanitizeBusinessName(businessName)
  if (!normalizedName) return { available: false, suggestions: [] as string[] }

  const exists = await UserModel.findOne({
    businessName: toCaseInsensitiveExactRegex(normalizedName),
  })

  if (!exists) {
    return { available: true, suggestions: [normalizedName] }
  }

  const candidateSet = new Set<string>()
  const base = normalizedName.replace(/\s+/g, '-')
  const suffixes = ['jewels', 'gold', 'studio', 'official']
  suffixes.forEach((suffix) => candidateSet.add(`${base}-${suffix}`))
  for (let i = 1; i <= 10; i += 1) {
    candidateSet.add(`${base}-${i}`)
  }

  const candidates = Array.from(candidateSet)
  if (!candidates.length) return { available: false, suggestions: [] as string[] }

  const existingCandidates = await UserModel.find({
    businessName: { $in: candidates.map((name) => toCaseInsensitiveExactRegex(name)) },
  }).select('businessName')

  const existingSet = new Set(existingCandidates.map((item: any) => normalizeLowercase(item.businessName || '')))

  const suggestions = candidates.filter((name) => !existingSet.has(normalizeLowercase(name))).slice(0, 5)

  return { available: false, suggestions }
}

export const findUserByEmailOrPhone = async (identifier: string) => {
  const normalizedIdentifier = normalizeString(identifier)
  const normalizedEmail = normalizeLowercase(identifier)

  return UserModel.findOne({
    $or: [{ email: toCaseInsensitiveExactRegex(normalizedEmail) }, { phone: normalizedIdentifier }],
  })
}

export const findUserByEmail = async (email: string) => {
  return UserModel.findOne({ email: toCaseInsensitiveExactRegex(normalizeLowercase(email)) }).select(selectDetailFields)
}

export const findUserByEmailWithPassword = async (email: string) => {
  return UserModel.findOne({ email: toCaseInsensitiveExactRegex(normalizeLowercase(email)) })
}

export const findUserById = async (id: string) => {
  return UserModel.findById(id).select(selectFields)
}

export const updateUserRefreshToken = async (userId: string, refreshToken: string | null) => {
  await UserModel.findByIdAndUpdate(userId, { refreshToken }, { new: true }).select(selectFields)
}

export const updateUserLastLogin = async (userId: string) => {
  await UserModel.findByIdAndUpdate(userId, { lastLogin: new Date() }, { new: true })
}
interface getUserParams {
  limit?: number
  page?: number
  sort?: string
  order?: string
  search?: string
  search_by?: string
  startDate?: string
  endDate?: string
  filter?: any
}
export const getAllUsers = async (params: getUserParams) => {
  const { limit = 10, page = 1, sort = 'createdAt', order = 'DESC', search, search_by, startDate, endDate } = params
  const queryFilter: any = {}

  applySearchFilter({
    queryFilter,
    search,
    searchBy: search_by,
    searchableFields: ['firstName', 'lastName', 'email', 'phone', 'businessName'],
  })

  applyDateRangeFilter(queryFilter, 'createdAt', startDate, endDate)
  const sortOrder = order?.toUpperCase() === 'DESC' ? -1 : 1
  const sortOption: any = { [sort || 'createdAt ']: sortOrder }
  const [data, count, summaryAggregate] = await Promise.all([
    UserModel.find(queryFilter)
      .limit(limit)
      .skip((page - 1) * limit)
      .sort(sortOption)
      .select(selectDetailFields)
      .lean(),
    UserModel.countDocuments(queryFilter),
    UserModel.aggregate([
      { $match: queryFilter },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          verifiedUsers: {
            $sum: {
              $cond: [{ $eq: ['$kycVerified', true] }, 1, 0],
            },
          },
          totalCreditLimit: { $sum: { $ifNull: ['$creditLimit', 0] } },
          totalWalletBalance: { $sum: { $ifNull: ['$walletBalance', 0] } },
        },
      },
    ]),
  ])

  const aggregateSummary = summaryAggregate?.[0] || {}
  const totalUsers = Number(aggregateSummary?.totalUsers || 0)
  const verifiedUsers = Number(aggregateSummary?.verifiedUsers || 0)

  const userIds = data.map((user: any) => user?._id).filter(Boolean)
  const userEmails = data
    .map((user: any) => normalizeLowercase(user?.email || ''))
    .filter(Boolean)

  const [usageStatsRows, pendingPaymentRows] = await Promise.all([
    userIds.length
      ? ProductModel.aggregate([
          {
            $match: {
              'currentHolder.userId': { $in: userIds },
              'usage.type': { $in: ['outright', 'rented'] },
            },
          },
          {
            $group: {
              _id: {
                userId: '$currentHolder.userId',
                usageType: { $toLower: { $ifNull: ['$usage.type', ''] } },
              },
              count: {
                $sum: {
                  $ifNull: ['$qty', { $ifNull: ['$product.qty', 1] }],
                },
              },
            },
          },
        ])
      : Promise.resolve([] as any[]),
    userEmails.length
      ? InvoiceModel.aggregate([
          {
            $match: {
              userEmail: { $in: userEmails },
              status: 'PURCHASE_PENDING_PAYMENT',
            },
          },
          {
            $group: {
              _id: '$userEmail',
              pendingPaymentAmount: { $sum: { $ifNull: ['$amount', 0] } },
            },
          },
        ])
      : Promise.resolve([] as any[]),
  ])

  const usageStatsByUserId = new Map<string, { outrightProducts: number; rentedProducts: number }>()
  usageStatsRows.forEach((row: any) => {
    const userIdKey = `${row?._id?.userId || ''}`
    if (!userIdKey) return

    const usageType = `${row?._id?.usageType || ''}`.toLowerCase()
    const count = Number(row?.count || 0)

    const previous = usageStatsByUserId.get(userIdKey) || { outrightProducts: 0, rentedProducts: 0 }
    if (usageType === 'outright') previous.outrightProducts += count
    if (usageType === 'rented') previous.rentedProducts += count
    usageStatsByUserId.set(userIdKey, previous)
  })

  const pendingPaymentByEmail = new Map<string, number>()
  pendingPaymentRows.forEach((row: any) => {
    const email = normalizeLowercase(row?._id || '')
    if (!email) return
    pendingPaymentByEmail.set(email, Number(row?.pendingPaymentAmount || 0))
  })

  const enrichedData = data.map((user: any) => {
    const userIdKey = `${user?._id || ''}`
    const emailKey = normalizeLowercase(user?.email || '')
    const usageStats = usageStatsByUserId.get(userIdKey) || { outrightProducts: 0, rentedProducts: 0 }
    const pendingPaymentAmount = Number(pendingPaymentByEmail.get(emailKey) || 0)

    return {
      ...user,
      stats: {
        outrightProducts: usageStats.outrightProducts,
        rentedProducts: usageStats.rentedProducts,
        pendingPaymentAmount,
      },
    }
  })

  const displayedOutrightProducts = enrichedData.reduce(
    (total: number, user: any) => total + Number(user?.stats?.outrightProducts || 0),
    0
  )
  const displayedRentedProducts = enrichedData.reduce(
    (total: number, user: any) => total + Number(user?.stats?.rentedProducts || 0),
    0
  )
  const displayedPendingPaymentAmount = enrichedData.reduce(
    (total: number, user: any) => total + Number(user?.stats?.pendingPaymentAmount || 0),
    0
  )

  const summary = {
    totalUsers,
    verifiedUsers,
    pendingKyc: Math.max(totalUsers - verifiedUsers, 0),
    totalCreditLimit: Number(aggregateSummary?.totalCreditLimit || 0),
    totalWalletBalance: Number(aggregateSummary?.totalWalletBalance || 0),
    displayedOutrightProducts,
    displayedRentedProducts,
    displayedPendingPaymentAmount,
  }

  return { data: enrichedData, count, summary }
}
export const getUsersNames = async () => {
  const data = await UserModel.find().select('firstName lastName businessName email').lean()

  return { data }
}
export const updateUser = async (userId: string, data: any) => {
  return UserModel.findByIdAndUpdate(userId, data, { new: true }).select(selectFields)
}

export const findUserProfileById = async (id: string) => {
  return UserModel.findById(id).select(selectProfileFields)
}

export const updateUserProfileById = async (id: string, data: any) => {
  return UserModel.findByIdAndUpdate(id, data, { new: true }).select(selectProfileFields)
}

export const deleteUser = async (userId: string) => {
  return UserModel.findByIdAndDelete(userId)
}
