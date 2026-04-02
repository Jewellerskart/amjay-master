import { DiamondRateChartModel } from './diamondRateChart.schema'
import { OtherRateChartModel } from './otherRateChart.schema'
import { ProductModel } from './product.schema'
import { DiamondItemCodeMappingModel } from './diamondItemCodeMapping.schema'
import {
  DEFAULT_CLARITY_MAP,
  DEFAULT_SHAPE_MAP,
  getClarityFromItemCode,
  getShapeFromItemCode,
  toNormalizedClarityMap,
  toNormalizedShapeMap,
} from '../utils/diamondItemCode'

export type RateType = 'diamond' | 'other'

const rateModels: Record<RateType, any> = {
  diamond: DiamondRateChartModel,
  other: OtherRateChartModel,
}

const getRateModel = (type: RateType) => rateModels[type]
type DiamondRateRange = { from: number; to: number }
type PreparedDiamondRate = {
  clarity: string
  shape: string
  ratePerCarat: number
  range: DiamondRateRange
}

const ITEM_CODE_MAPPING_KEY = 'default'
const ITEM_CODE_MAPPING_CACHE_TTL_MS = 60_000

let itemCodeMappingCache: {
  clarityMap: Record<string, string>
  shapeMap: Record<string, string>
  expiresAt: number
} = {
  clarityMap: { ...DEFAULT_CLARITY_MAP },
  shapeMap: { ...DEFAULT_SHAPE_MAP },
  expiresAt: 0,
}

const loadDiamondItemCodeMapping = async () => {
  const now = Date.now()
  if (itemCodeMappingCache.expiresAt > now) {
    return {
      clarityMap: { ...itemCodeMappingCache.clarityMap },
      shapeMap: { ...itemCodeMappingCache.shapeMap },
    }
  }

  const doc = await DiamondItemCodeMappingModel.findOne({ key: ITEM_CODE_MAPPING_KEY }).lean()
  const clarityMap = toNormalizedClarityMap(doc?.clarityMap || DEFAULT_CLARITY_MAP)
  const shapeMap = toNormalizedShapeMap(doc?.shapeMap || DEFAULT_SHAPE_MAP)
  itemCodeMappingCache = {
    clarityMap: { ...clarityMap },
    shapeMap: { ...shapeMap },
    expiresAt: now + ITEM_CODE_MAPPING_CACHE_TTL_MS,
  }

  return { clarityMap, shapeMap }
}

export const getDiamondItemCodeMapping = async () => {
  return loadDiamondItemCodeMapping()
}

