import mongoose from 'mongoose'
const dbURL: string = process.env.MONGODB_URL || ''

export const connect = async () => {
  try {
    await mongoose.connect(dbURL)
    console.log('✅ MongoDB connected')
  } catch (err: any) {
    console.log(`Error: ${err}`)
    process.exit(1)
  }
}
