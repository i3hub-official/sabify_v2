// src/lib/server/auth/email.ts
// Email utilities for sending password reset emails, notifications, etc.
// Uses Gmail SMTP with App Password for secure authentication

import nodemailer from 'nodemailer'
import type { Transporter, SendMailOptions } from 'nodemailer'
import { env } from '$env/dynamic/private'

// ─── Environment Variables ───────────────────────────────────────────────────

const SMTP_HOST = env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(env.SMTP_PORT || '587', 10)
const SMTP_USER = env.SMTP_USER || ''
const SMTP_PASS = env.SMTP_PASS || ''
const EMAIL_FROM = env.EMAIL_FROM || 'i3hub0@gmail.com'
const APP_NAME = env.APP_NAME || 'Sabify'
const APP_SHORT = env.APP_SHORT || 'Sabify'
const APP_URL = env.APP_URL || 'https://localhost:1209'

// ─── Email Provider ──────────────────────────────────────────────────────────

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP_USER and SMTP_PASS environment variables are not set')
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // TLS uses port 587
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS.replace(/\s/g, ''), // Strip any spaces
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    transporter.verify((error) => {
      if (error) {
        console.error('[email] SMTP connection error:', error)
        console.error('[email] Check your SMTP_USER and SMTP_PASS in .env')
      } else {
        console.log('[email] SMTP server is ready to send emails')
      }
    })
  }

  return transporter
}

// ─── Email Types ─────────────────────────────────────────────────────────────

export interface MailMessage {
  to: string | string[]
  subject: string
  html: string
  text: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: Array<{
    filename: string
    content?: string | Buffer
    path?: string
    contentType?: string
  }>
}

// ─── Send Email ──────────────────────────────────────────────────────────────

export async function sendMail(msg: MailMessage): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    // Only ever send real emails in production. In any other environment
    // (development, test, preview), log what would have been sent instead —
    // regardless of whether SMTP credentials happen to be configured.
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email] 📧 (non-production — not sent) Email would be sent:')
      console.log(`[email] To: ${msg.to}`)
      console.log(`[email] Subject: ${msg.subject}`)
      console.log(`[email] HTML: ${msg.html.substring(0, 200)}...`)
      console.log(`[email] Text: ${msg.text.substring(0, 200)}...`)
      return { success: true, id: 'dev-mock-id' }
    }

    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error('SMTP_USER and SMTP_PASS environment variables are not set')
    }

    const transporter = getTransporter()
    const from = msg.from || EMAIL_FROM

    const mailOptions: SendMailOptions = {
      from,
      to: Array.isArray(msg.to) ? msg.to.join(', ') : msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo,
      cc: msg.cc ? (Array.isArray(msg.cc) ? msg.cc.join(', ') : msg.cc) : undefined,
      bcc: msg.bcc ? (Array.isArray(msg.bcc) ? msg.bcc.join(', ') : msg.bcc) : undefined,
      attachments: msg.attachments,
    }

    const info = await transporter.sendMail(mailOptions)

    console.log(`[email] Message ID: ${info.messageId}`)

    return { success: true, id: info.messageId }
  } catch (error) {
    console.error('[email] Failed to send email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email'
    }
  }
}

// ─── Shared Template Shell ────────────────────────────────────────────────────
// Strictly black / white / grayscale. Table-based layout throughout — NOT
// flexbox — because Gmail, Outlook, and most mobile mail clients strip
// unsupported CSS (including `display: flex`), which is what caused the old
// "Matric NumberMOUAU/PHY/25/000112" run-together bug: the label/value pair
// depended on flex for separation and Gmail simply ignored it. Tables with
// explicit cells and padding cannot collapse that way regardless of which
// styles a client decides to honor.

const WRAPPER_WIDTH = 560

function baseStyles(): string {
  return `
    body, table, td { font-family: Georgia, 'Times New Roman', serif; }
    body { margin: 0; padding: 0; background: #ffffff; color: #000000; }
    .mono { font-family: 'Courier New', Courier, monospace; }
  `.trim()
}

