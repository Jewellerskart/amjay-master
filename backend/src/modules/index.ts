import type { Router } from 'express'
import authRoute from './auth/route/auth.routes'
import contactQueryRoute from './contact-admin/route/contactQuery.routes'
import notificationRoute from './notification/route/notification.routes'
import productRoute from './product/route/product.routes'
import inventoryRoute from './inventory/route/inventory.routes'
import commissionRoute from './commission/route/commission.route'
import ticketRoute from './ticket/route/ticket.route'
import invoiceRoute from './invoice/route/invoice.route'
import posRoute from './pos/route/pos.route'

export const apiV1Routes: Router[] = [
  authRoute,
  contactQueryRoute,
  notificationRoute,
  productRoute,
  inventoryRoute,
  commissionRoute,
  ticketRoute,
  invoiceRoute,
  posRoute,
]
