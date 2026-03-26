import { sanitizeProductPayload } from '../model/product.sanitize'
import { createProductsBulk } from '../model/product.service'
import { findDiamondRateMatch } from '../model/rate.service'
import { IBulkImportParams } from '../type/product'
import type { MetalRates } from '../utils/pricing'

const cleanString = (val: any): string | null => {
  if (val === null || val === undefined) return ''
  const v = String(val).trim()
  if (!v || v === 'NULL' || v === '\\N') return ''
  return v
}

const cleanNumber = (val: any): number => {
  if (val === null || val === undefined || val === '' || val === 'NULL' || val === '\\N') return 0
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

const imgUrl = 'http://172.16.1.245:3020/api/v1/mj-folder/image'

const OUNCE_TO_GRAM = 31.1034768
let metalRateCache: { value: MetalRates; expiresAt: number } = { value: { GoldRate: 0, SilverRate: 0 }, expiresAt: 0 }

export const HelperGatiRow = (rows: any[]) => {
  const productMap: Record<string, any> = {}

  for (const row of rows) {
    const transNo = cleanString(row.TransNo)
    const orderNo = cleanString(row.OrderNo)
    const styleCode = cleanString(row.Design || '')
    const jewelCode = cleanString(row.JewelCode)

    const key = `${transNo}_${styleCode}_${jewelCode}`
    const qty = cleanNumber(row.Qty)
    const isRoot = qty > 0

    if (!productMap[key]) {
      productMap[key] = {
        product: {},
        material: {},
        image: null,
        qty: 0,
        weight: {},
        diamond: {},
        colorDiamond: {},
        cost: {}, // cost is at root level, not inside product
        components: [],
        status: 'AVAILABLE',
        usage: { type: 'owner', by: '', date: null },
        uploadedBy: null,
        currentHolder: null,
        assignmentLogs: [],
      }
    }

    const product = productMap[key]

    if (isRoot) {
      if (!transNo || !orderNo || !styleCode) continue

      // Only initialize once
      if (!product.product?.transNo) {
        const imagePath =
          cleanString(row.ImageName) && cleanString(row.ImageExt)
            ? `${imgUrl}${cleanString(row.ImageSubFolder)?.replace('\\', '/')}/${cleanString(row.ImageName)}${cleanString(row.ImageExt)}`
            : null

        const diamondPieces = cleanNumber(row.DiaPc)
        const diamondWeight = cleanNumber(row.DiaWt)
        const colorPieces = cleanNumber(row.CSPc)
        const colorWeight = cleanNumber(row.CSWt)
        const handAmount = cleanNumber(row.HandAmt)
        const setAmount = cleanNumber(row.SetAmt)

        // Product info
        product.product = {
          transNo,
          orderNo,
          styleCode,
          jewelCode,
          category: cleanString(row.Category),
          categoryName: cleanString(row.CategoryName),
          categoryGroupName: cleanString(row.CategoryGroupName),
          subCategory: cleanString(row.SubCategory),
        }

        product.image = imagePath

        product.material = {
          baseMetal: cleanString(row.BaseMetal),
          baseQuality: cleanString(row.MetalGroupName),
        }

        product.qty = qty

        product.weight = {
          grossWeight: cleanNumber(row.GrossWt),
          netWeight: cleanNumber(row.NetWt),
          pureWeight: cleanNumber(row.PureWt),
        }

        product.cost = {
          pieceValue: cleanNumber(row.PcSaleValue),
          metalValue: cleanNumber(row.MetSaleVal),
          diamondValue: cleanNumber(row.DiaSaleVal),
          colorStoneValue: cleanNumber(row.CSSaleVal),
          otherMetalValue: cleanNumber(row.OthMtlSaleValue),
          handAmount,
          setAmount,
          totalCost: setAmount + handAmount + cleanNumber(row.OthMtlSaleValue),
        }

        product.diamond = { pieces: diamondPieces, weight: diamondWeight }
        product.colorDiamond = { pieces: colorPieces, weight: colorWeight }

        if (isRoot) {
          product.components.push({
            type: 'Labor',
            weight: cleanNumber(row.NetWt),
            costAmt: cleanNumber(row.LabSaleValue),
            amount: cleanNumber(1000 * row.NetWt),
            descriptionCode: 'Default Labor',
          })
        }
      }
    }

    // Add component data
    const hasComponentData = cleanString(row.RawMitName) || cleanString(row.ItemCode)

    if (hasComponentData) {
      const comp: any = {
        type: row?.RawMitName,
        materialType: cleanString(row.MetalGroupName),
        itemCode: cleanString(row.ItemCode),
        itemName: cleanString(row.ItemName),
        sizeCode: cleanString(row.SizeCode),
        sizeName: cleanString(row.SizeName),
        pieces: cleanNumber(row.Pieces),
        weight: cleanNumber(row.Weight),
        purity: cleanNumber(row.QlyPurity),
        costAmt: cleanNumber(Math.round(row.Rate * row.Weight) || 0),
        amount: cleanNumber(row.Amount),
        descriptionCode: cleanString(row.DescriptionCode),
      }

      product.components.push(comp)
    }
  }

  return Object.values(productMap)
}
export const HelperRow = (rows: any[]) => rows || []

export const MetalLiveRate = async (): Promise<MetalRates> => {
  const now = Date.now()
  if (metalRateCache.expiresAt > now) return metalRateCache.value

  try {
    const response = await fetch('https://share.jewellerskart.com/api/metal/live-price')
    if (!response.ok) throw new Error(`Metal live rate failed with status ${response.status}`)

    const goldResponse = await response.json()
    const metal = goldResponse?.data?.metals?.[0] || {}
    const gold = Number(((metal?.XAU || 0) / OUNCE_TO_GRAM).toFixed(2))
    const silver = Number(((metal?.XAG || 0) / OUNCE_TO_GRAM).toFixed(2))
    const rates: MetalRates = { GoldRate: Number.isFinite(gold) ? gold : 0, SilverRate: Number.isFinite(silver) ? silver : 0 }

    metalRateCache = { value: rates, expiresAt: now + 60_000 }
    return rates
  } catch (error) {
    return metalRateCache.value
  }
}

const applyAddOnPurity = (item: any) => {
  const weight = item?.weight || {}
  const rawPure = Number(weight?.pureWeight ?? item?.PureWeight ?? item?.PureWt ?? item?.pureWeight ?? 0)
  const rawAddOn =
    Number(item?.AddOnPurity ?? item?.addonpurity ?? item?.AddOnpurity ?? item?.addOnPurity ?? item?.addOnpurity ?? weight?.addOnPurity ?? 0) || 0

  const oldPureWeight = Number.isFinite(rawPure) ? rawPure : 0
  const addOnValue = Number.isFinite(rawAddOn) ? rawAddOn : 0
  const adjustedPure = addOnValue ? Number((oldPureWeight * (1 + addOnValue / 100)).toFixed(4)) : oldPureWeight

  const nextWeight = { ...weight, pureWeight: adjustedPure, oldPureWeight }
  delete (nextWeight as any).addOnPurity

  return { ...item, weight: nextWeight }
}

const getShapeFromItemCode = (code?: string) => {
  const shapeFromItem: Record<string, string> = { RND: 'ROUND', PEA: 'PEAR', OV: 'OVAL', EM: 'EMERALD', PRN: 'PRINCESS' }
  const val = (code || '').toUpperCase()
  const p3 = val.slice(0, 3)
  if (shapeFromItem[p3]) return shapeFromItem[p3]
  const p2 = val.slice(0, 2)
  if (shapeFromItem[p2]) return shapeFromItem[p2]
  return ''
}
const getClarityFromItemCode = (code?: string) => {
  const clarityMap: Record<string, string> = { 'VVS-VS': 'VVS-VS', 'VS-SI': 'VS-SI', VVS: 'VVS', VS: 'VS', SI: 'SI' }
  const val = (code || '').toUpperCase()

  const len = val.length
  if (len >= 6) {
    const s5 = val.slice(len - 6)
    if (clarityMap[s5]) return clarityMap[s5]
  }
  return ''
}
const applyDiamondRatesToComponents = async (items: any[]) => {
  for (const item of items) {
    const components: any[] = Array.isArray(item?.components) ? item.components : []

    let diamondTotal = 0

    for (const comp of components) {
      const compType = (comp?.type || '').toLowerCase()
      if (compType !== 'diamond') {
        diamondTotal += comp?.amount
        continue
      }

      const weight = Number(comp?.weight ?? 0)
      const pieces = Number(comp?.pieces ?? 0)

      if (pieces === 0) {
        comp.amount = comp.amount || 0
        continue
      }

      if (weight === 0) {
        comp.amount = comp.amount || 0
        continue
      }

      const perStone = weight / pieces
      const clarity = getClarityFromItemCode(comp?.itemCode)
      const shape = getShapeFromItemCode(comp?.itemCode)
      const rateMatch = await findDiamondRateMatch({ carat: perStone, clarity, shape })
      if (rateMatch) {
        const ratePerCarat = Number(rateMatch.ratePerCarat || 0)
        const amount = Number((weight * ratePerCarat).toFixed(2))

        comp.amount = amount
        comp.clarity = clarity || rateMatch.clarity
        comp.shape = shape || rateMatch.shape

        diamondTotal += amount
      }
    }
    item.cost.totalCost = diamondTotal
  }
}
export const normalizeRole = (role?: string) => {
  const val = `${role || ''}`.trim().toLowerCase()
  if (['super-admin', 'admin', 'distributor', 'jeweler'].includes(val)) return val
  return 'admin'
}
export async function processBulkImport(params: IBulkImportParams) {
  const { items, format, user, name, businessName, role } = params
  const safeRole = normalizeRole(role)
  const normalizedRaw = format === 'gati' ? HelperGatiRow(items) : HelperRow(items)
  const normalized = normalizedRaw
    .map(applyAddOnPurity)
    .map(sanitizeProductPayload)
    .filter((p: any) => {
      const item = p?.product
      const [transNo, jewelCode, styleCode, qty] = [item?.transNo, item?.jewelCode, item?.styleCode, Number(p?.qty || 0)]
      return !!transNo && !!jewelCode && !!styleCode && qty > 0
    })
  if (!normalized.length) {
    return {
      statusCode: 400,
      message: 'No valid rows to import (need transNo, orderNo, styleCode and qty>0)',
      data: { inserted: 0, received: items.length, errors: [] },
    }
  }

  const enriched = normalized.map((item: any) => ({
    status: 'AVAILABLE',
    usage: { type: 'owner' },
    ...item,
    uploadedBy: { userId: user?._id, role: safeRole, name, businessName, at: new Date() },
    currentHolder: { userId: user?._id, role: safeRole, name, businessName },
    assignmentLogs: [
      {
        fromUserId: null,
        fromRole: safeRole,
        fromName: name,
        fromBusinessName: businessName,
        toUserId: user?._id,
        toRole: safeRole,
        toName: name,
        toBusinessName: businessName,
        remark: 'Bulk import default assignment',
      },
    ],
  }))

  await applyDiamondRatesToComponents(enriched)

  const result: any = await createProductsBulk(enriched)
  const { inserted, modified } = result
  const statusCode = inserted > 0 || modified > 0 ? 201 : 207

  const message = statusCode == 201 ? 'Bulk import completed' : 'Bulk import completed with no inserts; check errors'
  const data = { inserted, modified, errors: result.errors }
  return { statusCode, message, data }
}
