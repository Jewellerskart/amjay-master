import { mailLayout } from './baseTemplate'

export const OtpMail = ({ otp }: any) =>
  mailLayout({
    title: 'Your One-Time Password (OTP)',
    subtitle: 'Use this OTP to complete your verification.',
    contentHtml: `
      <div style="text-align:center;padding:6px 0 8px;">
        <div style="display:inline-block;background:#f8fafc;border:1px dashed #111827;border-radius:8px;padding:14px 26px;font-size:26px;font-weight:700;color:#111827;letter-spacing:4px;">
          ${otp}
        </div>
        <p style="margin:16px 0 0;font-size:14px;color:#6b7280;">
          OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>
    `,
  })
