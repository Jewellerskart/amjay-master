import { Request, Response } from 'express'
import { ApiResponse, CatchError, CookOptions, preDataProcess } from '../../../utils'
import { UserRole } from '../model/auth.schema'
import jwt from 'jsonwebtoken'
import {
  checkBusinessNameAvailability,
  deleteUser,
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserByEmailOrPhone,
  findUserById,
  findUserProfileById,
  getAllUsers,
  registerUserService,
  updateUserProfileById,
  updateUserRefreshToken,
  getUsersNames,
} from '../model/auth.service'
import { UserModel } from '../model/auth.schema'
import { S3Service } from '../../../config/aws'
import { normalizeLowercase, normalizeString } from '../../../utils/normalizer'
import { Otp } from '../model/otp.schema'
import { sendDynamicEmail } from '../../../config/mail'
import { OtpMail } from '../../../mails-temp'
import { Generator } from '../../../utils/common'

function isValidRole(role: string): boolean {
  return Object.values(UserRole).includes(role as UserRole)
}

export const registerUser = CatchError(async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req?.body
    const { businessName, gstNumber, panNumber, address } = req?.body
    const { creditLimit, walletBalance, commissionRate } = req?.body
    if (!isValidRole(role)) {
      return res.status(400).json(new ApiResponse(400, { message: 'Invalid role' }, 'Invalid role'))
    }
    const payload = {
      firstName,
      lastName,
      email: normalizeLowercase(email),
      phone: normalizeString(phone),
      password,
      role,
      businessName: normalizeLowercase(businessName),
      gstNumber,
      panNumber,
      address,
      creditLimit,
      walletBalance,
      commissionRate,
    }
    const user: any = await registerUserService(payload)

    if (user?.error) {
      return res
        .status(400)
        .json(new ApiResponse(400, { message: user.error, suggestions: Array.isArray(user?.suggestions) ? user.suggestions : [] }, user.error))
    }

    res.json(new ApiResponse(201, { user }, 'User created'))
  } catch (error) {
    console.log(error)
    res.status(500).json(new ApiResponse(500, { error }, 'Error'))
  }
})

export const checkBusinessName = CatchError(async (req: Request, res: Response) => {
  const businessName = normalizeString(`${req.body?.businessName || ''}`)
  if (!businessName) {
    return res.status(400).json(new ApiResponse(400, { message: 'businessName is required' }, 'Invalid input'))
  }

  const availability = await checkBusinessNameAvailability(businessName)

  return res.status(200).json(new ApiResponse(200, availability, 'Business name availability fetched successfully'))
})

export const refreshToken = CatchError(async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken || req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
    }
    const decoded: any = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!)
    if (!decoded?._id) {
      return res.status(401).json(new ApiResponse(401, { message: 'Invalid token 1' }, 'Invalid token'))
    }
    const user: any = await UserModel.findById(decoded._id).select('-password')
    if (!user) {
      return res.status(401).json(new ApiResponse(401, { message: 'Invalid token 2' }, 'Invalid token'))
    }
    if (user.refreshToken !== token) {
      return res.status(401).json(new ApiResponse(401, { message: 'Token mismatch' }, 'Invalid token'))
    }
    const accessToken = user?.generateAccessToken()
    const nextRefreshToken = user?.generateRefreshToken()
    if (!accessToken) {
      return res.status(401).json(new ApiResponse(401, { message: 'Invalid token 3' }, 'Invalid token'))
    }

    if (nextRefreshToken) {
      await updateUserRefreshToken(user._id.toString(), nextRefreshToken)
      res.cookie('refreshToken', nextRefreshToken, CookOptions)
    }

    res.cookie('accessToken', accessToken, CookOptions)
    return res.status(200).json(new ApiResponse(200, { accessToken, refreshToken: nextRefreshToken }, 'Token refreshed successfully'))
  } catch (error) {
    console.log(error)
    return res.status(401).json(new ApiResponse(401, { message: 'Invalid token 4' }, 'Invalid token'))
  }
})

