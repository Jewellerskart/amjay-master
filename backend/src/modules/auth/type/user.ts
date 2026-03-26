import mongoose from 'mongoose'
import { UserRole } from '../model/auth.schema'
import { Request } from 'express'

export interface IKycDocument {
  documentType: 'aadhaar' | 'pan' | 'gst' | 'license'
  documentNumber: string
  documentUrl?: string
  verified: boolean
  verifiedAt?: Date | null
}

export interface ICommissionConfig {
  defaultRate: number
  componentRates: Record<string, number>
}

/* -----------------------------
  Address
  ------------------------------*/
export interface IAddress {
  street?: string
  city?: string
  state?: string
  country?: string
  pincode?: string
}

/* -----------------------------
  User Interface
  ------------------------------*/
export interface IUser extends Document {
  firstName: string
  lastName?: string

  email?: string
  phone: string
  password: string

  role: UserRole

  businessName?: string
  gstNumber?: string
  panNumber?: string

  address?: IAddress

  kycVerified: boolean
  kycDocuments: IKycDocument[]

  isActive: boolean
  isBlocked: boolean

  creditLimit: number
  walletBalance: number
  commissionRate: number
  commissionConfig?: ICommissionConfig

  profileImage?: string

  lastLogin?: Date

  refreshToken?: string

  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId

  createdAt: Date
  updatedAt: Date
  generateAccessToken(): string
  generateRefreshToken(time?: string): string
  isPasswordCorrect(enteredPassword: string): Promise<boolean>
}
export interface IUserReq extends Request {
  user: IUser
}
