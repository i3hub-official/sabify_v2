// src/lib/services/email.service.ts
// Email templates for password reset and email verification

import { env } from '$env/dynamic/private'

const SMTP_FROM = env.EMAIL_FROM || 'noreply@sabify.app'

/**
 * Send password reset email with OTP code
 */
export async function sendPasswordResetEmail({
  email,
  code,
  expiryMinutes = 30,
}: {
  email: string
  code: string
  expiryMinutes?: number
}): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] Password reset code for ${email}: ${code}`)
    return
  }

  const subject = 'Reset Your Sabify Password'
  const html = passwordResetEmailTemplate(code, expiryMinutes)

  await sendEmail({
    to: email,
    subject,
    html,
  })
}

/**
 * Send email verification email with OTP code
 */
export async function sendVerificationEmail({
  email,
  code,
  expiryMinutes = 24 * 60,
}: {
  email: string
  code: string
  expiryMinutes?: number
}): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] Verification code for ${email}: ${code}`)
    return
  }

  const subject = 'Verify Your Sabify Email'
  const html = emailVerificationTemplate(code, expiryMinutes)

  await sendEmail({
    to: email,
    subject,
    html,
  })
}

/**
 * Generic email sender
 */
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  // TODO: Integrate with your email provider (Resend, SendGrid, etc.)
  // For now, this is a placeholder

  try {
    // Example using Resend:
    // const { Resend } = await import('resend');
    // const resend = new Resend(env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: SMTP_FROM,
    //   to,
    //   subject,
    //   html,
    // });

    console.log(`Email sent to ${to}: ${subject}`)
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────

function passwordResetEmailTemplate(code: string, expiryMinutes: number): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #000; color: #fff; padding: 20px; text-align: center; border-radius: 4px 4px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 4px 4px; }
      .code-box { background: #fff; border: 2px solid #000; padding: 20px; text-align: center; margin: 20px 0; }
      .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #000; font-family: monospace; }
      .expiry { color: #666; font-size: 14px; margin-top: 15px; }
      .footer { font-size: 12px; color: #999; margin-top: 30px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0;">Sabify</h1>
      </div>
      <div class="content">
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your Sabify password. Use the code below to proceed:</p>
        
        <div class="code-box">
          <div class="code">${code}</div>
        </div>
        
        <p>This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
        
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          <strong>Didn't request this?</strong> You can safely ignore this email. Your password won't change unless you use the code above.
        </p>
        
        <div class="footer">
          <p>This is an automated message. Please don't reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Sabify. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
</html>
`
}

function emailVerificationTemplate(code: string, expiryMinutes: number): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #000; color: #fff; padding: 20px; text-align: center; border-radius: 4px 4px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 4px 4px; }
      .code-box { background: #fff; border: 2px solid #000; padding: 20px; text-align: center; margin: 20px 0; }
      .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #000; font-family: monospace; }
      .expiry { color: #666; font-size: 14px; margin-top: 15px; }
      .footer { font-size: 12px; color: #999; margin-top: 30px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0;">Sabify</h1>
      </div>
      <div class="content">
        <h2>Verify Your Email</h2>
        <p>Welcome to Sabify! To complete your account setup, please verify your email using the code below:</p>
        
        <div class="code-box">
          <div class="code">${code}</div>
        </div>
        
        <p>This code will expire in <strong>${Math.round(expiryMinutes / 60)} hours</strong>.</p>
        
        <p style="margin-top: 20px;">Once your email is verified, you'll have full access to all Sabify features.</p>
        
        <div class="footer">
          <p>This is an automated message. Please don't reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Sabify. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
</html>
`
}