import { Router } from 'express'
import multer from 'multer'
import { validateRequest } from '../../../utils/CatchError'
import { verifyAdmin, verifyJWT } from '../../../middlewares/auth.middleware'
import {
  assignProductToJewelerController,
  previewAssignProductController,
  rejectAssignedProductController,
  acceptAssignedProductController,
  createProductController,
  bulkImportProductsFileController,
  bulkDeleteProductsController,
  exportProductsController,
  sampleProductsExportController,
  deleteProductController,
  getProductByIdController,
  listProductsController,
  listMarketplaceProductsController,
  updateProductController,
  ListProductsFilter,
} from '../controller/product.controller'
import {
  createDiamondRateController,
  deleteDiamondRateController,
  getDiamondRateByIdController,
  getDiamondRateMatchController,
  listMissingDiamondRatesController,
  listDiamondRatesController,
  updateDiamondRateController,
  createOtherRateController,
  listOtherRatesController,
  getOtherRateByIdController,
  updateOtherRateController,
  deleteOtherRateController,
} from '../controller/rate.controller'
import {
  assignProductToJewelerSchema,
  rejectAssignedProductSchema,
  acceptAssignedProductSchema,
  bulkDeleteProductsSchema,
  createDiamondRateSchema,
  createOtherRateSchema,
  createProductSchema,
  listDiamondRateSchema,
  listOtherRateSchema,
  listProductsSchema,
  updateDiamondRateSchema,
  updateOtherRateSchema,
  updateProductSchema,
} from '../controller/product.validation'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.route('/product').post(verifyJWT, validateRequest(createProductSchema), createProductController)
router.route('/product/bulk-import/file').post(verifyAdmin, upload.single('file'), bulkImportProductsFileController)
router.route('/product/bulk-delete').post(verifyAdmin, validateRequest(bulkDeleteProductsSchema), bulkDeleteProductsController)
router.route('/product/export').post(verifyJWT, exportProductsController)
router.route('/product/export/sample').get(verifyJWT, sampleProductsExportController)

router.route('/product/list').post(verifyJWT, validateRequest(listProductsSchema), listProductsController)
router.route('/product/marketplace/list').post(verifyJWT, validateRequest(listProductsSchema), listMarketplaceProductsController)
router.route('/product/filter').get(ListProductsFilter)
router.route('/product/:id').get(verifyJWT, getProductByIdController)
router.route('/product/:id').put(verifyJWT, validateRequest(updateProductSchema), updateProductController)
router.route('/product/:id').delete(verifyAdmin, deleteProductController)
router.route('/product/:id/assign-preview/:jewelerId').get(verifyJWT, previewAssignProductController)
router.route('/product/:id/assign-to-jeweler').patch(verifyJWT, validateRequest(assignProductToJewelerSchema), assignProductToJewelerController)
router.route('/product/:id/reject-assignment').patch(verifyJWT, validateRequest(rejectAssignedProductSchema), rejectAssignedProductController)
router.route('/product/:id/accept-assignment').patch(verifyJWT, validateRequest(acceptAssignedProductSchema), acceptAssignedProductController)

router.route('/product/diamond-rate-chart').post(verifyAdmin, validateRequest(createDiamondRateSchema), createDiamondRateController)

router.route('/product/diamond-rate-chart/list').post(verifyJWT, validateRequest(listDiamondRateSchema), listDiamondRatesController)

router.route('/product/diamond-rate-chart/match').get(verifyJWT, getDiamondRateMatchController)
router.route('/product/diamond-rate-chart/missing').get(verifyAdmin, listMissingDiamondRatesController)
router.route('/product/diamond-rate-chart/:id').get(verifyJWT, getDiamondRateByIdController)
router.route('/product/diamond-rate-chart/:id').put(verifyAdmin, validateRequest(updateDiamondRateSchema), updateDiamondRateController)
router.route('/product/diamond-rate-chart/:id').delete(verifyAdmin, deleteDiamondRateController)

router.route('/product/other-rate-chart').post(verifyAdmin, validateRequest(createOtherRateSchema), createOtherRateController)
router.route('/product/other-rate-chart/list').post(verifyJWT, validateRequest(listOtherRateSchema), listOtherRatesController)
router.route('/product/other-rate-chart/:id').get(verifyJWT, getOtherRateByIdController)
router.route('/product/other-rate-chart/:id').put(verifyAdmin, validateRequest(updateOtherRateSchema), updateOtherRateController)
router.route('/product/other-rate-chart/:id').delete(verifyAdmin, deleteOtherRateController)

export default router