/**
 * Wraps a block of inner HTML in the shared shell: header rule, app name,
 * content area, footer rule. Pure black-on-white, no background colors.
 */
function wrapEmail(innerHtml: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_SHORT}</title>
  <style>${baseStyles()}</style>
</head>
<body>
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="${WRAPPER_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:${WRAPPER_WIDTH}px; max-width:100%; border: 1px solid #000000;">

          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 2px solid #000000;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 20px; font-weight: bold; letter-spacing: 0.5px; color: #000000;">
                    ${APP_SHORT}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #444444; padding-top: 2px;">
                    ${APP_NAME}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px; font-size: 15px; line-height: 1.6; color: #000000;">
              ${innerHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #000000; font-size: 12px; color: #555555;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    ${APP_NAME} (${APP_SHORT})<br>
                    <a href="${APP_URL}" style="color: #000000;">${APP_URL}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 10px; font-size: 11px; color: #888888;">
                    This is an automated message — please do not reply to this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Renders a label/value block list as an HTML table. This is the fix for
 * the run-together bug: each label and value sit in their own <td> with
 * fixed padding, so they can never render adjacent with no gap, regardless
 * of whether the client honors any surrounding CSS.
 */
function detailTable(rows: Array<{ label: string; value: string; mono?: boolean }>): string {
  const rowsHtml = rows
    .map(
      (r, i) => `
        <tr>
          <td style="padding: 10px 0; ${i > 0 ? 'border-top: 1px solid #dddddd;' : ''} font-size: 13px; color: #555555; width: 40%; vertical-align: top;">
            ${r.label}
          </td>
          <td style="padding: 10px 0; ${i > 0 ? 'border-top: 1px solid #dddddd;' : ''} font-size: 14px; font-weight: bold; color: #000000; text-align: right; vertical-align: top; ${r.mono ? "font-family: 'Courier New', Courier, monospace;" : ''}">
            ${r.value}
          </td>
        </tr>
      `
    )
    .join('')

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #000000; padding: 4px 16px; margin: 20px 0;">
      ${rowsHtml}
    </table>
  `.trim()
}

/** Black button with white text, rendered as a bordered table cell (not an <a> with flex/box styling). */
function actionButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
      <tr>
        <td align="center" style="background: #000000;">
          <a href="${href}" style="display: inline-block; padding: 13px 28px; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; letter-spacing: 0.3px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `.trim()
}

function noticeBox(html: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #000000; margin: 20px 0;">
      <tr>
        <td style="padding: 14px 16px; font-size: 13px; color: #000000;">
          ${html}
        </td>
      </tr>
    </table>
  `.trim()
}

// ─── Email Templates ─────────────────────────────────────────────────────────

export function buildResetEmail(
  fullName: string,
  linkToken: string,
  origin: string = APP_URL,
  expiryMinutes: number = 30,
): { html: string; text: string } {
  const revealLink = `${origin}/forgot/reveal?token=${encodeURIComponent(linkToken)}`

  const text = `
Hi ${fullName},

We received a request to reset your password for ${APP_NAME} (${APP_SHORT}).

Click the link below to view your verification code:
${revealLink}

This link will expire in ${expiryMinutes} minutes.

If you didn't request this, please ignore this email or contact support.

---
${APP_NAME} (${APP_SHORT})
${APP_URL}
  `.trim()

  const inner = `
    <h1 style="font-size: 18px; margin: 0 0 16px;">Password Reset Request</h1>
    <p style="margin: 0 0 12px;">Hi ${fullName},</p>
    <p style="margin: 0 0 12px;">We received a request to reset your password for your ${APP_NAME} account.</p>
    <p style="margin: 0 0 4px;">Click the button below to view your verification code. Keep the tab where you started your reset open — you'll need to type the code back in there.</p>
    ${actionButton(revealLink, 'View my verification code')}
    <p style="margin: 0 0 4px;">This link will expire in <strong>${expiryMinutes} minutes</strong>.</p>
    ${noticeBox(`<strong>Security notice</strong><br>If you didn't request this password reset, please ignore this email or contact support immediately. Never share this code with anyone.`)}
  `

  return { html: wrapEmail(inner, 'Reset your password'), text }
}

export function buildVerificationEmail(
  fullName: string,
  token: string,
  origin: string = APP_URL,
): { html: string; text: string } {
  const verifyLink = `${origin}/verify?token=${encodeURIComponent(token)}`
  const expiryMinutes = 24 * 60

  const text = `
Hi ${fullName},

Welcome to ${APP_NAME} (${APP_SHORT})!

Please verify your email address to complete your registration.

Your verification code is: ${token}

This code will expire in ${expiryMinutes} minutes.

Click here to verify: ${verifyLink}

If you didn't create an account, please ignore this email.

---
${APP_NAME} (${APP_SHORT})
${APP_URL}
  `.trim()

  const inner = `
    <h1 style="font-size: 18px; margin: 0 0 16px;">Welcome to ${APP_NAME}</h1>
    <p style="margin: 0 0 12px;">Hi ${fullName},</p>
    <p style="margin: 0 0 4px;">Thank you for creating an account. Please verify your email address to get started.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #000000; margin: 20px 0;">
      <tr>
        <td align="center" style="padding: 18px; font-size: 26px; font-weight: bold; letter-spacing: 5px; font-family: 'Courier New', Courier, monospace;">
          ${token}
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 4px;">This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
    ${actionButton(verifyLink, 'Verify email')}
    <p style="margin: 16px 0 0; font-size: 13px; color: #555555;">If you didn't create an account, please ignore this email.</p>
  `

  return { html: wrapEmail(inner, 'Verify your email address'), text }
}

export function buildNotificationEmail(
  fullName: string,
  subject: string,
  message: string,
  actionLink?: string,
  actionText?: string,
): { html: string; text: string } {
  const text = `
Hi ${fullName},

${subject}

${message}

${actionText && actionLink ? `${actionText}: ${actionLink}` : ''}

---
${APP_NAME} (${APP_SHORT})
${APP_URL}
  `.trim()

  const inner = `
    <h1 style="font-size: 18px; margin: 0 0 16px;">${subject}</h1>
    <p style="margin: 0 0 12px;">Hi ${fullName},</p>
    <p style="margin: 0 0 4px;">${message}</p>
    ${actionText && actionLink ? actionButton(actionLink, actionText) : ''}
  `

  return { html: wrapEmail(inner, subject), text }
}

// ─── Welcome Emails ───────────────────────────────────────────────────────────

export function buildWelcomeStudentEmail(
  fullName: string,
  matricNumber: string,
  origin: string = APP_URL,
): { html: string; text: string } {
  const loginLink = `${origin}/login`

  const text = `
Hi ${fullName},

Welcome to ${APP_NAME} (${APP_SHORT})!

Your student account has been created successfully.

Matric Number: ${matricNumber}

You can now log in to:
- Register your courses for the semester
- Enroll your face for exam verification
- View upcoming tests and examinations
- Track your results once released

Log in here: ${loginLink}

If you didn't create this account, please contact the registrar's office.

---
${APP_NAME} (${APP_SHORT})
${APP_URL}
  `.trim()

  const inner = `
    <h1 style="font-size: 18px; margin: 0 0 16px;">Welcome, ${fullName}</h1>
    <p style="margin: 0 0 12px;">Your student account has been created successfully. You're all set to get started.</p>

    ${detailTable([{ label: 'Matric Number', value: matricNumber, mono: true }])}

    <p style="margin: 20px 0 6px; font-weight: bold;">Here's what you can do next:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding: 4px 0; font-size: 14px;">— Register your courses for the semester</td></tr>
      <tr><td style="padding: 4px 0; font-size: 14px;">— Enroll your face for exam verification</td></tr>
      <tr><td style="padding: 4px 0; font-size: 14px;">— View upcoming tests and examinations</td></tr>
      <tr><td style="padding: 4px 0; font-size: 14px;">— Track your results once released</td></tr>
    </table>

    ${actionButton(loginLink, 'Log in to your account')}
    <p style="margin: 16px 0 0; font-size: 13px; color: #555555;">If you didn't create this account, please contact the registrar's office.</p>
  `

  return { html: wrapEmail(inner, 'Your student account is ready'), text }
}

export function buildWelcomeStaffEmail(
  fullName: string,
  staffNumber: string,
  roleDisplayName: string,
  temporaryPassword?: string,
  origin: string = APP_URL,
): { html: string; text: string } {
  const loginLink = `${origin}/login`

  const text = `
Hi ${fullName},

Welcome to ${APP_NAME} (${APP_SHORT})!

Your staff account has been created successfully.

Staff Number: ${staffNumber}
Role: ${roleDisplayName}
${temporaryPassword ? `Temporary Password: ${temporaryPassword}` : ''}

${temporaryPassword ? 'You will be asked to change this password when you first log in.' : ''}

Log in here: ${loginLink}

If you believe this account was created in error, please contact the system administrator.

---
${APP_NAME} (${APP_SHORT})
${APP_URL}
  `.trim()

  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'Staff Number', value: staffNumber, mono: true },
    { label: 'Role', value: roleDisplayName },
  ]

  const inner = `
    <h1 style="font-size: 18px; margin: 0 0 16px;">Welcome, ${fullName}</h1>
    <p style="margin: 0 0 12px;">Your staff account has been created successfully.</p>

    ${detailTable(rows)}

    ${temporaryPassword ? noticeBox(`<strong>Temporary password:</strong> <span class="mono">${temporaryPassword}</span><br>You will be asked to change this password the first time you log in.`) : ''}

    ${actionButton(loginLink, 'Log in to your account')}
    <p style="margin: 16px 0 0; font-size: 13px; color: #555555;">If you believe this account was created in error, please contact the system administrator.</p>
  `

  return { html: wrapEmail(inner, 'Your staff account is ready'), text }
}

// ─── Login Alert Email ────────────────────────────────────────────────────────

export function buildLoginAlertEmail(
  fullName: string,
  loginTime: Date,
  ipAddress?: string,
  userAgent?: string,
  origin: string = APP_URL,
): { html: string; text: string } {
  const resetLink = `${origin}/forgot`
  const formattedTime = loginTime.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const text = `
Hi ${fullName},

Your ${APP_NAME} (${APP_SHORT}) account was just signed in to.

Time: ${formattedTime}
${ipAddress ? `IP Address: ${ipAddress}` : ''}
${userAgent ? `Device: ${userAgent}` : ''}

If this was you, no action is needed.

If you don't recognize this login, reset your password immediately:
${resetLink}

---
${APP_NAME} (${APP_SHORT})
${APP_URL}
  `.trim()

  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'Time', value: formattedTime },
  ]
  if (ipAddress) rows.push({ label: 'IP Address', value: ipAddress, mono: true })
  if (userAgent) rows.push({ label: 'Device', value: userAgent })

  const inner = `
    <h1 style="font-size: 18px; margin: 0 0 16px;">New Sign-in to Your Account</h1>
    <p style="margin: 0 0 12px;">Hi ${fullName},</p>
    <p style="margin: 0 0 4px;">Your account was just signed in to.</p>

    ${detailTable(rows)}

    <p style="margin: 0 0 4px;">If this was you, no action is needed — you can safely ignore this email.</p>
    ${noticeBox(`<strong>Don't recognize this login?</strong><br>Reset your password immediately to secure your account.`)}
    ${actionButton(resetLink, 'Reset my password')}
  `

  return { html: wrapEmail(inner, 'New sign-in to your account'), text }
}

// ─── Staff Invitation (Pre-onboarding) Email ─────────────────────────────────

export function buildStaffInvitationEmail(
  email: string,
  roleDisplayName: string,
  collegeName: string,
  departmentName: string,
  courseList: string[],
  token: string,
  expiryHours: number,
  origin: string = APP_URL,
): { html: string; text: string } {
  const onboardLink = `${origin}/onboarding#token=${encodeURIComponent(token)}`
  const coursesText = courseList.length > 0 ? courseList.join(', ') : '(none assigned yet)'

  const text = `
Hello,

You've been pre-onboarded as staff at ${APP_NAME} (${APP_SHORT}).

Role: ${roleDisplayName}
College: ${collegeName}
Department: ${departmentName}
Courses: ${coursesText}

To complete your account setup, use the link below. This link contains your
identification token and will expire in ${expiryHours} hours.

${onboardLink}

If you were not expecting this invitation, you can safely ignore this email.

---
${APP_NAME} (${APP_SHORT})
${APP_URL}
  `.trim()

  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'Role', value: roleDisplayName },
    { label: 'College', value: collegeName },
    { label: 'Department', value: departmentName },
    { label: 'Courses', value: coursesText },
  ]

  const inner = `
    <h1 style="font-size: 18px; margin: 0 0 16px;">You've Been Invited to Join ${APP_SHORT}</h1>
    <p style="margin: 0 0 12px;">You've been pre-onboarded as staff. Here are the details on file:</p>

    ${detailTable(rows)}

    <p style="margin: 0 0 4px;">Click below to complete your account setup. This link contains your identification token.</p>
    ${actionButton(onboardLink, 'Complete my onboarding')}
    <p style="margin: 0 0 4px;">This link will expire in <strong>${expiryHours} hours</strong>.</p>
    <p style="margin: 16px 0 0; font-size: 13px; color: #555555;">If you were not expecting this invitation, you can safely ignore this email.</p>
  `

  return { html: wrapEmail(inner, `You're invited to join ${APP_SHORT}`), text }
}

