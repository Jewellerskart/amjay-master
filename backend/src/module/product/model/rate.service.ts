import { DiamondRateChartModel } from './diamondRateChart.schema'
import { OtherRateChartModel } from './otherRateChart.schema'
import { ProductModel } from './product.schema'

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

export const findDiamondRateMatch = async (params: { carat: number; clarity?: string; shape?: string }) => {
  const clarity = params.clarity ? params.clarity.trim().toUpperCase() : ''
  const shape = params.shape ? params.shape.trim().toUpperCase() : ''
  const target = Number(params.carat)

  if (!Number.isFinite(target) || target <= 0) {
    return null
  }

  const all = await DiamondRateChartModel.find({ isActive: true }).lean()
  const match = all.find((item: any) => {
    const range = parseSizeRange(item.size)

    if (!range) {
      return false
    }

    const inRange = target >= range.from && target <= range.to
    const clarityOk = clarity ? item.clarity === clarity : true
    const shapeOk = shape ? (item.shape || '').toUpperCase() === shape : true

    const matches = inRange && clarityOk && shapeOk

    return matches
  })
  return match || null
}

const getShapeFromItemCode = (code?: string) => {
  const shapeFromItem: Record<string, string> = { RND: 'ROUND', PEA: 'PEAR', OV: 'OVAL', EM: 'EMERALD', PRN: 'PRINCESS' }
  const val = (code || '').toUpperCase()
  const p3 = val.slice(0, 3)
  if (shapeFromItem[p3]) return shapeFromItem[p3]
  const p2 = val.slice(0, 2)
  if (shapeFromItem[p2]) return shapeFromItem[p2]
  return ''
}

const getClarityFromItemCode = (code?: string) => {
  const clarityMap: Record<string, string> = { 'VVS-VS': 'VVS-VS', 'VS-SI': 'VS-SI', VVS: 'VVS', VS: 'VS', SI: 'SI' }
  const val = (code || '').toUpperCase()

  const len = val.length
  if (len >= 6) {
    const s5 = val.slice(len - 6)
    if (clarityMap[s5]) return clarityMap[s5]
  }
  return ''
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

const recalculateProductWithRates = (product: any, rates: PreparedDiamondRate[]) => {
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
        const clarity = getClarityFromItemCode(comp?.itemCode) || `${comp?.clarity || ''}`.trim().toUpperCase()
        const shape = getShapeFromItemCode(comp?.itemCode) || `${comp?.shape || ''}`.trim().toUpperCase()
        const match = matchPreparedDiamondRate(rates, perStone, clarity, shape)

        if (match) {
          const nextAmount = Number((weight * Number(match.ratePerCarat || 0)).toFixed(2))
          if (Number.isFinite(nextAmount)) {
            if (nextAmount !== baseAmount) changed = true
            comp.amount = nextAmount
            if (clarity && comp.clarity !== clarity) changed = true
            if (shape && comp.shape !== shape) changed = true
            if (clarity) comp.clarity = clarity
            if (shape) comp.shape = shape
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
  const cursor = ProductModel.find({ 'components.type': { $regex: /diamond/i } }).cursor({ batchSize: 100 })

  let processed = 0
  let updated = 0

  for await (const product of cursor as any) {
    const { changed } = recalculateProductWithRates(product, rates)
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
