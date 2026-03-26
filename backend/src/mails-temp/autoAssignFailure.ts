import { mailLayout } from './baseTemplate'

type AutoAssignFailureMailArgs = {
  distributorName?: string
  distributorBusinessName?: string
  jewelerName?: string
  jewelerBusinessName?: string
  soldProductId?: string
  soldJewelCode?: string
  soldStyleCode?: string
  reason?: string
  errorMessage?: string
  occurredAt?: string
}

const row = (label: string, value?: string) => `
  <tr>
    <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;font-weight:600;color:#374151;width:185px;">${label}</td>
    <td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:13px;color:#111827;">${value || '-'}</td>
  </tr>
`

export const AutoAssignFailureMail = (args: AutoAssignFailureMailArgs) =>
  mailLayout({
    title: 'Auto Assignment Failed',
    subtitle: 'A sold product could not be auto-assigned back to the jeweler.',
    contentHtml: `
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">
        Please re-assign stock for this jeweler using the <strong>same design</strong> style code.
      </p>
      <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;border-radius:8px;overflow:hidden;">
        ${row('Distributor', args.distributorName)}
        ${row('Distributor Business', args.distributorBusinessName)}
        ${row('Jeweler', args.jewelerName)}
        ${row('Jeweler Business', args.jewelerBusinessName)}
        ${row('Sold Product ID', args.soldProductId)}
        ${row('Sold Jewel Code', args.soldJewelCode)}
        ${row('Style Code (Same Design)', args.soldStyleCode)}
        ${row('Failure Reason', args.reason)}
        ${row('Error', args.errorMessage)}
        ${row('Occurred At', args.occurredAt)}
      </table>
    `,
    footerNote: 'This is an automated auto-assignment failure alert.',
  })

export const AutoAssignFailureMailTemplate = (args: unknown) =>
  AutoAssignFailureMail((args || {}) as AutoAssignFailureMailArgs)