// ─── Developer Team Invitation Email ──────────────────────────────────────

export function buildDeveloperInvitationEmail(
  name: string,
  email: string,
  roleDisplayName: string,
  permissions: string[],
  token: string,
  expiryHours: number,
  origin: string = APP_URL,
): { html: string; text: string } {
  const onboardLink = `${origin}/onboard/developer?token=${encodeURIComponent(token)}`
  const permissionsText = permissions.length > 0 ? permissions.join(', ') : '(none assigned yet)'

  const text = `
Hello ${name},

You've been invited to join the ${APP_NAME} (${APP_SHORT}) Development Team.

Role: ${roleDisplayName}
Permissions: ${permissionsText}

To complete your registration, use the link below. This link contains your
identification token and will expire in ${expiryHours} hours.

${onboardLink}

If you weren't expecting this invitation, you can safely ignore this email.

---
${APP_NAME} (${APP_SHORT})
${APP_URL}
  `.trim()

  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'Role', value: roleDisplayName },
    { label: 'Permissions', value: permissionsText },
  ]

  const inner = `
    <h1 style="font-size: 18px; margin: 0 0 16px;">You've Been Invited to Join the Development Team</h1>
    <p style="margin: 0 0 12px;">Hi ${name},</p>
    <p style="margin: 0 0 4px;">You've been invited to join the ${APP_NAME} development team. Here are the details on file:</p>

    ${detailTable(rows)}

    <p style="margin: 0 0 4px;">Click below to complete your registration. This link contains your identification token and will expire in <strong>${expiryHours} hours</strong>.</p>
    ${actionButton(onboardLink, 'Accept Invitation')}
    <p style="margin: 16px 0 0; font-size: 13px; color: #555555;">If you weren't expecting this invitation, you can safely ignore this email.</p>
  `

  return { html: wrapEmail(inner, `You're invited to join the ${APP_SHORT} Development Team`), text }
}

