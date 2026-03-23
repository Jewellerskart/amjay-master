import { Router } from 'express'
import { verifyAdmin, verifyJWT } from '../../../middleware/auth.middleware'
import {
  getMyWallet,
  getWalletByUserId,
  updateWalletController,
} from '../controller/wallet.controller'

const router = Router()

router.route('/wallet/me').get(verifyJWT, getMyWallet)
router.route('/wallet/:userId').get(verifyAdmin, getWalletByUserId).patch(verifyAdmin, updateWalletController)

export default router
