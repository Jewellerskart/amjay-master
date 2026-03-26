export type ValidationErrorItem = {
  field?: string
  message?: string
}

export type ApiResponse<TData = any> = {
  status_code?: number
  data?: TData
  message?: string
  success?: boolean
}

export type PaginatedResult<TItem = any> = {
  data: TItem[]
  count: number
  page: number
  limit: number
  totalAmount?: number
  totalGrossAmount?: number
  totalCommissionTotal?: number
}
