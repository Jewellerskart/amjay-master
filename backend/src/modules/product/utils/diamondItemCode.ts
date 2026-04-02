export const DEFAULT_CLARITY_MAP: Record<string, string> = {
  'VVS-VS': 'VVS-VS',
  'VS-SI': 'VS-SI',
  VVS: 'VVS',
  VS: 'VS',
  SI: 'SI',
}

export const DEFAULT_SHAPE_MAP: Record<string, string> = {
  ROUND: 'ROUND',
  RND: 'ROUND',
  RD: 'ROUND',
  PRINCESS: 'PRINCESS',
  OVAL: 'OVAL',
  PEAR: 'PEAR',
  EMERALD: 'EMERALD',
  MARQUISE: 'MARQUISE',
  CUSHION: 'CUSHION',
}

const normalizeStringMap = (value: unknown, fallback: Record<string, string>) => {
  const pairs: Array<[string, string]> = []
  if (value instanceof Map) {
    value.forEach((v, k) => {
      pairs.push([`${k}`, `${v}`])
    })
  } else if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      pairs.push([`${k}`, `${v}`])
    })
  }

  const normalized: Record<string, string> = {}
  pairs.forEach(([key, val]) => {
    const k = `${key || ''}`.trim().toUpperCase()
    const v = `${val || ''}`.trim().toUpperCase()
    if (!k || !v) return
    normalized[k] = v
  })

  if (Object.keys(normalized).length) return normalized
  return { ...fallback }
}

const getSortedMapKeys = (map: Record<string, string>) =>
  Object.keys(map)
    .map((item) => `${item || ''}`.trim().toUpperCase())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)

export const getClarityFromItemCode = (code?: string, clarityMapInput?: unknown) => {
  const clarityMap = normalizeStringMap(clarityMapInput, DEFAULT_CLARITY_MAP)
  const val = `${code || ''}`.trim().toUpperCase()

  const len = val.length
  if (len >= 6) {
    const s5 = val.slice(len - 6)
    if (clarityMap[s5]) return clarityMap[s5]
  }

  for (const key of getSortedMapKeys(clarityMap)) {
    if (val.endsWith(key)) return clarityMap[key]
  }

  return ''
}

export const getShapeFromItemCode = (code?: string, shapeMapInput?: unknown) => {
  const shapeMap = normalizeStringMap(shapeMapInput, DEFAULT_SHAPE_MAP)
  const val = `${code || ''}`.trim().toUpperCase()

  const len = val.length
  if (len >= 6) {
    const s5 = val.slice(len - 6)
    if (shapeMap[s5]) return shapeMap[s5]
  }

  for (const key of getSortedMapKeys(shapeMap)) {
    if (val.endsWith(key)) return shapeMap[key]
  }

  return ''
}

export const toNormalizedClarityMap = (value: unknown) => normalizeStringMap(value, DEFAULT_CLARITY_MAP)
export const toNormalizedShapeMap = (value: unknown) => normalizeStringMap(value, DEFAULT_SHAPE_MAP)
