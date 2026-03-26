const allowedRootKeys = new Set([
  'orderStatus',
  'orderCompleteDate',
  'noOfTags',
  'status',
  'stock',
  'category',
  'material',
  'product',
  'diamond',
  'colorDiamond',
  'cubicZirconia',
  'stone',
  'weight',
  'cost',
  'qty',
  'components',
  'charges',
  'image',
  'book',
  'client',
  'salesperson',
  'orderDates',
  'ageing',
  'returns',
  'customerOrder',
  'originalDetails',
  'remarks',
  'filterDate',
  'compID',
  'syncDate',
  'usage',
  'uploadedBy',
  'currentHolder',
  'assignmentLogs',
  'parentProductId',
  'childCount',
  'childIds',
])

export const sanitizeProductPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return {}
  const clean: any = {}
  Object.keys(payload).forEach((key) => {
    if (allowedRootKeys.has(key)) clean[key] = payload[key]
  })

  const nestedQty = clean?.product?.qty
  if (clean.qty === undefined && nestedQty !== undefined) {
    const qty = Number(nestedQty)
    if (Number.isFinite(qty)) clean.qty = qty
  }

  if (clean?.product && typeof clean.product === 'object' && 'qty' in clean.product) {
    delete clean.product.qty
  }

  return clean
}
