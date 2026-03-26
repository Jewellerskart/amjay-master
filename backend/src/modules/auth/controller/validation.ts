import { z } from 'zod'
import { UserRole } from '../model/auth.schema'

const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Invalid phone number')
  .refine((value) => {
    if (!value.startsWith('+91')) return true
    return /^\+91[6-9]\d{9}$/.test(value)
  }, 'Invalid Indian phone number')

const commissionConfigSchema = z
  .object({
    defaultRate: z.coerce.number().optional(),
    componentRates: z.record(z.string(), z.coerce.number()).optional(),
  })
  .optional()

export const registerSchema = z.object({
  firstName: z.string().min(2).max(50),

  lastName: z.string().optional(),

  email: z.string().email('Invalid email').toLowerCase().optional(),
  phone: phoneSchema,

  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[!@#$%^&*]/, 'Must contain special character'),

  role: z.nativeEnum(UserRole),

  businessName: z.string().optional(),

  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/)
    .optional(),

  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .optional(),

  creditLimit: z.number().optional(),

  walletBalance: z.number().optional(),

  commissionRate: z.number().optional(),
  commissionConfig: commissionConfigSchema,

  parentDistributor: z.string().optional(),

  permissions: z.array(z.string()).optional(),

  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      pincode: z.string().optional(),
    })
    .optional(),
})
export const loginSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(8),
})

export const checkBusinessNameSchema = z.object({
  businessName: z.string().min(2).max(100),
})

export const getUsersSchema = z.object({
  limit: z.coerce.number().optional().default(10),
  page: z.coerce.number().optional().default(1),
  sort: z.string().optional().default('createdAt'),
  order: z.enum(['ASC', 'DESC']).optional().default('DESC'),
  search: z.string().optional().default(''),
  search_by: z
    .enum(['email', 'phone', 'firstName', 'lastName', 'businessName', ''])
    .optional()
    .default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  isBlocked: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
})

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().max(50).optional(),
  phone: phoneSchema.optional(),
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/)
    .optional(),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      pincode: z.string().optional(),
    })
    .optional(),
})

export const updateUserByAdminSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().max(50).optional(),
  phone: phoneSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/)
    .optional(),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .optional(),
  creditLimit: z.coerce.number().optional(),
  walletBalance: z.coerce.number().optional(),
  commissionRate: z.coerce.number().optional(),
  commissionConfig: commissionConfigSchema,
  isActive: z.coerce.boolean().optional(),
  isBlocked: z.coerce.boolean().optional(),
  kycVerified: z.coerce.boolean().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      pincode: z.string().optional(),
    })
    .optional(),
})
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
})

export const verifyForgotPasswordOtpSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
  otp: z.string().regex(/^\d{6}$/, 'Invalid OTP'),
  otpTaskId: z.string().min(8).max(128),
})

export const resetPasswordWithOtpSchema = z
  .object({
    email: z.string().email('Invalid email').toLowerCase(),
    otp: z.string().regex(/^\d{6}$/, 'Invalid OTP'),
    otpTaskId: z.string().min(8).max(128),
    newPassword: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/[0-9]/, 'Must contain number')
      .regex(/[!@#$%^&*]/, 'Must contain special character'),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Password and confirm password do not match',
  })
