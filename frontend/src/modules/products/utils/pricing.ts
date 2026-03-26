type PricingInput = {
  liveMetal?: unknown
  finalPrice?: unknown
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
  const apiFinalPrice = Number(product?.finalPrice)
  const hasApiLiveMetal = Number.isFinite(apiLiveMetal)
  const hasApiFinalPrice = Number.isFinite(apiFinalPrice)

  const computedLiveMetal = computeLiveMetal({
    pureWeight: product?.weight?.pureWeight,
    baseMetal: product?.material?.baseMetal,
    liveRates,
  })

  const liveMetal = hasApiLiveMetal ? apiLiveMetal : computedLiveMetal
  const finalPrice = hasApiFinalPrice
    ? apiFinalPrice
    : computeFinalPrice({
        totalCost: product?.cost?.totalCost ?? product?.cost?.saleAmount ?? product?.saleAmount,
        liveMetal,
      })

  return { liveMetal, finalPrice }
}
