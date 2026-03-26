import { Document, Types } from 'mongoose'

export type ProductHolderRole = 'super-admin' | 'admin' | 'distributor' | 'jeweler'
export type ProductStatus = 'AVAILABLE' | 'ASSIGNED' | 'RENTED' | 'PURCHASE_PENDING_PAYMENT' | 'ACTIVE' | 'SOLD'

export const PRODUCT_STATUS_VALUES: ProductStatus[] = ['AVAILABLE', 'ASSIGNED', 'RENTED', 'PURCHASE_PENDING_PAYMENT', 'ACTIVE', 'SOLD']

export interface IProduct extends Document {
  status: ProductStatus
  parentProductId?: Types.ObjectId | null
  image?: string
  qty?: number
  diamond?: { pieces?: number; weight?: number }
  colorDiamond?: { pieces?: number; weight?: number }
  stone?: { pieces?: number; weight?: number }
  material?: { baseMetal?: string; metalGroupName?: string }

  product?: {
    transNo?: string
    orderNo?: string
    jewelCode?: string
    styleCode?: string
    itemPieces?: number
    HOID?: string
    CertificationNo?: string
  }

  weight?: {
    grossWeight?: number
    netWeight?: number
    pureWeight?: number
    oldPureWeight?: number
  }
  livePrice?: number
  saleAmount?: number

  cost?: {
    pieceValue?: number
    metalValue?: number
    diamondValue?: number
    colorStoneValue?: number
    otherMetalValue?: number
    goldCost?: number
    otherMetalCost?: number
    exchangeCost?: number
    totalCost?: number
    setAmount?: number
    handAmount?: number
  }

  components?: Array<{
    type?: 'metal' | 'diamond' | 'colorStone' | 'stone' | 'charge'
    materialType?: string
    itemCode?: string
    itemName?: string
    sizeCode?: string
    sizeName?: string
    pieces?: number
    weight?: number
    purity?: number
    costAmt?: number
    amount?: number
    descriptionCode?: string
  }>

  charges?: Array<{ type?: string; amount?: number }>

  returns?: {
    firstReturn?: { customerName?: string; reason?: string; date?: Date }
    lastReturn?: { customerName?: string; reason?: string; date?: Date }
  }

  originalDetails?: {
    originalClientName?: string
    originalClientCode?: string
    originalMfgName?: string
    originalMfgCode?: string
  }

  remarks?: string

  usage: {
    type: 'owner' | 'assigned' | 'pending' | 'rejected' | 'outright' | 'memo' | 'rented'
    by?: string
    date?: Date
  }
  uploadedBy?: { userId?: Types.ObjectId; role?: ProductHolderRole; name?: string; businessName?: string; at?: Date }
  currentHolder?: {
    userId?: Types.ObjectId
    role?: ProductHolderRole
    name?: string
    businessName?: string
    assignedAt?: Date
    assignedByUserId?: Types.ObjectId
    assignedByRole?: ProductHolderRole
    assignedByName?: string
  }
  assignmentLogs: Array<{
    fromUserId?: Types.ObjectId | null
    fromRole?: ProductHolderRole | ''
    fromName?: string
    fromBusinessName?: string
    toUserId?: Types.ObjectId | null
    toRole?: ProductHolderRole | ''
    toName?: string
    toBusinessName?: string
    assignedAt?: Date
    assignedByUserId?: Types.ObjectId | null
    assignedByRole?: ProductHolderRole | ''
    assignedByName?: string
    remark?: string
  }>
}

export interface IBulkImportParams {
  items: any[]
  format: string
  user: any
  name: string
  businessName: string
  role: string
}

export interface IServiceParams {
  page?: number
  limit?: number
  search?: string
  usageType?: 'owner' | 'assigned' | 'pending' | 'rejected' | 'outright' | 'memo' | 'rented' | ''
  group?: string
  subCategory?: string
  holderRole?: string
  currentHolderUserId?: string
  startDate?: string
  endDate?: string
  status?: ProductStatus | ''
  accessQuery?: any
  metals?: string
  baseQualities?: string
  diamonds?: string
  minWeight?: number
  maxWeight?: number
  minPrice?: number
  maxPrice?: number
  distributorId?: string
  model?: 'product' | 'assigned'
  includePending?: boolean
  includeAssignedClones?: boolean
  sortBy?: 'createdAt' | 'jewelCode' | 'styleCode' | 'qty' | 'weight' | 'price' | 'livePrice'
  sortDir?: 'asc' | 'desc'
}

export interface IBuildQuery {
  search: string
  usageType: string
  group: string
  subCategory: string
  metals: string
  baseQualities: string
  diamonds: string
  minWeight?: number
  maxWeight?: number
  minPrice?: number
  maxPrice?: number
  distributorId: string
  holderRole: string
  currentHolderUserId: string
  status: string
  startDate: string
  endDate: string
}
