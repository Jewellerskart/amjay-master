import { Router } from 'express'
import { verifyAdmin, verifyJWT } from '../../../middlewares/auth.middleware'
import { getAdminNotificationsController, getHeaderSummaryController, getUserNotificationsController } from '../controller/notification.controller'

const router = Router()

router.route('/notification/admin').get(verifyAdmin, getAdminNotificationsController)
router.route('/notification/user').get(verifyJWT, getUserNotificationsController)
router.route('/notification/header-summary').get(verifyJWT, getHeaderSummaryController)

export default router

