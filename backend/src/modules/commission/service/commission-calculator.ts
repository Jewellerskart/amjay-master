type RawCommissionConfig = {
  defaultRate?: unknown
  componentRates?: unknown
}

export type CommissionConfig = {
  defaultRate: number
  componentRates: Record<string, number>
}

export type CommissionBreakdownItem = {
  componentKey: string
  baseAmount: number
  rate: number
  deductionAmount: number
}

export type CommissionCalculationResult = {
  grossAmount: number
  totalDeduction: number
  payableAmount: number
  effectiveRate: number
  breakdown: CommissionBreakdownItem[]
}

const RATE_MIN = 0
const RATE_MAX = 100

const LABOR_KEYWORDS = ['labor', 'labour', 'making', 'charge', 'hand', 'set']
const METAL_KEYWORDS = ['metal', 'gold', 'silver', 'platinum']

const round2 = (value: number) => Number(value.toFixed(2))

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeRate = (value: unknown, fallback = 0): number => {
  const parsed = toFiniteNumber(value, fallback)
  const bounded = Math.max(RATE_MIN, Math.min(RATE_MAX, parsed))
  return round2(bounded)
}

const normalizeComponentKey = (value: unknown): string => {
  const raw = `${value || ''}`.trim().toLowerCase()
  if (!raw) return ''
  if (['diamond', 'diamonds', 'diamont'].includes(raw)) return 'diamond'
  if (['labor', 'labour', 'making', 'charge', 'charges', 'hand', 'set'].includes(raw)) return 'labor'
  if (['others', 'other_component', 'misc'].includes(raw)) return 'other'
  return raw.replace(/\s+/g, '_')
}

const normalizeComponentRates = (value: unknown): Record<string, number> => {
  const pairs: Array<[string, unknown]> = []
  if (!value) return {}

  if (value instanceof Map) {
    value.forEach((rate, key) => {
      pairs.push([`${key}`, rate])
    })
  } else if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, rate]) => {
      pairs.push([key, rate])
    })
  }

  const normalized: Record<string, number> = {}
  pairs.forEach(([key, rate]) => {
    const normalizedKey = normalizeComponentKey(key)
    if (!normalizedKey) return
    normalized[normalizedKey] = normalizeRate(rate, 0)
  })
  return normalized
}

export const normalizeCommissionConfig = (input: unknown, fallbackDefaultRate = 0): CommissionConfig => {
  const source = (input || {}) as RawCommissionConfig
  const defaultRate = normalizeRate(source.defaultRate, fallbackDefaultRate)
  const componentRates = normalizeComponentRates(source.componentRates)

  return { defaultRate, componentRates }
}

export const getUserCommissionConfig = (user: { commissionRate?: unknown; commissionConfig?: unknown } | null | undefined): CommissionConfig => {
  const legacyRate = normalizeRate(user?.commissionRate, 0)
  return normalizeCommissionConfig(user?.commissionConfig, legacyRate)
}

const isLaborComponent = (component: { type?: unknown; itemName?: unknown; materialType?: unknown }) => {
  const rawType = `${component?.type || ''}`.trim().toLowerCase()
  if (['labor', 'labour', 'making', 'hand', 'set'].includes(rawType)) return true
  if (!['charge', 'charges'].includes(rawType)) return false

  const descriptor = `${component?.itemName || ''} ${component?.materialType || ''}`.trim().toLowerCase()
  if (!descriptor) return true
  return LABOR_KEYWORDS.some((keyword) => descriptor.includes(keyword))
}

const isMetalComponent = (component: { type?: unknown; itemName?: unknown; materialType?: unknown }) => {
  const rawType = `${component?.type || ''}`.trim().toLowerCase()
  if (['metal', 'metals', 'base_metal'].includes(rawType)) return true

  const descriptor = `${component?.itemName || ''} ${component?.materialType || ''}`.trim().toLowerCase()
  if (!descriptor) return false
  return METAL_KEYWORDS.some((keyword) => descriptor.includes(keyword))
}

const readComponentAmount = (component: { amount?: unknown; costAmt?: unknown }) => {
  const amount = toFiniteNumber(component?.amount, NaN)
  if (Number.isFinite(amount)) return Math.max(0, amount)
  const costAmount = toFiniteNumber(component?.costAmt, NaN)
  return Number.isFinite(costAmount) ? Math.max(0, costAmount) : 0
}

const summarizeCharges = (product: any) => {
  let labor = 0
  let other = 0
  const charges = Array.isArray(product?.charges) ? product.charges : []
  charges.forEach((charge: any) => {
    const amount = Math.max(0, toFiniteNumber(charge?.amount, 0))
    if (amount <= 0) return

    const typeKey = normalizeComponentKey(charge?.type)
    if (!typeKey || typeKey === 'labor' || typeKey === 'charge') {
      labor += amount
      return
    }
    other += amount
  })
  return { labor: round2(labor), other: round2(other) }
}

