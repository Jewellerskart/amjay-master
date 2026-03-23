import { Router } from 'express'
import { verifyJWT } from '../../../middleware/auth.middleware'
import { validateRequest } from '../../../utils/CatchError'
import { sellProductController } from '../controller/pos.controller'
import { sellProductSchema } from '../controller/pos.validation'

const router = Router()

router.route('/pos/sell').post(verifyJWT, validateRequest(sellProductSchema), sellProductController)

export default router
