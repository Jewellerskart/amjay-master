import { Router } from 'express'
import { verifyAdmin, verifyJWT, verifyPurchase } from '../../../middleware/auth.middleware'
import {
  createPurchaseTicket,
  listPurchaseTickets,
  updateTicket,
} from '../controller/ticket.controller'

const router = Router()

router.route('/ticket/purchase').post(verifyJWT, createPurchaseTicket)
router.route('/ticket/list').post(verifyPurchase, listPurchaseTickets)
router.route('/ticket/:id').patch(verifyPurchase, updateTicket)

export default router
