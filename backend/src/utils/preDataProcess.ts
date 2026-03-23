import { getDateRangeFromInput } from './dateRange'

export const preDataProcess = (preData: any) => {
  const limit = Number.isInteger(preData?.limit) && preData.limit > 0 ? preData.limit : 10
  const page = Number.isInteger(preData?.page) && preData.page > 0 ? preData.page : 1
  const sort = preData?.sort
  const order = ['ASC', 'DESC'].includes(preData?.order?.toUpperCase())
    ? preData.order.toUpperCase()
    : 'DESC'
  const search_by = preData?.search_by || ''
  const search = preData?.search || ''
  try {
    const { startDate, endDate } = getDateRangeFromInput(preData?.startDate, preData?.endDate)

    return { startDate, endDate, limit, page, sort, order, search, search_by }
  } catch (error) {
    console.error(error)
    const { startDate, endDate } = getDateRangeFromInput(undefined, undefined)
    return {
      startDate,
      endDate,
      limit,
      page,
      sort,
      order,
      search,
      search_by,
    }
  }
}
import XLSX from 'xlsx'
export const ExcelTOJson = (file: any) => {
  const fileBuffer = file?.buffer
  if (!fileBuffer) {
    return null
  }
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet)
}
