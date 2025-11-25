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

export function createAssessmentInvitationEmail({
  participantName,
  sessionName,
  interviewUrl,
  organizationName,
  participantRole,
}: {
  participantName: string
  sessionName: string
  interviewUrl: string
  organizationName: string
  participantRole: string
}) {
  const subject = `Mời tham gia Assessment Center: ${sessionName}`

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
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          padding: 30px;
          border-radius: 8px;
          color: white;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
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
          background: #059669;
          color: white;
          text-decoration: none;
          padding: 15px 30px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 25px 0;
          text-align: center;
        }
        .assessment-info {
          background: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 20px;
          margin: 20px 0;
        }
        .phase {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 15px;
          margin: 10px 0;
        }
        .phase-title {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 5px;
        }
        .phase-duration {
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
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
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
        }
        .preparation {
          background: #f0fdf4;
          border: 1px solid #22c55e;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
        }
        ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        li {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🎯 Assessment Center</div>
        <div>VietinBank AI Interviewer</div>
      </div>

      <div class="content">
        <h2>Xin chào ${participantName}!</h2>

        <p>Bạn được mời tham gia phiên đánh giá năng lực <strong>"${sessionName}"</strong> của tổ chức <strong>${organizationName}</strong>.</p>

        <div class="assessment-info">
          <h3>📋 Thông tin phiên đánh giá</h3>
          <p><strong>Vai trò của bạn:</strong> ${participantRole}</p>
          <p><strong>Phương pháp:</strong> Assessment Center - Đánh giá năng lực toàn diện</p>
          <p><strong>Thời gian dự kiến:</strong> 3-4 tiếng</p>
        </div>

        <h3>🏗️ Cấu trúc Assessment Center (4 giai đoạn)</h3>

        <div class="phase">
          <div class="phase-title">1. Thảo luận Case Study</div>
          <div class="phase-duration">⏱️ 120 phút - Thảo luận nhóm về tình huống kinh doanh thực tế</div>
        </div>

        <div class="phase">
          <div class="phase-title">2. TBEI Interview</div>
          <div class="phase-duration">⏱️ 15 phút - Phỏng vấn hành vi theo mô hình STAR</div>
        </div>

        <div class="phase">
          <div class="phase-title">3. HiPo Questionnaire</div>
          <div class="phase-duration">⏱️ 20 phút - Bảng câu hỏi tự đánh giá năng lực</div>
        </div>

        <div class="phase">
          <div class="phase-title">4. Knowledge Quiz</div>
          <div class="phase-duration">⏱️ 15 phút - Kiểm tra kiến thức chuyên môn</div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${interviewUrl}" class="button">🚀 Bắt đầu Assessment Center</a>
        </div>

        <div class="preparation">
          <h4>📚 Chuẩn bị cho Assessment Center:</h4>
          <ul>
            <li><strong>Thiết bị:</strong> Máy tính có camera và micro hoạt động tốt</li>
            <li><strong>Môi trường:</strong> Không gian yên tĩnh, ánh sáng đủ</li>
            <li><strong>Kết nối:</strong> Internet ổn định (khuyến nghị WiFi)</li>
            <li><strong>Thái độ:</strong> Chuẩn bị tinh thần tích cực, tự tin</li>
            <li><strong>Kinh nghiệm:</strong> Nghĩ trước về các tình huống công việc tiêu biểu</li>
          </ul>
        </div>

        <p><strong>Liên kết truy cập:</strong></p>
        <p style="word-break: break-all; color: #059669; background: #f0fdf4; padding: 10px; border-radius: 4px;">${interviewUrl}</p>

        <div class="security-note">
          <strong>⚠️ Lưu ý quan trọng:</strong>
          <ul style="margin: 10px 0;">
            <li>Giữ bí mật liên kết này và không chia sẻ với người khác</li>
            <li>Hoàn thành tất cả 4 giai đoạn trong cùng một phiên</li>
            <li>Đảm bảo không bị gián đoạn trong quá trình đánh giá</li>
            <li>Liên hệ bộ phận HR nếu gặp vấn đề kỹ thuật</li>
          </ul>
        </div>
      </div>

      <div class="footer">
        <p><strong>VietinBank AI Interviewer</strong> - Hệ thống đánh giá năng lực thông minh</p>
        <p>Email này được gửi từ tổ chức ${organizationName}</p>
        <p>🤖 Được tạo bởi AI Assistant</p>
      </div>
    </body>
    </html>
  `

  const text = `
    Assessment Center - VietinBank AI Interviewer

    Xin chào ${participantName}!

    Bạn được mời tham gia phiên đánh giá năng lực "${sessionName}" của tổ chức ${organizationName}.

    VAI TRÒ: ${participantRole}
    THỜI GIAN: 3-4 tiếng

    CẤU TRÚC ĐÁNH GIÁ:
    1. Thảo luận Case Study (120 phút)
    2. TBEI Interview (15 phút)
    3. HiPo Questionnaire (20 phút)
    4. Knowledge Quiz (15 phút)

    LIÊN KẾT TRUY CẬP:
    ${interviewUrl}

    CHUẨN BỊ:
    - Máy tính có camera và micro
    - Môi trường yên tĩnh
    - Internet ổn định
    - Chuẩn bị kinh nghiệm công việc để chia sẻ

    LƯU Ý:
    - Giữ bí mật liên kết này
    - Hoàn thành tất cả giai đoạn trong một phiên
    - Liên hệ HR nếu gặp vấn đề

    Chúc bạn thành công!
  `

  return { subject, html, text }
}

export async function sendAssessmentInvitationEmail({
  participantName,
  participantEmail,
  sessionName,
  interviewUrl,
  organizationName,
  participantRole,
}: {
  participantName: string
  participantEmail: string
  sessionName: string
  interviewUrl: string
  organizationName: string
  participantRole: string
}): Promise<boolean> {
  const emailContent = createAssessmentInvitationEmail({
    participantName,
    sessionName,
    interviewUrl,
    organizationName,
    participantRole,
  })

  return await sendEmail({
    to: participantEmail,
    ...emailContent,
  })
}