export type MetalRates = {
  GoldRate: number
  SilverRate: number
}

type CommissionRateMap = Map<string, unknown> | Record<string, unknown> | null | undefined

type RawCommissionConfig = {
  defaultRate?: unknown
  componentRates?: CommissionRateMap
}

type PricingUserLike = {
  commissionConfig?: RawCommissionConfig | null
} | null | undefined

export type PricingCommissionBreakdownItem = {
  componentKey: 'default' | 'diamond' | 'labor'
  baseAmount: number
  rate: number
  deductionAmount: number
}

export type ProductPricingResult = {
  metalPrice: number
  diamondAmount: number
  laborAmount: number
  totalCost: number
  MRP: number
  finalPrice: number
  commission: number
  taxAmount: number
  taxPercent: number
  commissionRate: number
  commissionBreakdown: PricingCommissionBreakdownItem[]
}

export const GST_PERCENT = 3
export const GST_RATE = GST_PERCENT / 100

const MAX_RATE = 100

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const round2 = (value: number): number => Number(value.toFixed(2))

const normalizeRate = (value: unknown): number => {
  const parsed = toFiniteNumber(value, 0)
  if (parsed <= 0) return 0
  if (parsed >= MAX_RATE) return MAX_RATE
  return round2(parsed)
}

const normalizeComponentType = (value: unknown): string => {
  const key = `${value || ''}`.trim().toLowerCase()
  if (key === 'labour') return 'labor'
  return key
}

const readComponentAmount = (component: any): number => {
  return Math.max(0, toFiniteNumber(component?.amount, 0))
}

export const extractPricingComponents = (product: any): { diamondAmount: number; laborAmount: number } => {
  const components = Array.isArray(product?.components) ? product.components : []
  let diamondAmount = 0
  let laborAmount = 0

  for (const component of components) {
    const type = normalizeComponentType(component?.type)
    const amount = readComponentAmount(component)
    if (amount <= 0) continue

    if (type === 'diamond') {
      diamondAmount += amount
      continue
    }

    if (type === 'labor') {
      laborAmount += amount
    }
  }

  return {
    diamondAmount: round2(diamondAmount),
    laborAmount: round2(laborAmount),
  }
}

const toComponentRatesObject = (componentRates: CommissionRateMap): Record<string, number> => {
  if (!componentRates) return {}
  const normalized: Record<string, number> = {}

  if (componentRates instanceof Map) {
    componentRates.forEach((value, key) => {
      const normalizedKey = normalizeComponentType(key)
      if (!normalizedKey) return
      normalized[normalizedKey] = normalizeRate(value)
    })
    return normalized
  }

  Object.entries(componentRates).forEach(([key, value]) => {
    const normalizedKey = normalizeComponentType(key)
    if (!normalizedKey) return
    normalized[normalizedKey] = normalizeRate(value)
  })

  return normalized
}

const getCommissionConfig = (user?: PricingUserLike): { defaultRate: number; diamondRate: number; laborRate: number } => {
  const rawConfig = (user?.commissionConfig || {}) as RawCommissionConfig
  const defaultRate = normalizeRate(rawConfig?.defaultRate)
  const componentRates = toComponentRatesObject(rawConfig?.componentRates)

  return {
    defaultRate,
    diamondRate: normalizeRate(componentRates.diamond),
    laborRate: normalizeRate(componentRates.labor),
  }
}

export const getLiveMetalRateForProduct = (product: any, liveRates?: Partial<MetalRates> | null): number => {
  const baseMetal = `${product?.material?.baseMetal || ''}`.trim().toLowerCase()
  const rate = baseMetal.includes('silver') ? toFiniteNumber(liveRates?.SilverRate, 0) : toFiniteNumber(liveRates?.GoldRate, 0)
  return Math.max(0, rate)
}

export const calculateCommissionBreakdown = (args: {
  mrp: unknown
  diamondAmount: unknown
  laborAmount: unknown
  user?: PricingUserLike
}): { commission: number; commissionRate: number; breakdown: PricingCommissionBreakdownItem[] } => {
  const mrp = Math.max(0, toFiniteNumber(args.mrp, 0))
  const diamondAmount = Math.max(0, toFiniteNumber(args.diamondAmount, 0))
  const laborAmount = Math.max(0, toFiniteNumber(args.laborAmount, 0))
  const { defaultRate, diamondRate, laborRate } = getCommissionConfig(args.user)

  if (defaultRate > 0) {
    const deductionAmount = round2((mrp * defaultRate) / 100)
    return {
      commission: deductionAmount,
      commissionRate: defaultRate,
      breakdown: [{ componentKey: 'default', baseAmount: round2(mrp), rate: defaultRate, deductionAmount }],
    }
  }

  const diamondDeduction = round2((diamondAmount * diamondRate) / 100)
  const laborDeduction = round2((laborAmount * laborRate) / 100)
  const commission = round2(diamondDeduction + laborDeduction)
  const commissionRate = mrp > 0 ? round2((commission / mrp) * 100) : 0

  return {
    commission,
    commissionRate,
    breakdown: [
      { componentKey: 'diamond', baseAmount: round2(diamondAmount), rate: diamondRate, deductionAmount: diamondDeduction },
      { componentKey: 'labor', baseAmount: round2(laborAmount), rate: laborRate, deductionAmount: laborDeduction },
    ],
  }
}