export const loginUser = CatchError(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const user = await findUserByEmailOrPhone(email)
    if (!user) {
      return res.status(401).json(new ApiResponse(401, { message: 'User not found' }, 'Invalid credentials'))
    }
    const isPasswordCorrect = await user?.isPasswordCorrect(password)
    if (!isPasswordCorrect) {
      return res.status(401).json(new ApiResponse(401, { message: 'Invalid password' }, 'Invalid credentials'))
    }
    const accessToken = user?.generateAccessToken()
    if (!accessToken) {
      return res.status(401).json(new ApiResponse(401, { message: 'Access token generation failed' }, 'Invalid credentials'))
    }
    const refreshToken = user?.generateRefreshToken()
    if (!refreshToken) {
      return res.status(401).json(new ApiResponse(401, { message: 'Refresh token generation failed' }, 'Invalid credentials'))
    }
    await updateUserRefreshToken(user._id.toString(), refreshToken)
    res.cookie('accessToken', accessToken, CookOptions)
    res.cookie('refreshToken', refreshToken, CookOptions)
    return res.status(200).json(new ApiResponse(200, { accessToken, refreshToken }, 'Login successful'))
  } catch (error) {
    console.log(error)
    return res.status(401).json(new ApiResponse(401, { message: 'Invalid credentials' }, 'Invalid credentials'))
  }
})

const OTP_VALIDITY_MS = 10 * 60 * 1000

const validateForgotPasswordTask = async ({ email, otp, otpTaskId }: { email: string; otp: string; otpTaskId: string }) => {
  const otpRecord = await Otp.findOne({ email })
  if (!otpRecord) {
    return { valid: false, message: 'OTP task not found. Please request a new OTP.' }
  }

  const now = new Date()
  if (otpRecord.otpTaskId !== otpTaskId || otpRecord.otpTaskIdExp < now) {
    return { valid: false, message: 'OTP task expired or invalid. Please request a new OTP.' }
  }
  if (otpRecord.expiresAt < now) {
    return { valid: false, message: 'OTP expired. Please request a new OTP.' }
  }
  if (otpRecord.otp !== otp) {
    return { valid: false, message: 'Invalid OTP' }
  }

  return { valid: true, otpRecord }
}

export const sendForgotPasswordOtp = CatchError(async (req: Request, res: Response) => {
  const email = normalizeLowercase(req.body?.email)
  const user = await findUserByEmail(email)
  if (!user) {
    return res.status(404).json(new ApiResponse(404, { message: 'User not found' }, 'User not found'))
  }

  const otp = Generator.OTP(6)
  const otpTaskId = Generator.String(32)
  const expiresAt = new Date(Date.now() + OTP_VALIDITY_MS)

  await Otp.findOneAndUpdate(
    { email },
    { email, otp, otpTaskId, expiresAt, otpTaskIdExp: expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  const mailSent = await sendDynamicEmail(email, 'Reset Password OTP', { otp }, OtpMail)
  if (!mailSent) {
    return res.status(500).json(new ApiResponse(500, { message: 'Failed to send OTP' }, 'Failed to send OTP'))
  }

  return res.status(200).json(new ApiResponse(200, { email, otpTaskId, expiresInSeconds: OTP_VALIDITY_MS / 1000 }, 'OTP sent successfully'))
})

export const verifyForgotPasswordOtp = CatchError(async (req: Request, res: Response) => {
  const email = normalizeLowercase(req.body?.email)
  const otp = `${req.body?.otp || ''}`.trim()
  const otpTaskId = `${req.body?.otpTaskId || ''}`.trim()

  const validation = await validateForgotPasswordTask({ email, otp, otpTaskId })
  if (!validation.valid) {
    return res.status(400).json(new ApiResponse(400, { message: validation.message }, validation.message || 'Invalid OTP'))
  }

  return res.status(200).json(new ApiResponse(200, { email, otpTaskId }, 'OTP verified successfully'))
})

export const resetPasswordWithOtp = CatchError(async (req: Request, res: Response) => {
  const email = normalizeLowercase(req.body?.email)
  const otp = `${req.body?.otp || ''}`.trim()
  const otpTaskId = `${req.body?.otpTaskId || ''}`.trim()
  const newPassword = `${req.body?.newPassword || ''}`

  const validation = await validateForgotPasswordTask({ email, otp, otpTaskId })
  if (!validation.valid) {
    return res.status(400).json(new ApiResponse(400, { message: validation.message }, validation.message || 'Invalid OTP'))
  }

  const user: any = await findUserByEmailWithPassword(email)
  if (!user) {
    return res.status(404).json(new ApiResponse(404, { message: 'User not found' }, 'User not found'))
  }

  user.password = newPassword
  await user.save()
  await Otp.deleteOne({ email })

  return res.status(200).json(new ApiResponse(200, {}, 'Password reset successfully'))
})

export const logoutUser = CatchError(async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken || req.header('Authorization')?.replace('Bearer ', '')
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!)
        if (decoded?._id) {
          await updateUserRefreshToken(decoded._id, null)
        }
      } catch (_) {
        // ignore token errors during logout
      }
    }
    res.clearCookie('accessToken', CookOptions)
    res.clearCookie('refreshToken', CookOptions)
    return res.status(200).json(new ApiResponse(200, {}, 'Logout successful'))
  } catch (error) {
    res.clearCookie('accessToken', CookOptions)
    res.clearCookie('refreshToken', CookOptions)
    return res.status(200).json(new ApiResponse(200, {}, 'Logout successful'))
  }
})

