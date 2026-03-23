import { NextFunction, Request, Response } from 'express'
import { ZodSchema } from 'zod'

export const CatchError = (theFunc: any) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(theFunc(req, res, next)).catch(next)
}

export class ApiResponse {
  status_code: number
  data: {}
  message: string
  success: boolean
  constructor(status_code: number, data: {}, message: string = 'success') {
    this.status_code = status_code
    this.data = data
    this.message = message
    this.success = status_code < 300
  }
}

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const errors = result.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))

      return res
        .status(400)
        .json(new ApiResponse(400, { errors }, 'Validation error. Found Invalid Input'))
    }

    req.body = result.data
    next()
  }
}
