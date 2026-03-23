import { Router } from 'express'
import { verifyAdmin } from '../../../middleware/auth.middleware'
import {
  createCommission,
  listCommissionsForInvoice,
  listCommissionsForUser,
} from '../controller/commission.controller'

const router = Router()

router.route('/commission').post(verifyAdmin, createCommission)
router.route('/commission/user/:userId').get(verifyAdmin, listCommissionsForUser)
router.route('/commission/invoice/:invoiceId').get(verifyAdmin, listCommissionsForInvoice)

export default router