export const GetUsersProfile = CatchError(async (req: Request, res: Response) => {
  try {
    const { limit, page, sort, order, startDate, endDate, search, search_by } = preDataProcess(req.body)
    const filter = req.body?.filter || {}
    const payload: any = { limit, page, sort, order, startDate, endDate, search, search_by }
    const result = await getAllUsers({ ...payload })
    return res.status(200).json(new ApiResponse(200, { ...result, limit, page }, 'Users fetched successfully'))
  } catch (error) {
    console.log(error)
    return res.status(500).json(new ApiResponse(500, { message: 'Error fetching users' }, 'Error'))
  }
})
export const GetUsersNames = CatchError(async (req: Request, res: Response) => {
  try {
    const result = await getUsersNames()
    return res.status(200).json(new ApiResponse(200, { ...result }, 'Users fetched successfully'))
  } catch (error) {
    console.log(error)
    return res.status(500).json(new ApiResponse(500, { message: 'Error fetching users' }, 'Error'))
  }
})

export const GetLoginSellerData = CatchError(async (req: Request & { user?: { id: string } }, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
    }
    const user = await findUserById(userId)
    if (!user) {
      return res.status(404).json(new ApiResponse(404, { message: 'User not found' }, 'Not found'))
    }
    return res.status(200).json(new ApiResponse(200, { user }, 'User data fetched successfully'))
  } catch (error) {
    console.log(error)
    return res.status(500).json(new ApiResponse(500, { message: 'Error fetching user data' }, 'Error'))
  }
})

const ALLOWED_DOCUMENT_TYPES = ['aadhaar', 'pan', 'gst', 'license']

const parseBooleanLike = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return undefined
}

const getUserFolderBase = (user: any) => `${user?.businessName || user?.email || user?._id?.toString() || 'unknown-user'}`.trim().replace(/\s+/g, '-')

export const getMyProfile = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user?._id?.toString()
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
  }

  const user = await findUserProfileById(userId)
  if (!user) {
    return res.status(404).json(new ApiResponse(404, { message: 'User not found' }, 'Not found'))
  }

  return res.status(200).json(new ApiResponse(200, { user }, 'Profile fetched successfully'))
})

export const updateMyProfile = CatchError(async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user?._id?.toString()
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
  }

  const allowedPayload = {
    firstName: normalizeString(req.body?.firstName) || undefined,
    lastName: normalizeString(req.body?.lastName) || undefined,
    phone: req.body?.phone ? normalizeString(req.body?.phone) : undefined,
    gstNumber: req.body?.gstNumber,
    panNumber: req.body?.panNumber,
    address: req.body?.address,
  }

  const cleanedPayload = Object.fromEntries(Object.entries(allowedPayload).filter(([, value]) => value !== undefined))

  const updatedUser = await updateUserProfileById(userId, cleanedPayload)
  if (!updatedUser) {
    return res.status(404).json(new ApiResponse(404, { message: 'User not found' }, 'Not found'))
  }

  return res.status(200).json(new ApiResponse(200, { user: updatedUser }, 'Profile updated successfully'))
})

