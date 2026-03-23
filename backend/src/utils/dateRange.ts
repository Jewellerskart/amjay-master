export const getNormalizedDateString = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().split('T')[0]
}

export const getDateRangeFromInput = (startDate?: unknown, endDate?: unknown) => {
  const normalizedEndDate = getNormalizedDateString(endDate) || new Date().toISOString().split('T')[0]

  const normalizedStartDate =
    getNormalizedDateString(startDate) ||
    new Date(new Date(normalizedEndDate).setMonth(new Date(normalizedEndDate).getMonth() - 6))
      .toISOString()
      .split('T')[0]

  return { startDate: normalizedStartDate, endDate: normalizedEndDate }
}

export const applyDateRangeFilter = (
  queryFilter: Record<string, any>,
  fieldName: string,
  startDate?: string,
  endDate?: string
) => {
  if (startDate && startDate.trim() !== '') {
    queryFilter[fieldName] = queryFilter[fieldName] || {}
    queryFilter[fieldName].$gte = new Date(startDate)
  }

  if (endDate && endDate.trim() !== '') {
    queryFilter[fieldName] = queryFilter[fieldName] || {}
    const endDateInclusive = new Date(endDate)
    endDateInclusive.setHours(23, 59, 59, 999)
    queryFilter[fieldName].$lte = endDateInclusive
  }
}
