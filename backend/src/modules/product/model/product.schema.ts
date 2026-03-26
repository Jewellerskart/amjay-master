import mongoose, { Schema } from 'mongoose'
import { IProduct, PRODUCT_STATUS_VALUES } from '../type/product'

const ProductSchema = new Schema<IProduct>(
  {
    material: { baseQuality: String, baseMetal: String },
    product: {
      styleCode: String,
      transNo: String,
      orderNo: String,
      jewelCode: String,
      category: String,
      categoryName: String,
      categoryGroupName: String,
      subCategory: String,
      HOID: String,
      CertificationNo: String,
    },

    image: String,
    qty: Number,
    weight: { grossWeight: Number, netWeight: Number, pureWeight: Number, oldPureWeight: Number },
    diamond: { pieces: Number, weight: Number },
    colorDiamond: { pieces: Number, weight: Number },
    stone: { pieces: Number, weight: Number },

    cost: {
      pieceValue: Number,
      metalValue: Number,
      diamondValue: Number,
      colorStoneValue: Number,
      otherMetalValue: Number,
      goldCost: Number,
      otherMetalCost: Number,
      exchangeCost: Number,
      totalCost: Number,
      setAmount: Number,
      handAmount: Number,
    },

    components: [
      {
        type: { type: String },
        materialType: String,
        itemCode: String,
        itemName: String,
        sizeCode: String,
        sizeName: String,
        pieces: Number,
        weight: Number,
        purity: Number,
        costAmt: Number,
        amount: Number,
        descriptionCode: String,
      },
    ],
    returns: {
      firstReturn: { customerName: String, reason: String, date: Date },
      lastReturn: { customerName: String, reason: String, date: Date },
    },

    originalDetails: {
      originalClientName: String,
      originalClientCode: String,
      originalMfgName: String,
      originalMfgCode: String,
    },

    remarks: String,

    status: { type: String, enum: PRODUCT_STATUS_VALUES, default: 'AVAILABLE', index: true },
    parentProductId: { type: Schema.Types.ObjectId, ref: 'Product', default: null, index: true },
    usage: {
      type: {
        type: String,
        enum: ['owner', 'assigned', 'pending', 'rejected', 'outright', 'memo', 'rented'],
        required: true,
        default: 'owner',
      },
      by: { type: String, default: '' },
      date: { type: Date, default: null },
    },
    uploadedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      role: { type: String, enum: ['super-admin', 'admin', 'distributor', 'jeweler'], default: 'admin' },
      name: { type: String, default: '' },
      businessName: { type: String, default: '' },
      at: { type: Date, default: null },
    },
    currentHolder: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
      role: { type: String, enum: ['super-admin', 'admin', 'distributor', 'jeweler'], default: 'admin', index: true },
      name: { type: String, default: '' },
      businessName: { type: String, default: '' },
      assignedAt: { type: Date, default: null },
      assignedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      assignedByRole: { type: String, enum: ['super-admin', 'admin', 'distributor', 'jeweler'], default: 'admin' },
      assignedByName: { type: String, default: '' },
    },
    assignmentLogs: [
      {
        fromUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        fromRole: { type: String, enum: ['super-admin', 'admin', 'distributor', 'jeweler'], default: 'admin' },
        fromName: { type: String, default: '' },
        fromBusinessName: { type: String, default: '' },
        toUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        toRole: { type: String, enum: ['super-admin', 'admin', 'distributor', 'jeweler'], default: 'admin' },
        toName: { type: String, default: '' },
        toBusinessName: { type: String, default: '' },
        assignedAt: { type: Date, default: null },
        assignedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        assignedByRole: { type: String, enum: ['super-admin', 'admin', 'distributor', 'jeweler'], default: 'admin' },
        assignedByName: { type: String, default: '' },
        remark: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
)

ProductSchema.index(
  { 'product.jewelCode': 1 },
  {
    unique: true,
    partialFilterExpression: {
      'product.jewelCode': { $exists: true, $type: 'string', $ne: '' },
    },
  }
)

export const ProductModel = mongoose.model<IProduct>('Product', ProductSchema)
