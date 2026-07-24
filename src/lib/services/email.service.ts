// src/lib/services/email.service.ts
// Email service for sending transactional emails

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@sabify.app'
const SMTP_HOST = process.env.SMTP_HOST || 'localhost'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''

let transporter: Transporter | null = null

/**
 * Initialize email transporter (singleton)
 */
function getTransporter(): Transporter {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // TLS for 587, SSL for 465
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })

  return transporter
}

/**
 * Wrap email in standard table-based HTML template
 */
function wrapEmail(content: string, brandColor: string = '#3b82f6'): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sabify</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: ${brandColor}; color: white; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .body { padding: 32px 24px; color: #1f2937; line-height: 1.6; }
    .footer { padding: 24px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; }
    a { color: ${brandColor}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .button { display: inline-block; background-color: ${brandColor}; color: white; padding: 12px 24px; border-radius: 6px; font-weight: 600; text-decoration: none; margin: 16px 0; }
    .button:hover { opacity: 0.9; }
    .code-box { background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; text-align: center; font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: ${brandColor}; margin: 16px 0; }
    .notice { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 13px; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Sabify</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Sabify. All rights reserved.</p>
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Send verification email with OTP code
 */
export async function sendVerificationEmail(options: {
  email: string
  code: string
  expiryMinutes: number
}): Promise<void> {
  // Skip in development unless explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.SEND_EMAILS_DEV) {
    console.log('[email] [DEV] Verification email would be sent to:', options.email)
    console.log('[email] [DEV] Code:', options.code)
    return
  }

  const { email, code, expiryMinutes } = options

  const expiryHours = Math.ceil(expiryMinutes / 60)

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1f2937;">Verify your email address</h2>
    
    <p>Thank you for signing up with Sabify. To complete your registration, please verify your email address using the code below:</p>
    
    <div class="code-box">${code}</div>
    
    <p><strong>This code expires in ${expiryHours} hour${expiryHours > 1 ? 's' : ''}.</strong></p>
    
    <p>If you didn't sign up for Sabify, you can safely ignore this email.</p>
    
    <div class="notice">
      <strong>Security note:</strong> Never share this code with anyone. Sabify staff will never ask for your verification code.
    </div>
  `

  const html = wrapEmail(content)

  try {
    const transporter = getTransporter()

    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: 'Verify your Sabify email address',
      html,
      text: `
Verify your email address

Thank you for signing up with Sabify. To complete your registration, please use this code:

${code}

This code expires in ${expiryHours} hour${expiryHours > 1 ? 's' : ''}.

If you didn't sign up for Sabify, you can safely ignore this email.

Security note: Never share this code with anyone. Sabify staff will never ask for your verification code.
      `.trim(),
    })

    console.log('[email] Verification email sent to:', email)
  } catch (error) {
    console.error('[email] Failed to send verification email:', error)
    throw error
  }
}

/**
 * Send password reset email with OTP code
 */
export async function sendPasswordResetEmail(options: {
  email: string
  code: string
  expiryMinutes: number
}): Promise<void> {
  // Skip in development unless explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.SEND_EMAILS_DEV) {
    console.log('[email] [DEV] Password reset email would be sent to:', options.email)
    console.log('[email] [DEV] Code:', options.code)
    return
  }

  const { email, code, expiryMinutes } = options

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1f2937;">Reset your password</h2>
    
    <p>We received a request to reset your password. Use the code below to create a new password:</p>
    
    <div class="code-box">${code}</div>
    
    <p><strong>This code expires in ${expiryMinutes} minute${expiryMinutes > 1 ? 's' : ''}.</strong></p>
    
    <p>If you didn't request a password reset, you can safely ignore this email. Your account is secure.</p>
    
    <div class="notice">
      <strong>Security note:</strong> Never share this code with anyone. Sabify staff will never ask for your reset code.
    </div>
  `

  const html = wrapEmail(content)

  try {
    const transporter = getTransporter()

    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: 'Reset your Sabify password',
      html,
      text: `
Reset your password

We received a request to reset your password. Use the code below to create a new password:

${code}

This code expires in ${expiryMinutes} minute${expiryMinutes > 1 ? 's' : ''}.

If you didn't request a password reset, you can safely ignore this email. Your account is secure.

Security note: Never share this code with anyone. Sabify staff will never ask for your reset code.
      `.trim(),
    })

    console.log('[email] Password reset email sent to:', email)
  } catch (error) {
    console.error('[email] Failed to send password reset email:', error)
    throw error
  }
}

/**
 * Send welcome email after account creation
 */
export async function sendWelcomeEmail(options: {
  email: string
  firstName: string
}): Promise<void> {
  if (process.env.NODE_ENV !== 'production' && !process.env.SEND_EMAILS_DEV) {
    console.log('[email] [DEV] Welcome email would be sent to:', options.email)
    return
  }

  const { email, firstName } = options

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1f2937;">Welcome to Sabify, ${firstName}!</h2>
    
    <p>Your account has been created successfully. You're all set to start using Sabify.</p>
    
    <p>Get started by:</p>
    <ul style="margin: 16px 0; padding-left: 20px;">
      <li>Exploring your dashboard</li>
      <li>Reviewing your account settings</li>
      <li>Reading our quick start guide</li>
    </ul>
    
    <p>If you have any questions, visit our <a href="https://sabify.app/help">help center</a> or contact support.</p>
  `

  const html = wrapEmail(content)

  try {
    const transporter = getTransporter()

    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: 'Welcome to Sabify!',
      html,
      text: `
Welcome to Sabify, ${firstName}!

Your account has been created successfully. You're all set to start using Sabify.

Get started by:
- Exploring your dashboard
- Reviewing your account settings
- Reading our quick start guide

If you have any questions, visit our help center or contact support.

Visit: https://sabify.app/help
      `.trim(),
    })

    console.log('[email] Welcome email sent to:', email)
  } catch (error) {
    console.error('[email] Failed to send welcome email:', error)
    throw error
  }
}

/**
 * Health check for email service
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transporter = getTransporter()
    await transporter.verify()
    console.log('[email] SMTP connection verified')
    return true
  } catch (error) {
    console.error('[email] SMTP connection failed:', error)
    return false
  }
}