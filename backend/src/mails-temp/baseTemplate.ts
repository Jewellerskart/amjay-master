type MailLayoutArgs = {
  title: string
  subtitle?: string
  contentHtml: string
  footerNote?: string
}

const BRAND_LOGO = 'https://www.manijewel.com/assets/images/logo.png'

export const mailLayout = ({ title, subtitle, contentHtml, footerNote }: MailLayoutArgs) => `
  <div style="background:#f3f6fb;padding:28px 0;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 14px 30px rgba(15,23,42,0.08);">
      <tr>
        <td style="padding:18px 24px;background:#111827;text-align:center;">
          <img src="${BRAND_LOGO}" width="150" alt="Jewel Days" style="display:block;margin:0 auto;max-width:150px;">
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">${title}</h2>
          ${subtitle ? `<p style="margin:0 0 16px;font-size:14px;color:#4b5563;">${subtitle}</p>` : ''}
          ${contentHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#6b7280;">
            ${footerNote || 'This is an automated message from Jewel Days support.'}
          </p>
          <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} Jewel Days. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </div>
`
