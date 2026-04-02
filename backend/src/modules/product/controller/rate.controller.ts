import { Request, Response } from 'express'
import { ApiResponse, CatchError } from '../../../utils'
import {
  createRate,
  deleteRateById,
  findDiamondRateMatch,
  getRateById,
  listRates,
  updateRateById,
  RateType,
  listMissingDiamondItemCodes,
  refreshProductsWithDiamondRates,
  getDiamondItemCodeMapping,
  saveDiamondItemCodeMapping,
} from '../model/rate.service'

const DIAMOND: RateType = 'diamond'
const OTHER: RateType = 'other'

export const createDiamondRateController = CatchError(async (req: Request, res: Response) => {
  const created = await createRate(DIAMOND, req.body)
  return res.status(201).json(new ApiResponse(201, { rateChart: created }, 'Diamond rate added successfully'))
})

export const listDiamondRatesController = CatchError(async (req: Request, res: Response) => {
  const data = await listRates(DIAMOND, req.body || {})
  return res.status(200).json(new ApiResponse(200, data as any, 'Diamond rate chart fetched successfully'))
})

export const getDiamondRateByIdController = CatchError(async (req: Request, res: Response) => {
  const id = `${req.params?.id || ''}`.trim()
  const rateChart = await getRateById(DIAMOND, id)
  if (!rateChart) {
    return res.status(404).json(new ApiResponse(404, { message: 'Diamond rate chart not found' }, 'Not found'))
  }
  return res.status(200).json(new ApiResponse(200, { rateChart }, 'Diamond rate chart fetched successfully'))
})

export const updateDiamondRateController = CatchError(async (req: Request, res: Response) => {
  const id = `${req.params?.id || ''}`.trim()
  const updated = await updateRateById(DIAMOND, id, req.body)
  if (!updated) {
    return res.status(404).json(new ApiResponse(404, { message: 'Diamond rate chart not found' }, 'Not found'))
  }

  const productUpdate = await refreshProductsWithDiamondRates()

  return res.status(200).json(new ApiResponse(200, { rateChart: updated, productUpdate }, 'Diamond rate chart updated and products refreshed'))
})

export const deleteDiamondRateController = CatchError(async (req: Request, res: Response) => {
  const id = `${req.params?.id || ''}`.trim()
  const deleted = await deleteRateById(DIAMOND, id)
  if (!deleted) {
    return res.status(404).json(new ApiResponse(404, { message: 'Diamond rate chart not found' }, 'Not found'))
  }
  return res.status(200).json(new ApiResponse(200, {}, 'Diamond rate chart deleted successfully'))
})

export const getDiamondRateMatchController = CatchError(async (req: Request, res: Response) => {
  const clarity = `${req.query?.clarity || ''}`.trim()
  const carat = Number(req.query?.carat)
  const shape = `${req.query?.shape || ''}`.trim()
  const itemCode = `${req.query?.itemCode || ''}`.trim()

  if (Number.isNaN(carat)) {
    return res.status(400).json(new ApiResponse(400, { message: 'numeric carat query param is required' }, 'Invalid input'))
  }

  const rateChart = await findDiamondRateMatch({
    carat,
    clarity: clarity || undefined,
    shape: shape || undefined,
    itemCode: itemCode || undefined,
  })
  if (!rateChart) {
    return res.status(404).json(new ApiResponse(404, { message: 'No matching rate found' }, 'Not found'))
  }

  return res.status(200).json(new ApiResponse(200, { rateChart }, 'Diamond rate matched successfully'))
})

export const listMissingDiamondRatesController = CatchError(async (_req: Request, res: Response) => {
  const rows = await listMissingDiamondItemCodes()
  return res.status(200).json(new ApiResponse(200, { data: rows }, 'Missing diamond rate mappings'))
})

export const getDiamondItemCodeMappingController = CatchError(async (_req: Request, res: Response) => {
  const mapping = await getDiamondItemCodeMapping()
  return res.status(200).json(new ApiResponse(200, mapping as any, 'Diamond item-code mapping fetched successfully'))
})

export const updateDiamondItemCodeMappingController = CatchError(async (req: Request, res: Response) => {
  const mapping = await saveDiamondItemCodeMapping(req.body || {})
  return res.status(200).json(new ApiResponse(200, mapping as any, 'Diamond item-code mapping updated successfully'))
})

export const createOtherRateController = CatchError(async (req: Request, res: Response) => {
  const created = await createRate(OTHER, req.body)
  return res.status(201).json(new ApiResponse(201, { rateChart: created }, 'Rate added successfully'))
})

export const listOtherRatesController = CatchError(async (req: Request, res: Response) => {
  const data = await listRates(OTHER, req.body || {})
  return res.status(200).json(new ApiResponse(200, data as any, 'Rate chart fetched successfully'))
})

export const getOtherRateByIdController = CatchError(async (req: Request, res: Response) => {
  const id = `${req.params?.id || ''}`.trim()
  const rateChart = await getRateById(OTHER, id)
  if (!rateChart) {
    return res.status(404).json(new ApiResponse(404, { message: 'Rate chart not found' }, 'Not found'))
  }
  return res.status(200).json(new ApiResponse(200, { rateChart }, 'Rate chart fetched successfully'))
})

export const updateOtherRateController = CatchError(async (req: Request, res: Response) => {
  const id = `${req.params?.id || ''}`.trim()
  const updated = await updateRateById(OTHER, id, req.body)
  if (!updated) {
    return res.status(404).json(new ApiResponse(404, { message: 'Rate chart not found' }, 'Not found'))
  }
  return res.status(200).json(new ApiResponse(200, { rateChart: updated }, 'Rate chart updated successfully'))
})

export const deleteOtherRateController = CatchError(async (req: Request, res: Response) => {
  const id = `${req.params?.id || ''}`.trim()
  const deleted = await deleteRateById(OTHER, id)
  if (!deleted) {
    return res.status(404).json(new ApiResponse(404, { message: 'Rate chart not found' }, 'Not found'))
  }
  return res.status(200).json(new ApiResponse(200, {}, 'Rate chart deleted successfully'))
})
