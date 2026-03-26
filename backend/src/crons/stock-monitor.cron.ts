import cron from 'node-cron'
import { ProductModel } from '../modules/product/model/product.schema'
import { customLog } from '../utils/common'

export const runStockMonitorCron = () => {
  cron.schedule('0 8 * * *', async () => {
    try {
      const [available, assigned, rented, sold] = await Promise.all([
        ProductModel.countDocuments({ status: 'AVAILABLE' }),
        ProductModel.countDocuments({ status: 'ASSIGNED' }),
        ProductModel.countDocuments({ status: 'RENTED' }),
        ProductModel.countDocuments({ status: 'SOLD' }),
      ])
      customLog({ event: 'cron.stock-monitor', available, assigned, rented, sold })
    } catch (error: any) {
      customLog({ event: 'cron.stock-monitor.error', error: error?.message || 'Failed to summarize stock' })
    }
  })
}

