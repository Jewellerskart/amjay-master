import cron from 'node-cron'
import { TicketModel } from '../module/ticket/model/ticket.schema'
import { customLog } from '../utils/common'

export const runTicketEscalationCron = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const staleThreshold = new Date(Date.now() - 1000 * 60 * 60 * 24)
      const staleTickets = await TicketModel.find({
        status: 'OPEN',
        createdAt: { $lt: staleThreshold },
      })
      if (!staleTickets.length) return

      await TicketModel.updateMany(
        {
          _id: { $in: staleTickets.map((ticket) => ticket._id) },
        },
        { priority: 'high' }
      )

      customLog({
        event: 'cron.ticket-escalation',
        count: staleTickets.length,
        ticketIds: staleTickets.map((ticket) => ticket._id.toString()),
      })
    } catch (error: any) {
      customLog({
        event: 'cron.ticket-escalation.error',
        error: error?.message || 'Failed to escalate tickets',
      })
    }
  })
}
