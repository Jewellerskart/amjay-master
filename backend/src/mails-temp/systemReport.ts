import { mailLayout } from './baseTemplate'

export const SystemReportMail = ({ subject, message }: any) =>
  mailLayout({
    title: subject || 'System Report',
    subtitle: 'Generated from AMJAY system monitoring.',
    contentHtml: `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">
          ${message || '-'}
        </p>
      </div>
      <p style="margin:14px 0 0;font-size:13px;color:#6b7280;">Please check the attached file for full details.</p>
    `,
    footerNote: 'This is an automated system report email.',
  })
