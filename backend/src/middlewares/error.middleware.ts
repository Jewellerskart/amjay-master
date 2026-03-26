import type { NextFunction, Request, Response } from 'express'
import { ApiResponse } from '../utils'

type AppError = {
  status_code?: number
  message?: string
}

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json(new ApiResponse(404, {}, 'Route not found'))
}

export const globalErrorHandler = (error: AppError, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('Error:', error)

  const statusCode = typeof error?.status_code === 'number' ? error.status_code : 500
  const message = typeof error?.message === 'string' ? error.message : 'Internal Server Error'

  res.status(statusCode).json(new ApiResponse(statusCode, {}, message))
}
