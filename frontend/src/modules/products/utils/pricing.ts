type PricingInput = {
  liveMetal?: unknown
  finalPrice?: unknown
  baseAmount?: unknown
  taxableAmount?: unknown
  taxAmount?: unknown
  taxPercent?: unknown
  commissionTotal?: unknown
  weight?: { pureWeight?: unknown }
  material?: { baseMetal?: unknown }
  cost?: { totalCost?: unknown; saleAmount?: unknown; metalValue?: unknown }
  saleAmount?: unknown
}

type LiveRates = {
  GoldRate?: unknown
  SilverRate?: unknown
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const getRatePerGram = (baseMetal: unknown, liveRates?: LiveRates): number => {
  const metal = `${baseMetal || ''}`.trim().toLowerCase()
  return metal.includes('silver')
    ? toFiniteNumber(liveRates?.SilverRate)
    : toFiniteNumber(liveRates?.GoldRate)
}

export const computeLiveMetal = (params: { pureWeight?: unknown; baseMetal?: unknown; liveRates?: LiveRates }): number => {
  const pureWeight = toFiniteNumber(params.pureWeight)
  if (pureWeight <= 0) return 0

  const ratePerGram = getRatePerGram(params.baseMetal, params.liveRates)
  if (ratePerGram <= 0) return 0

  return Number((pureWeight * ratePerGram).toFixed(2))
}

export const computeFinalPrice = (params: { totalCost?: unknown; liveMetal?: unknown }): number => {
  const totalCost = toFiniteNumber(params.totalCost)
  const liveMetal = toFiniteNumber(params.liveMetal)
  return Number((totalCost + liveMetal).toFixed(2))
}

export const resolveProductPricing = (product?: PricingInput | null, liveRates?: LiveRates) => {
  const apiLiveMetal = Number(product?.liveMetal)
  const apiBaseAmount = Number(product?.baseAmount)
  const apiTaxableAmount = Number(product?.taxableAmount)
  const apiTaxAmount = Number(product?.taxAmount)
  const apiTaxPercent = Number(product?.taxPercent)
  const apiCommissionTotal = Number(product?.commissionTotal)
  const apiFinalPrice = Number(product?.finalPrice)
  const hasApiLiveMetal = Number.isFinite(apiLiveMetal)
  const hasApiBaseAmount = Number.isFinite(apiBaseAmount)
  const hasApiTaxableAmount = Number.isFinite(apiTaxableAmount)
  const hasApiTaxAmount = Number.isFinite(apiTaxAmount)
  const hasApiTaxPercent = Number.isFinite(apiTaxPercent)
  const hasApiCommissionTotal = Number.isFinite(apiCommissionTotal)
  const hasApiFinalPrice = Number.isFinite(apiFinalPrice)

  const computedLiveMetal = computeLiveMetal({
    pureWeight: product?.weight?.pureWeight,
    baseMetal: product?.material?.baseMetal,
    liveRates,
  })

  const liveMetal = hasApiLiveMetal ? apiLiveMetal : computedLiveMetal
  const baseAmount = hasApiBaseAmount
    ? apiBaseAmount
    : computeFinalPrice({
        totalCost: product?.cost?.totalCost ?? product?.cost?.saleAmount ?? product?.saleAmount,
        liveMetal,
      })
  const commissionTotal = hasApiCommissionTotal ? apiCommissionTotal : 0
  const taxableAmount = hasApiTaxableAmount ? apiTaxableAmount : Math.max(0, baseAmount + commissionTotal)
  const taxPercent = hasApiTaxPercent ? apiTaxPercent : 3
  const taxAmount = hasApiTaxAmount ? apiTaxAmount : Number(((taxableAmount * taxPercent) / 100).toFixed(2))
  const finalPrice = hasApiFinalPrice
    ? apiFinalPrice
    : Number((taxableAmount + taxAmount).toFixed(2))

  return { liveMetal, baseAmount, commissionTotal, taxableAmount, taxAmount, taxPercent, finalPrice }
}
