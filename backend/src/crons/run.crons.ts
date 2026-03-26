import { runStockMonitorCron } from './stock-monitor.cron'
import { runInvoiceReminderCron } from './invoice-reminder.cron'
import { runTicketEscalationCron } from './ticket-escalation.cron'

export const initCrons = () => {
  runStockMonitorCron()
  runInvoiceReminderCron()
  runTicketEscalationCron()
}
