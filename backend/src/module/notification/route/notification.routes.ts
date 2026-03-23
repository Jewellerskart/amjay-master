import { Router } from 'express'
import { verifyAdmin, verifyJWT } from '../../../middleware/auth.middleware'
import { getAdminNotificationsController, getUserNotificationsController } from '../controller/notification.controller'

const router = Router()

router.route('/notification/admin').get(verifyAdmin, getAdminNotificationsController)
router.route('/notification/user').get(verifyJWT, getUserNotificationsController)

export default router
