import { Request, Response } from 'express'
import { ApiResponse, CatchError } from '../../../utils'
import { processSale } from '../service/pos.service'

export const sellProductController = CatchError(async (req: Request & { user?: any }, res: Response) => {
  if (!req.user?._id) {
    return res.status(401).json(new ApiResponse(401, { message: 'Unauthorized' }, 'Unauthorized'))
  }

  const { productId, jewelerId, salePrice, choice } = req.body
  const saleResult = await processSale({
    productId,
    jewelerId,
    salePrice,
    choice,
    soldBy: `${req.user?._id || ''}`.trim() || 'system',
  })

  return res.status(201).json(new ApiResponse(201, saleResult, 'Product sold successfully'))
})
