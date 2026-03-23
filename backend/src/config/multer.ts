import { Request } from 'express'
import multer, { FileFilterCallback } from 'multer'

const MAX_FILE_SIZE_10_MB = 10 * 1024 * 1024

const createMimeTypeFilter =
  (allowedMimeTypes: string[]) => (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
      return
    }

    cb(new Error(`Invalid file type: ${file.mimetype}`))
  }

export const createMemoryUploader = (options?: {
  allowedMimeTypes?: string[]
  maxFileSize?: number
}) => {
  const { allowedMimeTypes, maxFileSize = MAX_FILE_SIZE_10_MB } = options || {}

  return multer({
    storage: multer.memoryStorage(),
    fileFilter: allowedMimeTypes ? createMimeTypeFilter(allowedMimeTypes) : undefined,
    limits: { fileSize: maxFileSize },
  })
}

const EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

const KYC_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
]

export const Upload = createMemoryUploader({ allowedMimeTypes: EXCEL_MIME_TYPES })
export const KycDocumentUpload = createMemoryUploader({ allowedMimeTypes: KYC_MIME_TYPES })
export const ContactQueryUpload = createMemoryUploader({ allowedMimeTypes: KYC_MIME_TYPES })
