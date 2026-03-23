import { mailLayout } from './baseTemplate'

type ContactQueryMailArgs = {
  title?: string
  subject?: string
  status?: string
  priority?: string
  message?: string
  remark?: string
  userName?: string
  userEmail?: string
  assignedToName?: string
  assignedToEmail?: string
}

const row = (label: string, value?: string) => `
  <tr>
    <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;font-weight:600;color:#374151;width:170px;">${label}</td>
    <td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:13px;color:#111827;">${value || '-'}</td>
  </tr>
`

export const ContactQueryMail = (args: ContactQueryMailArgs) =>
  mailLayout({
    title: args.title || 'Contact Query Update',
    subtitle: 'A support ticket has been created or updated.',
    contentHtml: `
      <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;border-radius:8px;overflow:hidden;">
        ${row('Subject', args.subject)}
        ${row('Status', args.status)}
        ${row('Priority', args.priority)}
        ${row('Assigned To', args.assignedToName || args.assignedToEmail)}
        ${row('User', args.userName && args.userEmail ? `${args.userName} (${args.userEmail})` : args.userEmail || args.userName)}
        ${row('Message', args.message)}
        ${row('Remark', args.remark)}
      </table>
    `,
    footerNote: 'You are receiving this email because you are part of contact-admin notifications.',
  })

export const ContactQueryMailTemplate = (args: unknown) =>
  ContactQueryMail((args || {}) as ContactQueryMailArgs)
