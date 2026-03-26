import type { Express } from 'express'
import { apiV1Routes } from '../modules'

export const applyRoutes = (app: Express): void => {
  apiV1Routes.forEach((route) => {
    app.use('/api/v1', route)
  })
}
