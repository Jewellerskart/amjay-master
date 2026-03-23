import rateLimit from 'express-rate-limit'

export const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      status_code: 429,
      data: {},
      message: 'Too many registration attempts. Try again later.',
      success: false,
    })
  },
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
})

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      status_code: 429,
      data: {},
      message: 'Too many login attempts. Try again later.',
      success: false,
    })
  },
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
})
