import sgMail from '@sendgrid/mail'

// Email service for sending verification emails using SendGrid

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
} else {
  console.warn('SENDGRID_API_KEY not found in environment variables')
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('📧 Email would be sent (SendGrid not configured):')
      console.log(`To: ${to}`)
      console.log(`Subject: ${subject}`)
      console.log(`HTML: ${html}`)
      if (text) console.log(`Text: ${text}`)
      return true
    }

    const msg = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
        name: process.env.SENDGRID_FROM_NAME || 'VietinBank AI Interviewer',
      },
      replyTo: process.env.SENDGRID_REPLY_TO,
      subject,
      html,
      text: text || '', // SendGrid requires text field
    }

    // Check if sandbox mode is enabled
    if (process.env.SENDGRID_SANDBOX_MODE === 'true') {
      console.log('📧 SendGrid sandbox mode - email simulated:')
      console.log(`To: ${to}`)
      console.log(`Subject: ${subject}`)
      return true
    }

    await sgMail.send(msg)
    console.log(`📧 Email sent successfully to ${to}`)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

export function createVerificationEmailContent({
  email,
  token,
  organizationName,
  isNewOrganization,
}: {
  email: string
  token: string
  organizationName?: string
  isNewOrganization: boolean
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const verificationUrl = `${baseUrl}/auth/verify?token=${token}`

  const subject = isNewOrganization
    ? 'Xác thực tài khoản VietinBank AI Interviewer'
    : `Đăng nhập vào ${organizationName} - VietinBank AI Interviewer`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 10px;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .button {
          display: inline-block;
          background: #1e40af;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }
        .security-note {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 12px;
          margin: 20px 0;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">VietinBank AI Interviewer</div>
        <div>Hệ thống phỏng vấn AI thông minh</div>
      </div>

      <div class="content">
        <h2>Xin chào!</h2>

        ${
          isNewOrganization
            ? `
          <p>Cảm ơn bạn đã đăng ký sử dụng VietinBank AI Interviewer. Chúng tôi đã tạo tài khoản cho tổ chức của bạn.</p>
          <p>Để hoàn tất quá trình đăng ký, vui lòng xác thực địa chỉ email của bạn bằng cách nhấn vào nút bên dưới:</p>
        `
            : `
          <p>Bạn đã yêu cầu đăng nhập vào tổ chức <strong>${organizationName}</strong> trên hệ thống VietinBank AI Interviewer.</p>
          <p>Để hoàn tất đăng nhập, vui lòng xác thực địa chỉ email của bạn bằng cách nhấn vào nút bên dưới:</p>
        `
        }

        <div style="text-align: center;">
          <a href="${verificationUrl}" class="button">Xác thực email</a>
        </div>

        <p>Hoặc copy và dán liên kết này vào trình duyệt:</p>
        <p style="word-break: break-all; color: #1e40af;">${verificationUrl}</p>

        <div class="security-note">
          <strong>Lưu ý bảo mật:</strong> Liên kết xác thực này sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu đăng nhập, vui lòng bỏ qua email này.
        </div>
      </div>

      <div class="footer">
        <p>Email này được gửi từ VietinBank AI Interviewer</p>
        <p>Nếu bạn gặp vấn đề, vui lòng liên hệ bộ phận hỗ trợ.</p>
      </div>
    </body>
    </html>
  `

  const text = `
    VietinBank AI Interviewer

    ${
      isNewOrganization
        ? `Cảm ơn bạn đã đăng ký sử dụng VietinBank AI Interviewer. Để hoàn tất quá trình đăng ký, vui lòng xác thực địa chỉ email của bạn.`
        : `Bạn đã yêu cầu đăng nhập vào tổ chức ${organizationName}. Để hoàn tất đăng nhập, vui lòng xác thực địa chỉ email của bạn.`
    }

    Liên kết xác thực: ${verificationUrl}

    Liên kết này sẽ hết hạn sau 24 giờ.

    Nếu bạn không yêu cầu đăng nhập, vui lòng bỏ qua email này.
  `

  return { subject, html, text }
}

export async function sendVerificationEmail({
  email,
  token,
  organizationName,
  isNewOrganization,
}: {
  email: string
  token: string
  organizationName?: string
  isNewOrganization: boolean
}): Promise<boolean> {
  const emailContent = createVerificationEmailContent({
    email,
    token,
    organizationName,
    isNewOrganization,
  })

  return await sendEmail({
    to: email,
    ...emailContent,
  })
}