export const saveDiamondItemCodeMapping = async (payload: { clarityMap?: Record<string, string>; shapeMap?: Record<string, string> }) => {
  const nextClarityMap = toNormalizedClarityMap(payload?.clarityMap || DEFAULT_CLARITY_MAP)
  const nextShapeMap = toNormalizedShapeMap(payload?.shapeMap || DEFAULT_SHAPE_MAP)
  await DiamondItemCodeMappingModel.findOneAndUpdate(
    { key: ITEM_CODE_MAPPING_KEY },
    { $set: { key: ITEM_CODE_MAPPING_KEY, clarityMap: nextClarityMap, shapeMap: nextShapeMap } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )

  itemCodeMappingCache = {
    clarityMap: { ...nextClarityMap },
    shapeMap: { ...nextShapeMap },
    expiresAt: Date.now() + ITEM_CODE_MAPPING_CACHE_TTL_MS,
  }

  return { clarityMap: nextClarityMap, shapeMap: nextShapeMap }
}

export const createRate = async (type: RateType, payload: any) => getRateModel(type).create(payload)

export const getRateById = async (type: RateType, id: string) => getRateModel(type).findById(id)

export const updateRateById = async (type: RateType, id: string, payload: any) => getRateModel(type).findByIdAndUpdate(id, payload, { new: true })

export const deleteRateById = async (type: RateType, id: string) => getRateModel(type).findByIdAndDelete(id)

export const listRates = async (
  type: RateType,
  params:
    | {
        page?: number
        limit?: number
        clarity?: string
        shape?: string
        size?: string
        isActive?: boolean
      }
    | { page?: number; limit?: number; name?: string; category?: string; isActive?: boolean }
) => {
  if (type === 'diamond') {
    return listDiamondRates(params as any)
  }
  return listOtherRates(params as any)
}

const parseSizeRange = (size?: string): { from: number; to: number } | null => {
  if (!size || typeof size !== 'string') return null

  const cleaned = size.trim()

  const parts = cleaned.split('-').map((p) => {
    const trimmed = p.trim()
    const num = Number(trimmed)
    return num
  })

  if (parts.length !== 2) return null
  if (!parts.every((n) => Number.isFinite(n))) return null

  const [from, to] = parts

  if (from < 0 || to < 0 || from > to) return null

  return { from, to }
}

export const findDiamondRateMatch = async (params: { carat: number; clarity?: string; shape?: string; itemCode?: string }) => {
  const itemCodeMapping = await loadDiamondItemCodeMapping()
  const clarity = params.clarity ? params.clarity.trim().toUpperCase() : ''
  const shape = params.shape ? params.shape.trim().toUpperCase() : ''
  const target = Number(params.carat)

  if (!Number.isFinite(target) || target <= 0) {
    return null
  }

  const all = await DiamondRateChartModel.find({ isActive: true }).lean()
  const inRange = all
    .map((item: any) => {
      const range = parseSizeRange(item.size)
      if (!range) return null
      return {
        item,
        clarity: `${item?.clarity || ''}`.trim().toUpperCase(),
        shape: `${item?.shape || ''}`.trim().toUpperCase(),
        inRange: target >= range.from && target <= range.to,
      }
    })
    .filter(Boolean)
    .filter((row: any) => row.inRange)

  if (!inRange.length) return null

  const derivedClarity = clarity || getClarityFromItemCode(params.itemCode, itemCodeMapping.clarityMap)
  const derivedShape = shape || getShapeFromItemCode(params.itemCode, itemCodeMapping.shapeMap)

  const strictMatch =
    inRange.find((row: any) => {
      const clarityOk = derivedClarity ? row.clarity === derivedClarity : true
      const shapeOk = derivedShape ? row.shape === derivedShape : true
      return clarityOk && shapeOk
    }) ||
    inRange.find((row: any) => (derivedClarity ? row.clarity === derivedClarity : false)) ||
    inRange.find((row: any) => (derivedShape ? row.shape === derivedShape : false)) ||
    null

  return strictMatch?.item || inRange[0]?.item || null
}

const prepareDiamondRates = async (): Promise<PreparedDiamondRate[]> => {
  const rows = await DiamondRateChartModel.find({ isActive: true }).lean()

  return rows
    .map((row: any) => {
      const range = parseSizeRange(row.size)
      if (!range) return null

      return {
        clarity: `${row?.clarity || ''}`.trim().toUpperCase(),
        shape: `${row?.shape || ''}`.trim().toUpperCase(),
        ratePerCarat: Number(row?.ratePerCarat ?? 0),
        range,
      }
    })
    .filter(Boolean) as PreparedDiamondRate[]
}

const matchPreparedDiamondRate = (rates: PreparedDiamondRate[], perStone: number, clarity?: string, shape?: string) => {
  if (!Number.isFinite(perStone) || perStone <= 0) return null

  const clr = clarity ? clarity.trim().toUpperCase() : ''
  const shp = shape ? shape.trim().toUpperCase() : ''

  return (
    rates.find((rate) => {
      const inRange = perStone >= rate.range.from && perStone <= rate.range.to
      const clarityOk = clr ? rate.clarity === clr : true
      const shapeOk = shp ? (rate.shape || '') === shp : true
      return inRange && clarityOk && shapeOk
    }) || null
  )
}

const recalculateProductWithRates = (
  product: any,
  rates: PreparedDiamondRate[],
  itemCodeMapping: { clarityMap: Record<string, string>; shapeMap: Record<string, string> }
) => {
  const components: any[] = Array.isArray(product?.components) ? product.components : []
  if (!components.length) return { changed: false, total: Number(product?.cost?.totalCost ?? 0) }

  let totalAmount = 0
  let changed = false

  for (const comp of components) {
    const baseAmount = Number(comp?.amount ?? 0) || 0
    const compType = `${comp?.type || ''}`.trim().toLowerCase()

    // Normalize component type to satisfy enum and keep data consistent
    const normalizedTypeMap: Record<string, string> = {
      diamond: 'diamond',
      metal: 'metal',
      colorstone: 'colorStone',
      colorstones: 'colorStone',
      stone: 'stone',
      charge: 'charge',
      labor: 'charge',
    }
    const normalizedType = normalizedTypeMap[compType] || compType
    if (comp.type !== normalizedType) {
      comp.type = normalizedType
      changed = true
    }

    if (compType === 'diamond') {
      const weight = Number(comp?.weight ?? 0)
      const pieces = Number(comp?.pieces ?? 0)

      if (weight > 0 && pieces > 0) {
        const perStone = weight / pieces
        const clarity = getClarityFromItemCode(comp?.itemCode, itemCodeMapping.clarityMap)
        const shape = getShapeFromItemCode(comp?.itemCode, itemCodeMapping.shapeMap)
        const match = matchPreparedDiamondRate(rates, perStone, clarity, shape)

        if (match) {
          const nextAmount = Number((weight * Number(match.ratePerCarat || 0)).toFixed(2))
          if (Number.isFinite(nextAmount)) {
            if (nextAmount !== baseAmount) changed = true
            comp.amount = nextAmount
            totalAmount += nextAmount
            continue
          }
        }
      }
    }

    totalAmount += baseAmount
  }

  const nextTotal = Number(totalAmount.toFixed(2))
  const currentTotal = Number(product?.cost?.totalCost ?? 0)

  if (nextTotal !== currentTotal) {
    product.cost = { ...(product.cost || {}), totalCost: nextTotal }
    changed = true
  }

  return { changed, total: nextTotal }
}

export const refreshProductsWithDiamondRates = async () => {
  const rates = await prepareDiamondRates()
  const itemCodeMapping = await loadDiamondItemCodeMapping()
  const cursor = ProductModel.find({ 'components.type': { $regex: /diamond/i } }).cursor({ batchSize: 100 })

  let processed = 0
  let updated = 0

  for await (const product of cursor as any) {
    const { changed } = recalculateProductWithRates(product, rates, itemCodeMapping)
    processed += 1
    if (!changed) continue

    await ProductModel.updateOne({ _id: product._id }, { $set: { components: product.components, cost: product.cost } }, { runValidators: false })
    updated += 1
  }

  return { processed, updated }
}

export const listMissingDiamondItemCodes = async () => {
  const pipeline = [
    { $unwind: '$components' },
    {
      $match: {
        'components.type': 'diamond',
        $or: [{ 'components.amount': { $lte: 0 } }, { 'components.amount': { $exists: false } }],
      },
    },
    { $group: { _id: '$components.itemCode' } },
    { $project: { _id: 0, itemCode: '$_id' } },
  ]

  return ProductModel.aggregate(pipeline)
}

const listDiamondRates = async (params: { page?: number; limit?: number; clarity?: string; shape?: string; size?: string; isActive?: boolean }) => {
  const { page = 1, limit = 10, clarity = '', shape = '', size = '', isActive } = params
  const query: any = {}

  if (clarity) query.clarity = `${clarity}`.trim().toUpperCase()
  if (shape) query.shape = `${shape}`.trim().toUpperCase()
  if (size) query.size = new RegExp(`^${size.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
  if (typeof isActive === 'boolean') query.isActive = isActive

  const [data, count] = await Promise.all([
    DiamondRateChartModel.find(query)
      .sort({ effectiveDate: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DiamondRateChartModel.countDocuments(query),
  ])

  return { data, count, page, limit }
}

const listOtherRates = async (params: { page?: number; limit?: number; name?: string; category?: string; isActive?: boolean }) => {
  const { page = 1, limit = 10, name = '', category = '', isActive } = params
  const query: any = {}
  if (name) query.name = new RegExp(name, 'i')
  if (category) query.category = new RegExp(category, 'i')
  if (typeof isActive === 'boolean') query.isActive = isActive

  const [data, count] = await Promise.all([
    OtherRateChartModel.find(query)
      .sort({ effectiveDate: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    OtherRateChartModel.countDocuments(query),
  ])

  return { data, count, page, limit }
}
