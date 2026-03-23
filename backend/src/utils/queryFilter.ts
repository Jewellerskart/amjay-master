type QueryFilter = Record<string, any>

type ApplySearchFilterOptions = {
  queryFilter: QueryFilter
  search?: string
  searchBy?: string
  searchableFields: string[]
}

export const applySearchFilter = (options: ApplySearchFilterOptions) => {
  const { queryFilter, search, searchBy, searchableFields } = options

  const normalizedSearch = typeof search === 'string' ? search.trim() : ''
  if (!normalizedSearch) return

  if (searchBy && searchableFields.includes(searchBy)) {
    queryFilter[searchBy] = { $regex: normalizedSearch, $options: 'i' }
    return
  }

  queryFilter.$or = searchableFields.map((field) => ({
    [field]: { $regex: normalizedSearch, $options: 'i' },
  }))
}
