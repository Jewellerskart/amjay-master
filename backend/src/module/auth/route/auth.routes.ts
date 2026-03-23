import { Router } from 'express'
import {
  GetLoginSellerData,
  GetUsersProfile,
  checkBusinessName,
  deleteUserByEmailForAdmin,
  getUserByEmailForAdmin,
  getMyProfile,
  loginUser,
  logoutUser,
  refreshToken,
  registerUser,
  resetPasswordWithOtp,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  updateUserByEmailForAdmin,
  updateMyProfile,
  upsertKycDocument,
  GetUsersNames,
} from '../controller/auth.controller'
import {
  getUsersSchema,
  loginSchema,
  registerSchema,
  checkBusinessNameSchema,
  forgotPasswordSchema,
  resetPasswordWithOtpSchema,
  verifyForgotPasswordOtpSchema,
  updateProfileSchema,
  updateUserByAdminSchema,
} from '../controller/validation'
import { validateRequest } from '../../../utils/CatchError'
import { loginRateLimiter, registerRateLimiter } from './rate.limiter'
import { verifyAdmin, verifyInventoryManager, verifyJWT } from '../../../middleware/auth.middleware'
import { KycDocumentUpload } from '../../../config/multer'

const router = Router()

router.route('/register-user').put(verifyAdmin, registerRateLimiter, validateRequest(registerSchema), registerUser)
router.route('/check-business-name').post(verifyAdmin, validateRequest(checkBusinessNameSchema), checkBusinessName)
router.route('/login').post(loginRateLimiter, validateRequest(loginSchema), loginUser)
router.route('/forgot-password').post(validateRequest(forgotPasswordSchema), sendForgotPasswordOtp)
router.route('/verify-forgot-password-otp').post(validateRequest(verifyForgotPasswordOtpSchema), verifyForgotPasswordOtp)
router.route('/reset-password').post(validateRequest(resetPasswordWithOtpSchema), resetPasswordWithOtp)
router.route('/logout').post(verifyJWT, logoutUser)
router.route('/refresh-token').post(refreshToken)
router.route('/get-users').post(verifyAdmin, validateRequest(getUsersSchema), GetUsersProfile)

router.route('/get-users-name').get(verifyInventoryManager, GetUsersNames)
router.route('/login-user').get(verifyJWT, GetLoginSellerData)
router.route('/profile').get(verifyJWT, getMyProfile).put(verifyJWT, validateRequest(updateProfileSchema), updateMyProfile)
router.route('/profile/kyc/:userId').post(verifyAdmin, KycDocumentUpload.single('document'), upsertKycDocument)
router
  .route('/admin-user/:email')
  .get(verifyAdmin, getUserByEmailForAdmin)
  .put(verifyAdmin, validateRequest(updateUserByAdminSchema), updateUserByEmailForAdmin)
  .delete(verifyAdmin, deleteUserByEmailForAdmin)

export default router
