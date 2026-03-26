export type MetalRates = {
  GoldRate: number
  SilverRate: number
}

export const buildLivePricingStages = (goldRate: number, silverRate: number) => [
  {
    $addFields: {
      liveMetal: {
        $cond: [
          { $regexMatch: { input: { $toLower: '$material.baseMetal' }, regex: 'silver' } },
          { $multiply: [{ $ifNull: ['$weight.pureWeight', 0] }, silverRate] },
          { $multiply: [{ $ifNull: ['$weight.pureWeight', 0] }, goldRate] },
        ],
      },
    },
  },
  {
    $addFields: {
      finalPrice: { $multiply: [{ $add: [{ $ifNull: ['$cost.totalCost', 0] }, { $ifNull: ['$liveMetal', 0] }] }, 1.3] },
    },
  },
]
