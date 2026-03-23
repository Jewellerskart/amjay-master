import express from 'express'
import { config } from 'dotenv'
import cors from 'cors'
import { connect } from './config/db'
import cookiesParser from 'cookie-parser'
import { ApiResponse } from './utils'
import helmet from 'helmet'
import { mongoSanitize } from './middleware/sanitize.middleware'
import authRoute from './module/auth/route/auth.routes'
import contactQueryRoute from './module/contact-admin/route/contactQuery.routes'
import notificationRoute from './module/notification/route/notification.routes'
import productRoute from './module/product/route/product.routes'
import inventoryRoute from './module/inventory/route/inventory.routes'
import walletRoute from './module/wallet/route/wallet.route'
import commissionRoute from './module/commission/route/commission.route'
import ticketRoute from './module/ticket/route/ticket.route'
import invoiceRoute from './module/invoice/route/invoice.route'
import posRoute from './module/pos/route/pos.route'

const app = express()
config()
connect()

app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true }))

app.use(helmet())
app.use(mongoSanitize)

const defaultOrigin = 'http://localhost:5173'
const rawOrigins = (process.env.ALLOWED_ORIGINS || defaultOrigin).split(',')
const allowedOrigins = Array.from(new Set(rawOrigins.map((origin) => origin.trim()).filter((origin) => origin.length > 0)))
if (!allowedOrigins.length) {
  allowedOrigins.push(defaultOrigin)
}

const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.use(cookiesParser())
app.set('trust proxy', 1)

app.get('/health', (_req, res) => {
  res.status(200).json(new ApiResponse(200, { status: 'ok' }, 'healthy'))
})

app.use('/api/v1', authRoute)
app.use('/api/v1', contactQueryRoute)
app.use('/api/v1', notificationRoute)
app.use('/api/v1', productRoute)
app.use('/api/v1', inventoryRoute)
app.use('/api/v1', walletRoute)
app.use('/api/v1', commissionRoute)
app.use('/api/v1', ticketRoute)
app.use('/api/v1', invoiceRoute)
app.use('/api/v1', posRoute)

// 404 Handler
app.use((_req, res) => {
  res.status(404).json(new ApiResponse(404, {}, 'Route not found'))
})

// Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err)
  const status = typeof err?.status_code === 'number' ? err.status_code : 500
  const message = typeof err?.message === 'string' ? err.message : 'Internal Server Error'
  return res.status(status).json(new ApiResponse(status, {}, message))
})

export { app }
