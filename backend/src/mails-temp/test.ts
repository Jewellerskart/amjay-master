import { mailLayout } from './baseTemplate'

export const TestMail = () =>
  mailLayout({
    title: 'Your Account Has Been Approved',
    subtitle: 'You can now login and start using the platform.',
    contentHtml: `
      <div style="font-size:15px;line-height:1.65;color:#374151;">
        <p style="margin:0 0 12px;">Dear User,</p>
        <p style="margin:0 0 12px;">Congratulations. Your account has been approved.</p>
        <p style="margin:0;">Best Regards,<br><strong>Jewel Days Team</strong></p>
      </div>
    `,
  })
