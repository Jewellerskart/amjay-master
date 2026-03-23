import mongoose, { Schema } from 'mongoose'
import { IContactQuery } from '../type/contactQuery'

const ContactQuerySchema = new Schema<IContactQuery>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true },
    userName: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    queryType: { type: String, enum: ['general', 'product-request'], default: 'general' },
    productRequest: {
      productRefId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
      preferredProductName: { type: String, default: '', trim: true, maxlength: 200 },
      preferredColor: { type: String, default: '', trim: true, uppercase: true },
      preferredCut: { type: String, default: '', trim: true, uppercase: true },
      preferredCarat: { type: Number, default: 0 },
      qty: { type: Number, default: 0 },
      budgetPerCarat: { type: Number, default: 0 },
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: {
      type: String,
      enum: ['new', 'in-progress', 'waiting-user', 'resolved', 'complete', 'cancelled'],
      default: 'new',
      index: true,
    },
    assignedToUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    assignedToEmail: { type: String, default: '', trim: true, lowercase: true },
    assignedToName: { type: String, default: '', trim: true },
    deadlineAt: { type: Date, default: null, index: true },
    attachments: [
      {
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true },
        mimeType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    actionLogs: [
      {
        action: { type: String, required: true },
        status: {
          type: String,
          enum: ['new', 'in-progress', 'waiting-user', 'resolved', 'complete', 'cancelled'],
          required: true,
        },
        remark: { type: String, default: '' },
        byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        byRole: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
)

export const ContactQueryModel = mongoose.model<IContactQuery>(
  'ContactQuery',
  ContactQuerySchema,
  'contact_query'
)