// ─── Send Emails ─────────────────────────────────────────────────────────────

export async function sendResetEmail(
  email: string,
  fullName: string,
  linkToken: string,
  origin?: string,
  expiryMinutes?: number,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildResetEmail(fullName, linkToken, origin, expiryMinutes)

  return sendMail({
    to: email,
    subject: `Reset Your ${APP_SHORT} Password`,
    html,
    text,
  })
}

export async function sendVerificationEmail(
  email: string,
  fullName: string,
  token: string,
  origin?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildVerificationEmail(fullName, token, origin)

  return sendMail({
    to: email,
    subject: `Verify Your ${APP_SHORT} Account`,
    html,
    text,
  })
}

export async function sendWelcomeStudentEmail(
  email: string,
  fullName: string,
  matricNumber: string,
  origin?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildWelcomeStudentEmail(fullName, matricNumber, origin)

  return sendMail({
    to: email,
    subject: `Welcome to ${APP_SHORT}`,
    html,
    text,
  })
}

export async function sendWelcomeStaffEmail(
  email: string,
  fullName: string,
  staffNumber: string,
  roleDisplayName: string,
  temporaryPassword?: string,
  origin?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildWelcomeStaffEmail(fullName, staffNumber, roleDisplayName, temporaryPassword, origin)

  return sendMail({
    to: email,
    subject: `Welcome to ${APP_SHORT}`,
    html,
    text,
  })
}