export const calculateProductPricing = (product: any, liveMetalRate: unknown, user?: PricingUserLike): ProductPricingResult => {
  const pureWeight = Math.max(0, toFiniteNumber(product?.weight?.pureWeight, 0))
  const rate = Math.max(0, toFiniteNumber(liveMetalRate, 0))
  const { diamondAmount, laborAmount } = extractPricingComponents(product)

  const metalPrice = round2(pureWeight * rate)
  const totalCost = round2(metalPrice + diamondAmount + laborAmount)
  const MRP = totalCost
  const taxAmount = round2(MRP * GST_RATE)
  const finalPrice = round2(MRP + taxAmount)
  const commissionCalc = calculateCommissionBreakdown({ mrp: MRP, diamondAmount, laborAmount, user })

  return {
    metalPrice,
    diamondAmount,
    laborAmount,
    totalCost,
    MRP,
    finalPrice,
    commission: commissionCalc.commission,
    taxAmount,
    taxPercent: GST_PERCENT,
    commissionRate: commissionCalc.commissionRate,
    commissionBreakdown: commissionCalc.breakdown,
  }
}

export const calculateProductPricingFromRates = (
  product: any,
  liveRates?: Partial<MetalRates> | null,
  user?: PricingUserLike
): ProductPricingResult => {
  const liveMetalRate = getLiveMetalRateForProduct(product, liveRates)
  return calculateProductPricing(product, liveMetalRate, user)
}

export const withComponentCostSnapshot = (product: any) => {
  const base = product && typeof product === 'object' ? { ...product } : {}
  const pricing = calculateProductPricing(base, 0)
  const nextCost = { ...(base?.cost || {}), totalCost: pricing.totalCost }

  return {
    ...base,
    cost: nextCost,
  }
}

export const computeBaseAmount = (args: { totalCost?: unknown; liveMetal?: unknown }) => {
  const totalCost = toFiniteNumber(args.totalCost, 0)
  const liveMetal = toFiniteNumber(args.liveMetal, 0)
  return round2(Math.max(0, totalCost + liveMetal))
}

export const computeTaxAmount = (taxableAmount: unknown, taxRate = GST_RATE) => {
  const parsedTaxRate = Math.max(0, toFiniteNumber(taxRate, GST_RATE))
  const parsedTaxableAmount = Math.max(0, toFiniteNumber(taxableAmount, 0))
  return round2(parsedTaxableAmount * parsedTaxRate)
}

export const computeFinalPriceWithTax = (taxableAmount: unknown, taxRate = GST_RATE) => {
  const parsedTaxableAmount = Math.max(0, toFiniteNumber(taxableAmount, 0))
  const taxAmount = computeTaxAmount(parsedTaxableAmount, taxRate)
  return {
    taxableAmount: round2(parsedTaxableAmount),
    taxAmount,
    finalPrice: round2(parsedTaxableAmount + taxAmount),
    taxPercent: round2(Math.max(0, toFiniteNumber(taxRate, GST_RATE)) * 100),
  }
}

const safeRate = (value: unknown) => Math.max(0, toFiniteNumber(value, 0))

export const buildLivePricingStages = (goldRate: number, silverRate: number) => {
  const goldRateValue = safeRate(goldRate)
  const silverRateValue = safeRate(silverRate)
  const typeExpr = { $toLower: { $ifNull: ['$$this.type', ''] } }
  const amountExpr = { $convert: { input: '$$this.amount', to: 'double', onError: 0, onNull: 0 } }

  return [
    {
      $addFields: {
        metalPrice: {
          $multiply: [
            {
              $max: [
                0,
                {
                  $convert: {
                    input: { $ifNull: ['$weight.pureWeight', 0] },
                    to: 'double',
                    onError: 0,
                    onNull: 0,
                  },
                },
              ],
            },
            {
              $cond: [
                { $regexMatch: { input: { $toLower: { $ifNull: ['$material.baseMetal', ''] } }, regex: 'silver' } },
                silverRateValue,
                goldRateValue,
              ],
            },
          ],
        },
        diamondAmount: {
          $reduce: {
            input: { $ifNull: ['$components', []] },
            initialValue: 0,
            in: {
              $add: [
                '$$value',
                {
                  $cond: [{ $eq: [typeExpr, 'diamond'] }, { $max: [0, amountExpr] }, 0],
                },
              ],
            },
          },
        },
        laborAmount: {
          $reduce: {
            input: { $ifNull: ['$components', []] },
            initialValue: 0,
            in: {
              $add: [
                '$$value',
                {
                  $cond: [{ $in: [typeExpr, ['labor', 'labour']] }, { $max: [0, amountExpr] }, 0],
                },
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        liveMetal: '$metalPrice',
        totalCost: { $add: [{ $ifNull: ['$metalPrice', 0] }, { $ifNull: ['$diamondAmount', 0] }, { $ifNull: ['$laborAmount', 0] }] },
      },
    },
    {
      $addFields: {
        MRP: { $ifNull: ['$totalCost', 0] },
        baseAmount: { $ifNull: ['$totalCost', 0] },
        taxableAmount: { $ifNull: ['$totalCost', 0] },
      },
    },
    {
      $addFields: {
        taxAmount: { $multiply: [{ $ifNull: ['$MRP', 0] }, GST_RATE] },
        taxPercent: GST_PERCENT,
      },
    },
    {
      $addFields: {
        finalPrice: { $add: [{ $ifNull: ['$MRP', 0] }, { $ifNull: ['$taxAmount', 0] }] },
      },
    },
  ]
}
