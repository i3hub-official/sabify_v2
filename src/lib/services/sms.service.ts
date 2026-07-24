// src/lib/services/sms.service.ts
// SMS delivery for safety alerts and OTP verification.
//
// Provider assumption: Termii is the common SMS gateway for Nigerian
// numbers (used widely by MOUAU-adjacent products). Swap the fetch calls
// below if you're actually on Africa's Talking / Twilio — the public
// function signatures (sendSMS, verifySMSToken) shouldn't need to change.

const SMS_PROVIDER = process.env.SMS_PROVIDER // e.g. "termii"
const SMS_API_KEY = process.env.SMS_API_KEY
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'Sabify'
const TERMII_BASE_URL = 'https://api.ng.termii.com/api'

export interface SendSMSResult {
  success: boolean
  messageId?: string
  error?: string
}

function assertConfigured(): void {
  if (!SMS_PROVIDER || !SMS_API_KEY) {
    throw new Error('SMS service is not configured (SMS_PROVIDER / SMS_API_KEY missing)')
  }
}

/**
 * Send a plain SMS message to a Nigerian phone number.
 * `to` should be E.164 or local format accepted by the provider (e.g. 2348012345678).
 */
export async function sendSMS(to: string, message: string): Promise<SendSMSResult> {
  assertConfigured()

  try {
    if (SMS_PROVIDER === 'termii') {
      const res = await fetch(`${TERMII_BASE_URL}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          from: SMS_SENDER_ID,
          sms: message,
          type: 'plain',
          channel: 'generic',
          api_key: SMS_API_KEY,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { success: false, error: data?.message || `Provider returned ${res.status}` }
      }

      return { success: true, messageId: data?.message_id }
    }

    return { success: false, error: `Unsupported SMS_PROVIDER: ${SMS_PROVIDER}` }
  } catch (error) {
    console.error('[sms.service] sendSMS failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send a one-time OTP code via the provider's dedicated OTP endpoint
 * (kept separate from sendSMS because most providers meter/verify these
 * differently and return a pin_id needed for verification).
 */
export async function sendOTP(to: string): Promise<{ success: boolean; pinId?: string; error?: string }> {
  assertConfigured()

  try {
    if (SMS_PROVIDER === 'termii') {
      const res = await fetch(`${TERMII_BASE_URL}/sms/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: SMS_API_KEY,
          message_type: 'NUMERIC',
          to,
          from: SMS_SENDER_ID,
          channel: 'generic',
          pin_attempts: 3,
          pin_time_to_live: 10,
          pin_length: 6,
          pin_placeholder: '< 123456 >',
          message_text: 'Your Sabify verification code is < 123456 >',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { success: false, error: data?.message || `Provider returned ${res.status}` }
      }

      return { success: true, pinId: data?.pinId }
    }

    return { success: false, error: `Unsupported SMS_PROVIDER: ${SMS_PROVIDER}` }
  } catch (error) {
    console.error('[sms.service] sendOTP failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Verify a code the user entered against the pinId returned by sendOTP.
 */
export async function verifySMSToken(pinId: string, code: string): Promise<boolean> {
  assertConfigured()

  try {
    if (SMS_PROVIDER === 'termii') {
      const res = await fetch(`${TERMII_BASE_URL}/sms/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: SMS_API_KEY, pin_id: pinId, pin: code }),
      })

      const data = await res.json()
      return res.ok && data?.verified === 'True'
    }

    return false
  } catch (error) {
    console.error('[sms.service] verifySMSToken failed:', error)
    return false
  }
}