export async function sendLoginAlertEmail(
  email: string,
  fullName: string,
  loginTime: Date,
  ipAddress?: string,
  userAgent?: string,
  origin?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildLoginAlertEmail(fullName, loginTime, ipAddress, userAgent, origin)

  return sendMail({
    to: email,
    subject: `New sign-in to your ${APP_SHORT} account`,
    html,
    text,
  })
}

// ─── Staff Invitation Email ─────────────────────────────────────────────────

export async function sendStaffInvitationEmail(
  email: string,
  roleDisplayName: string,
  collegeName: string,
  departmentName: string,
  courseList: string[],
  token: string,
  expiryHours: number,
  origin?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildStaffInvitationEmail(
    email, roleDisplayName, collegeName, departmentName, courseList, token, expiryHours, origin
  )

  return sendMail({
    to: email,
    subject: `You're invited to join ${APP_SHORT}`,
    html,
    text,
  })
}

// ─── Developer Team Invitation Email ──────────────────────────────────────

export async function sendDeveloperInvitationEmail(
  email: string,
  name: string,
  roleDisplayName: string,
  permissions: string[],
  token: string,
  expiryHours: number,
  origin?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { html, text } = buildDeveloperInvitationEmail(
    name, email, roleDisplayName, permissions, token, expiryHours, origin
  )

  return sendMail({
    to: email,
    subject: `Join the ${APP_SHORT} Development Team`,
    html,
    text,
  })
}

// ─── Helper Functions ──────────────────────────────────────────────────────

export function getEmailConfigStatus(): {
  configured: boolean;
  provider: string;
  from: string;
  host: string;
  appName: string;
  appShort: string;
} {
  return {
    configured: !!SMTP_USER && !!SMTP_PASS,
    provider: SMTP_USER ? 'Gmail SMTP' : 'None (Development Mode)',
    from: EMAIL_FROM,
    host: SMTP_HOST,
    appName: APP_NAME,
    appShort: APP_SHORT,
  }
}

export function isEmailConfigured(): boolean {
  return !!SMTP_USER && !!SMTP_PASS
}

export async function testEmailConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!SMTP_USER || !SMTP_PASS) {
      return { success: false, error: 'SMTP credentials not configured' }
    }

    const transporter = getTransporter()
    await transporter.verify()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}