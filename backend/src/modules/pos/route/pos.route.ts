import { Router } from 'express'
import { verifyJWT } from '../../../middlewares/auth.middleware'
import { validateRequest } from '../../../utils/CatchError'
import { posReportController, sellProductController } from '../controller/pos.controller'
import { sellProductSchema } from '../controller/pos.validation'

const router = Router()

router.route('/pos/sell').post(verifyJWT, validateRequest(sellProductSchema), sellProductController)
router.route('/pos/report').get(verifyJWT, posReportController)

export default router

