import { Router } from 'express'
import { verifyAdmin, verifyAdminOrAccountant, verifyJWT } from '../../../middleware/auth.middleware'
import {
  approveInvoiceController,
  createInvoiceController,
  fetchInvoiceController,
  listInvoicesController,
} from '../controller/invoice.controller'

const router = Router()

router.route('/invoice').post(verifyAdmin, createInvoiceController)
router.route('/invoice/:id/approve').patch(verifyAdminOrAccountant, approveInvoiceController)
router.route('/invoice/:id').get(verifyAdmin, fetchInvoiceController)
router.route('/invoice/list').post(verifyJWT, listInvoicesController)

export default router
