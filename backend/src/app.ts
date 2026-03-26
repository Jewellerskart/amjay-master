import express from 'express'
import { config } from 'dotenv'
import cors, { type CorsOptions } from 'cors'
import cookiesParser from 'cookie-parser'
import helmet from 'helmet'
import { connect } from './config/db'
import { ApiResponse } from './utils'
import { globalErrorHandler, mongoSanitize, notFoundHandler } from './middlewares'
import { applyRoutes } from './routes'

config()
connect()

const app = express()

app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(helmet())
app.use(mongoSanitize)

const defaultOrigin = 'http://localhost:5173'
const rawOrigins = (process.env.ALLOWED_ORIGINS || defaultOrigin).split(',')
const allowedOrigins = Array.from(new Set(rawOrigins.map((origin) => origin.trim()).filter(Boolean)))

if (!allowedOrigins.length) {
  allowedOrigins.push(defaultOrigin)
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error('Not allowed by CORS'))
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

applyRoutes(app)
app.use(notFoundHandler)
app.use(globalErrorHandler)

export { app }
