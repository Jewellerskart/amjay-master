import { Router } from 'express'
import { validateRequest } from '../../../utils/CatchError'
import { verifyInventoryManager, verifyJWT } from '../../../middleware/auth.middleware'
import {
  assignProductController,
  createInventoryRequestController,
  getInventoryRequestController,
  listAvailableProductsController,
  listInventoryRequestsController,
  listInventoryController,
  updateInventoryRequestStatusController,
} from '../controller/inventory.controller'
import {
  assignProductSchema,
  createInventoryRequestSchema,
  listAvailableProductsSchema,
  listInventoryRequestsSchema,
  listInventorySchema,
  updateInventoryRequestStatusSchema,
} from '../controller/inventory.validation'

const router = Router()

router.route('/inventory/request').post(
  verifyJWT,
  // allow legacy payload keys like stylecode/style_code
  (req, _res, next) => {
    if (!req.body?.styleCode) {
      req.body.styleCode = req.body?.stylecode || req.body?.style_code || req.body?.style || ''
    }
    next()
  },
  validateRequest(createInventoryRequestSchema),
  createInventoryRequestController
)

router.route('/inventory/request/list').post(
  verifyJWT,
  (req, _res, next) => {
    if (!req.body?.styleCode) {
      req.body.styleCode = req.body?.stylecode || req.body?.style_code || req.body?.style || ''
    }
    next()
  },
  validateRequest(listInventoryRequestsSchema),
  listInventoryRequestsController
)

router.route('/inventory/request/:id').get(verifyJWT, getInventoryRequestController)

router
  .route('/inventory/request/:id/status')
  .patch(verifyInventoryManager, validateRequest(updateInventoryRequestStatusSchema), updateInventoryRequestStatusController)

router.route('/inventory/request/:id/assign').post(verifyInventoryManager, validateRequest(assignProductSchema), assignProductController)

router.route('/inventory/available').post(
  verifyJWT,
  (req, _res, next) => {
    if (!req.body?.styleCode) {
      req.body.styleCode = req.body?.stylecode || req.body?.style_code || req.body?.style || ''
    }
    next()
  },
  validateRequest(listAvailableProductsSchema),
  listAvailableProductsController
)

router.route('/inventory/list').post(verifyJWT, validateRequest(listInventorySchema), listInventoryController)

export default router