export const upsertKycDocument = CatchError(async (req: Request & { user?: any; file?: any }, res: Response) => {
  const userId = `${req.params?.userId || ''}`.trim()
  if (!userId) {
    return res.status(400).json(new ApiResponse(400, { message: 'userId is required' }, 'Invalid input'))
  }

  const documentType = `${req.body?.documentType || ''}`.toLowerCase()
  const documentNumber = `${req.body?.documentNumber || ''}`.trim()
  const verified = parseBooleanLike(req.body?.verified)
  const file = req.file

  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    return res.status(400).json(new ApiResponse(400, { message: 'Invalid documentType' }, 'Invalid documentType'))
  }

  if (!documentNumber) {
    return res.status(400).json(new ApiResponse(400, { message: 'documentNumber is required' }, 'Invalid input'))
  }

  const user = await findUserProfileById(userId)
  if (!user) {
    return res.status(404).json(new ApiResponse(404, { message: 'User not found' }, 'Not found'))
  }

  const existingDocs: any[] = Array.isArray(user.kycDocuments) ? [...user.kycDocuments] : []
  const existingIndex = existingDocs.findIndex((doc) => doc.documentType === documentType)
  const existingDoc = existingIndex >= 0 ? existingDocs[existingIndex] : undefined

  if (!file?.buffer && !existingDoc) {
    return res.status(400).json(new ApiResponse(400, { message: 'document file is required for new document type' }, 'Invalid input'))
  }

  let documentUrl = existingDoc?.documentUrl
  if (file?.buffer) {
    const folderBase = getUserFolderBase(user)
    const folderPath = S3Service.FoldersPath(`${folderBase}/kyc`).Client
    const fileName = `${documentType}-${Date.now()}`
    documentUrl = await S3Service.UploadFile(file.buffer, folderPath, fileName, file.mimetype || 'application/octet-stream')
  }

  const nextVerified = verified ?? existingDoc?.verified ?? false
  let nextVerifiedAt = existingDoc?.verifiedAt || null
  if (verified === true && !existingDoc?.verifiedAt) {
    nextVerifiedAt = new Date()
  }
  if (verified === true && existingDoc?.verified === false) {
    nextVerifiedAt = new Date()
  }
  if (verified === false) {
    nextVerifiedAt = null
  }

  const nextDoc = {
    documentType,
    documentNumber,
    documentUrl,
    verified: nextVerified,
    verifiedAt: nextVerifiedAt,
  }

  const normalizedDocs = existingDocs.filter((doc) => doc.documentType !== documentType)
  normalizedDocs.push(nextDoc)

  const updatedUser = await updateUserProfileById(userId, {
    kycDocuments: normalizedDocs,
  })

  return res.status(200).json(new ApiResponse(200, { user: updatedUser }, 'KYC document uploaded successfully'))
})

export const getUserByEmailForAdmin = CatchError(async (req: Request, res: Response) => {
  const email = decodeURIComponent(`${req.params?.email || ''}`)
    .trim()
    .toLowerCase()

  if (!email) {
    return res.status(400).json(new ApiResponse(400, { message: 'email is required' }, 'Invalid input'))
  }

  const user = await findUserByEmail(email)
  if (!user) {
    return res.status(404).json(new ApiResponse(404, { message: 'User not found' }, 'Not found'))
  }

  return res.status(200).json(new ApiResponse(200, { user }, 'User fetched successfully'))
})

export const updateUserByEmailForAdmin = CatchError(async (req: Request, res: Response) => {
  const email = decodeURIComponent(`${req.params?.email || ''}`)
    .trim()
    .toLowerCase()

  if (!email) {
    return res.status(400).json(new ApiResponse(400, { message: 'email is required' }, 'Invalid input'))
  }

  const existingUser: any = await findUserByEmail(email)
  if (!existingUser?._id) {
    return res.status(404).json(new ApiResponse(404, { message: 'User not found' }, 'Not found'))
  }

  const allowedPayload = {
    firstName: normalizeString(req.body?.firstName) || undefined,
    lastName: normalizeString(req.body?.lastName) || undefined,
    phone: req.body?.phone ? normalizeString(req.body?.phone) : undefined,
    role: req.body?.role,
    gstNumber: req.body?.gstNumber,
    panNumber: req.body?.panNumber,
    creditLimit: req.body?.creditLimit,
    walletBalance: req.body?.walletBalance,
    commissionRate: req.body?.commissionRate,
    isActive: req.body?.isActive,
    isBlocked: req.body?.isBlocked,
    kycVerified: req.body?.kycVerified,
    address: req.body?.address,
  }

  const cleanedPayload = Object.fromEntries(Object.entries(allowedPayload).filter(([, value]) => value !== undefined))

  const updatedUser = await updateUserProfileById(existingUser._id.toString(), cleanedPayload)
  if (!updatedUser) {
    return res.status(404).json(new ApiResponse(404, { message: 'User not found' }, 'Not found'))
  }

  return res.status(200).json(new ApiResponse(200, { user: updatedUser }, 'User updated successfully'))
})

export const deleteUserByEmailForAdmin = CatchError(async (req: Request, res: Response) => {
  const email = decodeURIComponent(`${req.params?.email || ''}`)
    .trim()
    .toLowerCase()

  if (!email) {
    return res.status(400).json(new ApiResponse(400, { message: 'email is required' }, 'Invalid input'))
  }

  const existingUser: any = await findUserByEmail(email)
  if (!existingUser?._id) {
    return res.status(404).json(new ApiResponse(404, { message: 'User not found' }, 'Not found'))
  }

  const folderBase = getUserFolderBase(existingUser)
  const folderPath = S3Service.FoldersPath(folderBase).Client
  await S3Service.DeleteFolderData(folderPath)

  await deleteUser(existingUser._id.toString())

  return res.status(200).json(new ApiResponse(200, {}, 'User deleted successfully'))
})