const extractComponentBaseAmounts = (product: any, grossAmount: number): Record<string, number> => {
  const baseAmounts: Record<string, number> = { diamond: 0, labor: 0, other: 0 }
  let metalAmount = 0

  const components = Array.isArray(product?.components) ? product.components : []
  let hasComponentSplit = false
  for (const component of components) {
    const typeKey = normalizeComponentKey(component?.type)
    const amount = readComponentAmount(component)
    if (amount <= 0) continue

    hasComponentSplit = true

    if (typeKey === 'diamond') {
      baseAmounts.diamond += amount
      continue
    }

    if (isMetalComponent(component)) {
      metalAmount += amount
      continue
    }

    if (isLaborComponent(component)) {
      baseAmounts.labor += amount
      continue
    }

    baseAmounts.other += amount
  }

  const chargeSummary = summarizeCharges(product)

  if (hasComponentSplit) {
    baseAmounts.labor += chargeSummary.labor
    baseAmounts.other += chargeSummary.other
  } else {
    baseAmounts.diamond = Math.max(0, toFiniteNumber(product?.cost?.diamondValue, 0))

    const handAmount = Math.max(0, toFiniteNumber(product?.cost?.handAmount, 0))
    const setAmount = Math.max(0, toFiniteNumber(product?.cost?.setAmount, 0))
    baseAmounts.labor = handAmount + setAmount + chargeSummary.labor

    const metalValue = Math.max(0, toFiniteNumber(product?.cost?.metalValue, 0))
    const goldCost = Math.max(0, toFiniteNumber(product?.cost?.goldCost, 0))
    const otherMetalCost = Math.max(0, toFiniteNumber(product?.cost?.otherMetalCost, 0))
    const otherMetalValue = Math.max(0, toFiniteNumber(product?.cost?.otherMetalValue, 0))
    metalAmount = metalValue > 0 ? metalValue : goldCost + otherMetalCost + otherMetalValue

    const colorStoneValue = Math.max(0, toFiniteNumber(product?.cost?.colorStoneValue, 0))
    const exchangeCost = Math.max(0, toFiniteNumber(product?.cost?.exchangeCost, 0))
    const pieceValue = Math.max(0, toFiniteNumber(product?.cost?.pieceValue, 0))
    baseAmounts.other = colorStoneValue + exchangeCost + pieceValue + chargeSummary.other

    const totalCost = Math.max(0, toFiniteNumber(product?.cost?.totalCost, 0))
    const knownTotal = baseAmounts.diamond + baseAmounts.labor + metalAmount + baseAmounts.other
    if (totalCost > 0 && knownTotal < totalCost) {
      baseAmounts.other += totalCost - knownTotal
    } else if (totalCost > 0 && knownTotal > totalCost) {
      const ratio = totalCost / knownTotal
      baseAmounts.diamond = round2(baseAmounts.diamond * ratio)
      baseAmounts.labor = round2(baseAmounts.labor * ratio)
      metalAmount = round2(metalAmount * ratio)
      baseAmounts.other = round2(baseAmounts.other * ratio)
    }
  }

  const commissionBaseTotal = baseAmounts.diamond + baseAmounts.labor + baseAmounts.other
  if (grossAmount > 0 && commissionBaseTotal > grossAmount) {
    const ratio = grossAmount / commissionBaseTotal
    baseAmounts.diamond = round2(baseAmounts.diamond * ratio)
    baseAmounts.labor = round2(baseAmounts.labor * ratio)
    baseAmounts.other = round2(baseAmounts.other * ratio)
  }

  return {
    diamond: round2(baseAmounts.diamond),
    labor: round2(baseAmounts.labor),
    other: round2(baseAmounts.other),
  }
}

const getRateForComponent = (componentKey: string, config: CommissionConfig): number => {
  const rateFromConfig = config.componentRates[componentKey]
  if (Number.isFinite(rateFromConfig)) return normalizeRate(rateFromConfig, config.defaultRate)
  return config.defaultRate
}

export const calculateCommissionForSale = (args: { product: any; grossAmount: number; config: CommissionConfig }): CommissionCalculationResult => {
  const grossAmount = Math.max(0, round2(toFiniteNumber(args.grossAmount, 0)))
  const baseAmounts = extractComponentBaseAmounts(args.product, grossAmount)
  const orderedKeys: Array<'diamond' | 'labor' | 'other'> = ['diamond', 'labor', 'other']

  const breakdown: CommissionBreakdownItem[] = orderedKeys.map((componentKey) => {
    const baseAmount = round2(Math.max(0, toFiniteNumber(baseAmounts[componentKey], 0)))
    const rate = getRateForComponent(componentKey, args.config)
    const deductionAmount = round2((baseAmount * rate) / 100)
    return { componentKey, baseAmount, rate, deductionAmount }
  })

  const totalDeduction = round2(
    breakdown.reduce((sum, item) => {
      return sum + item.deductionAmount
    }, 0)
  )
  const payableAmount = round2(Math.max(0, grossAmount - totalDeduction))
  const effectiveRate = grossAmount > 0 ? round2((totalDeduction / grossAmount) * 100) : 0

  return { grossAmount, totalDeduction, payableAmount, effectiveRate, breakdown }
}
