import { Router } from 'express'
import { verifyAdmin, verifyJWT } from '../../../middleware/auth.middleware'
import { validateRequest } from '../../../utils/CatchError'
import { ContactQueryUpload } from '../../../config/multer'
import {
  createContactQueryController,
  getAssignableUsersController,
  getAllContactQueriesController,
  getMyContactQueriesController,
  updateContactQueryStatusController,
} from '../controller/contactQuery.controller'
import {
  createContactQuerySchema,
  getContactQueriesSchema,
  updateContactQueryStatusSchema,
} from '../controller/contactQuery.validation'

const router = Router()

router
  .route('/contact-admin/query')
  .post(
    verifyJWT,
    ContactQueryUpload.array('documents', 5),
    validateRequest(createContactQuerySchema),
    createContactQueryController
  )

router.route('/contact-admin/query/my').get(verifyJWT, getMyContactQueriesController)

router
  .route('/contact-admin/query/all')
  .post(verifyAdmin, validateRequest(getContactQueriesSchema), getAllContactQueriesController)

router.route('/contact-admin/query/assignees').get(verifyAdmin, getAssignableUsersController)

router
  .route('/contact-admin/query/:id/status')
  .patch(
    verifyAdmin,
    validateRequest(updateContactQueryStatusSchema),
    updateContactQueryStatusController
  )

export default router
