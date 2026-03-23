export const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export const normalizeLowercase = (value: unknown) => {
  return normalizeString(value).toLowerCase()
}

export const toCaseInsensitiveExactRegex = (value: unknown) => {
  const normalized = normalizeString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${normalized}$`, 'i')
}
