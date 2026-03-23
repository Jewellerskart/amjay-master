import mongoose, { Schema } from 'mongoose'
import { IUser } from '../type/user'
import bcrypt from 'bcryptjs'
import { SignOptions, Secret } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
export enum UserRole {
  SUPER_ADMIN = 'super-admin',
  ADMIN = 'admin',
  DISTRIBUTOR = 'distributor',
  JEWELER = 'jeweler',
  STAFF = 'staff',
  ACCOUNTANT = 'accountant',
  PURCHASE = 'purchase',
}

const UserSchema: Schema<IUser> = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.JEWELER },
    businessName: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    gstNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    address: { street: String, city: String, state: String, country: String, pincode: String },
    kycVerified: { type: Boolean, default: false },
    kycDocuments: [
      {
        documentType: { type: String, enum: ['aadhaar', 'pan', 'gst', 'license'] },
        documentNumber: String,
        documentUrl: String,
        verified: { type: Boolean, default: false },
        verifiedAt: { type: Date, default: null },
      },
    ],
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    creditLimit: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
    lastLogin: { type: Date, default: null },
    refreshToken: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
)

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

UserSchema.methods.isPasswordCorrect = async function (enteredPassword: string) {
  return bcrypt.compare(enteredPassword, this.password)
}

UserSchema.methods.generateAccessToken = function () {
  const secret = process.env.ACCESS_TOKEN_SECRET
  if (!secret) throw new Error('ACCESS_TOKEN_SECRET is not set')
  const expiresIn = (process.env.ACCESS_TOKEN_EXPIRY || '15m') as SignOptions['expiresIn']
  return jwt.sign(
    { _id: this._id.toString(), role: this.role },
    secret as Secret,
    { expiresIn } as SignOptions
  )
}

UserSchema.methods.generateRefreshToken = function (time?: string) {
  const secret = process.env.REFRESH_TOKEN_SECRET
  if (!secret) throw new Error('REFRESH_TOKEN_SECRET is not set')
  const expiresIn = (time || process.env.REFRESH_TOKEN_EXPIRY || '7d') as SignOptions['expiresIn']
  return jwt.sign({ _id: this._id.toString() }, secret as Secret, { expiresIn } as SignOptions)
}

export const UserModel = mongoose.model<IUser>('User', UserSchema, 'user')
