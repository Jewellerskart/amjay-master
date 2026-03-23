import jwt from 'jsonwebtoken'
import { Response, NextFunction } from 'express'
import { UserModel } from '../module/auth/model/auth.schema'
import { ApiResponse } from '../utils'

const getAccessToken = (req: any) =>
  req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '') || null

const handleUnauthorized = (res: Response, message: string = 'Unauthorized') =>
  res.status(401).json(new ApiResponse(401, { message }, message))

const createRoleVerifier =
  (allowedRoles?: string[]) => async (req: any, res: Response, next: NextFunction) => {
    const token = getAccessToken(req)
    if (!token) {
      return handleUnauthorized(res)
    }

    const secret = process.env.ACCESS_TOKEN_SECRET
    if (!secret) {
      console.error('ACCESS_TOKEN_SECRET is not set')
      return res
        .status(500)
        .json(new ApiResponse(500, { message: 'Server misconfiguration' }, 'Internal Server Error'))
    }

    try {
      const decoded: any = jwt.verify(token, secret)
      const user = await UserModel.findById(decoded._id).select('-password -refreshToken')
      if (!user) {
        return handleUnauthorized(res, 'Invalid or expired token')
      }
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        return res
          .status(403)
          .json(new ApiResponse(403, { message: 'User not authorized' }, 'User not authorized'))
      }
      req.user = user
      next()
    } catch (error) {
      return handleUnauthorized(res, 'Invalid or expired token')
    }
  }

export const verifyJWT = createRoleVerifier()
export const verifyAdmin = createRoleVerifier(['admin', 'super-admin'])
export const verifyAdminOrAccountant = createRoleVerifier(['admin', 'super-admin', 'accountant'])
export const verifyInventoryManager = createRoleVerifier(['admin', 'super-admin', 'distributor'])
export const verifyPurchase = createRoleVerifier(['admin', 'super-admin', 'purchase'])
