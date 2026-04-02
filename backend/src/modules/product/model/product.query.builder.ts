import { Types } from 'mongoose'
import { IBuildQuery } from '../type/product'

const NONE_FACET_TOKEN = '__NONE__'

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const splitFilterTerms = (raw?: string): string[] =>
  `${raw || ''}`
    .split('|')
    .map((term) => term.trim())
    .filter(Boolean)

const buildFacetFilter = (field: string, rawValue?: string): any | null => {
  const terms = splitFilterTerms(rawValue)
  if (!terms.length) return null

  const hasNone = terms.includes(NONE_FACET_TOKEN)
  const valuedTerms = terms.filter((term) => term !== NONE_FACET_TOKEN)
  const conditions: any[] = []

  if (valuedTerms.length) {
    const pattern = valuedTerms.map((term) => escapeRegex(term)).join('|')
    conditions.push({ [field]: new RegExp(pattern, 'i') })
  }

  if (hasNone) {
    conditions.push({ [field]: { $exists: false } }, { [field]: null }, { [field]: '' })
  }

  if (!conditions.length) return null
  return conditions.length === 1 ? conditions[0] : { $or: conditions }
}

const addCondition = (query: any, condition: any): void => {
  if (!condition) return
  query.$and = Array.isArray(query.$and) ? query.$and : []
  query.$and.push(condition)
}

export const addRangeFilter = (query: any, field: string, min?: number, max?: number): void => {
  if (typeof min === 'number' || typeof max === 'number') {
    query[field] = {}
    if (typeof min === 'number') query[field].$gte = min
    if (typeof max === 'number') query[field].$lte = max
  }
}

export const buildQuery = (params: IBuildQuery): any => {
  const query: any = {}

  if (params.search) {
    query.$or = [
      { 'product.jewelCode': new RegExp(params.search, 'i') },
      { 'product.styleCode': new RegExp(params.search, 'i') },
      { 'product.categoryName': new RegExp(params.search, 'i') },
      { 'product.categoryGroupName': new RegExp(params.search, 'i') },
      { 'product.subCategory': new RegExp(params.search, 'i') },
      { 'client.clientName': new RegExp(params.search, 'i') },
      { 'client.clientCode': new RegExp(params.search, 'i') },
      { remarks: new RegExp(params.search, 'i') },
    ]
  }

  if (params.usageType) {
    query['usage.type'] = params.usageType === 'assigned' ? { $in: ['assigned', 'pending'] } : params.usageType
  }

  if (params.group) query['product.categoryGroupName'] = new RegExp(params.group, 'i')
  if (params.subCategory) query['product.subCategory'] = new RegExp(params.subCategory, 'i')
  if (params.metals) query['material.baseMetal'] = new RegExp(params.metals, 'i')
  addCondition(query, buildFacetFilter('material.baseQuality', params.baseQualities))
  addCondition(query, buildFacetFilter('material.baseStone', params.diamonds))
  if (params.status) query.status = params.status
  if (params.holderRole) query['currentHolder.role'] = params.holderRole

  if (params.currentHolderUserId) {
    const id = `${params.currentHolderUserId}`.trim()
    query['currentHolder.userId'] = Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id
  }

  if (params.distributorId) {
    query['uploadedBy.userId'] = params.distributorId
  }

  addRangeFilter(query, 'weight.grossWeight', params.minWeight, params.maxWeight)
  addRangeFilter(query, 'cost.totalCost', params.minPrice, params.maxPrice)

  if (params.startDate || params.endDate) {
    query.createdAt = {}
    if (params.startDate) query.createdAt.$gte = new Date(params.startDate)
    if (params.endDate) query.createdAt.$lte = new Date(params.endDate)
  }

  return query
}

export const buildSortCriteria = (sortBy: string = 'createdAt', sortDir: string = 'desc'): any => {
  const dir = sortDir === 'asc' ? 1 : -1
  const sort: any = {}

  switch (sortBy) {
    case 'jewelCode':
      sort['product.jewelCode'] = dir
      break
    case 'styleCode':
      sort['product.styleCode'] = dir
      break
    case 'qty':
      sort['qty'] = dir
      break
    case 'weight':
      sort['weight.grossWeight'] = dir
      break
    case 'price':
    case 'livePrice':
      sort['finalPrice'] = dir
      break
    default:
      sort['createdAt'] = dir
  }

  return sort
}
