import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import sharp from 'sharp'

const s3 = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
})

const BUCKET = 'jk-product-dev'
const S3_URL = `https://${BUCKET}.s3.amazonaws.com`

const getExtensionFromMimeType = (mimeType: string) => {
  const normalized = (mimeType || '').toLowerCase()
  if (normalized.includes('pdf')) return 'pdf'
  if (normalized.includes('png')) return 'png'
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg'
  if (normalized.includes('webp')) return 'webp'
  if (normalized.includes('heic')) return 'heic'
  return 'bin'
}
export class S3Service {
  static FoldersPath = (folder: string) => {
    const basePath = folder || 'dump'
    return { Client: `pos/client/${basePath}` }
  }
  static GetFolderData = async (path: string) => {
    try {
      const { Contents } = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: path,
        })
      )

      if (!Contents) return []

      return Contents.map((item) => {
        const key = item.Key ?? ''
        const encodedKey = key
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/')
        return {
          path: key,
          name: key.split('/').pop(),
          type: key.match(/\.(jpg|jpeg|png|webp)$/i) ? 'image' : 'file',
          size: item.Size ?? 0,
          url: `${S3_URL}/${encodedKey}`,
        }
      })
    } catch (err) {
      console.error('S3 list error:', err)
      throw new Error('Failed to fetch folder data')
    }
  }
  static UploadImageAsWebp = async (
    fileBuffer: Buffer,
    folder: string,
    fileName: string
  ): Promise<string> => {
    try {
      const webpBuffer = await sharp(fileBuffer, { failOnError: false })
        .rotate()
        .toFormat('webp', { quality: 80 })
        .toBuffer()

      const key = `${folder}/${fileName}.webp`.replace(/\s+/g, '-')
      const payload = { Bucket: BUCKET, Key: key, Body: webpBuffer, ContentType: 'image/webp' }
      await s3.send(new PutObjectCommand(payload))

      return `${S3_URL}/${key}`
    } catch (err) {
      console.error('WebP upload error:', err)
      throw new Error('Image upload failed')
    }
  }

  static UploadFile = async (
    fileBuffer: Buffer,
    folder: string,
    fileName: string,
    mimeType: string
  ): Promise<string> => {
    try {
      const ext = getExtensionFromMimeType(mimeType)
      const key = `${folder}/${fileName}.${ext}`.replace(/\s+/g, '-')

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType || 'application/octet-stream',
        })
      )

      return `${S3_URL}/${key}`
    } catch (err) {
      console.error('File upload error:', err)
      throw new Error('File upload failed')
    }
  }

  static DeleteFromS3 = async (path: string) => {
    try {
      const { Contents } = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: path }))

      if (!Contents || Contents.length === 0) return
      const payload = {
        Bucket: BUCKET,
        Delete: { Objects: Contents.map((obj) => ({ Key: obj.Key! })) },
      }
      await s3.send(new DeleteObjectsCommand(payload))
    } catch (err) {
      console.error('Delete error:', err)
      throw new Error('Failed to delete from S3')
    }
  }

  static DeleteFolderData = async (path: string) => {
    try {
      const { Contents } = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: path }))
      if (!Contents || Contents.length === 0) return
      const payload = {
        Bucket: BUCKET,
        Delete: { Objects: Contents.map((obj) => ({ Key: obj.Key! })) },
      }
      await s3.send(new DeleteObjectsCommand(payload))
    } catch (err) {
      console.error('Delete folder error:', err)
      throw new Error('Failed to delete folder from S3')
    }
  }
}
