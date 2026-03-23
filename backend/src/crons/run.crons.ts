import { runStockMonitorCron } from './stock-monitor.cron'
import { runInvoiceReminderCron } from './invoice-reminder.cron'
import { runTicketEscalationCron } from './ticket-escalation.cron'
import { runWalletLimitAlertCron } from './wallet-limit-alert.cron'

export const initCrons = () => {
  runStockMonitorCron()
  runInvoiceReminderCron()
  runTicketEscalationCron()
  runWalletLimitAlertCron()
}
