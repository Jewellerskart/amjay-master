import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses'
import { customLog } from '../utils/common'

const sesClient = new SESClient({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
})

export async function sendDynamicEmail(
  recipient: string,
  subject: string,
  args: unknown,
  templateFn: (args: unknown) => string,
  attachments: { filename: string; content: Buffer; contentType: string }[] = []
): Promise<boolean> {
  try {
    const attachmentText = attachments.length
      ? `<br/><br/><strong>Please find system generated attachment.</strong>`
      : ''
    const htmlBody = templateFn(args) + attachmentText

    if (!attachments.length) {
      const MailConfig = {
        Source: 'MANI CMS <development@jewellerskart.com>',
        Destination: { ToAddresses: [recipient] },
        Message: { Subject: { Data: subject }, Body: { Html: { Data: htmlBody } } },
      }
      await sesClient.send(new SendEmailCommand(MailConfig))
      return true
    }
    const boundary = `----=_Part_${Date.now()}`
    let mime = [
      `From: MANI CMS <development@jewellerskart.com>`,
      `To: ${recipient}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      htmlBody,
    ].join('\r\n')

    for (const { filename, content, contentType } of attachments) {
      mime += [
        ``,
        `--${boundary}`,
        `Content-Type: ${contentType}; name="${filename}"`,
        `Content-Disposition: attachment; filename="${filename}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        content.toString('base64'),
      ].join('\r\n')
    }

    mime += `\r\n--${boundary}--`

    await sesClient.send(
      new SendRawEmailCommand({
        RawMessage: { Data: Buffer.from(mime) },
        Destinations: [recipient],
        Source: 'MANI CMS <development@jewellerskart.com>',
      })
    )

    return true
  } catch (err) {
    console.log(err)
    return false
  }
}
