import cron from 'node-cron'
import { InvoiceModel } from '../modules/invoice/model/invoice.schema'
import { customLog } from '../utils/common'

export const runInvoiceReminderCron = () => {
  cron.schedule('0 9 * * *', async () => {
    try {
      const threshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      const pendingInvoices = await InvoiceModel.find({
        status: 'PURCHASE_PENDING_PAYMENT',
        createdAt: { $lt: threshold },
      }).select('_id userId')
      if (pendingInvoices.length) {
        customLog({
          event: 'cron.invoice-reminder',
          count: pendingInvoices.length,
          invoiceIds: pendingInvoices.map((invoice) => invoice._id.toString()),
        })
      }
    } catch (error: any) {
      customLog({ event: 'cron.invoice-reminder.error', error: error?.message || 'Failed to send reminders' })
    }
  })
}

