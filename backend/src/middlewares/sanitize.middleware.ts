import { Request, Response, NextFunction } from 'express'

const sanitizeValue = (value: any): any => {
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(sanitizeValue)
    }

    const sanitized: any = {}
    for (const key in value) {
      if (!key.startsWith('$') && !key.includes('.')) {
        sanitized[key] = sanitizeValue(value[key])
      }
    }
    return sanitized
  }
  return value
}

export const mongoSanitize = (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeValue(req.body)
    }

    // Sanitize query params
    if (req.query) {
      const sanitizedQuery: any = {}
      for (const key in req.query) {
        if (!key.startsWith('$') && !key.includes('.')) {
          sanitizedQuery[key] = sanitizeValue(req.query[key])
        }
      }
      // Create new query object instead of modifying
      Object.defineProperty(req, 'sanitizedQuery', {
        value: sanitizedQuery,
        writable: true,
        enumerable: true,
        configurable: true,
      })
    }

    // Sanitize params
    if (req.params) {
      req.params = sanitizeValue(req.params)
    }

    next()
  } catch (error) {
    next(error)
  }
}
