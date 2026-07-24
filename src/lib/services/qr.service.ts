// src/lib/services/qr.service.ts
// QR generation/parsing for PaymentReceipt verification.
//
// Per the schema, a PaymentReceipt carries `receiptNumber` (human-readable),
// `qrCode` (base64 or URL to the generated image), and `verifyHash` (an
// HMAC used to detect tampering). The QR payload encodes exactly the two
// values a verifier needs — receiptNumber + verifyHash — as a URL, so
// scanning it can hit a public verification page/endpoint directly.
//
// generateQRCode needs the `qrcode` package (`pnpm add qrcode
// @types/qrcode`) — it's the standard, actively maintained choice for
// server-side QR generation and isn't already implied by anything else in
// this codebase, so add it if it isn't installed yet.
//
// parseQRCode here means "validate/decode the payload string a client
// scanner already extracted from the image" (e.g. via a browser
// BarcodeDetector or a scanning library on the frontend) — not decoding
// pixels server-side, which needs a separate image-processing dependency
// this file intentionally doesn't pull in.

import { createHmac, timingSafeEqual } from 'crypto'

const QR_VERIFY_SECRET = process.env.QR_VERIFY_SECRET || process.env.PAYMENT_API_KEY
const VERIFY_BASE_URL = process.env.RECEIPT_VERIFY_BASE_URL || 'https://sabify.app/verify'

export interface QRPayload {
  receiptNumber: string
  verifyHash: string
}

export interface GenerateQRResult {
  dataUrl: string // base64 PNG data URI, suitable to store directly in PaymentReceipt.qrCode
  verifyUrl: string
}

function assertSecret(): void {
  if (!QR_VERIFY_SECRET) {
    throw new Error('QR service is not configured (QR_VERIFY_SECRET / PAYMENT_API_KEY missing)')
  }
}

/**
 * Compute the same HMAC that should already live in PaymentReceipt.verifyHash.
 * Callers create the receipt row with this value, then generateQRCode encodes
 * it into the scannable payload.
 */
export function computeVerifyHash(receiptNumber: string, paymentId: number): string {
  assertSecret()
  return createHmac('sha256', QR_VERIFY_SECRET as string).update(`${receiptNumber}:${paymentId}`).digest('hex')
}

/**
 * Generate a QR code image (as a base64 data URI) encoding a verification
 * URL for the given receipt.
 */
export async function generateQRCode(receiptNumber: string, verifyHash: string): Promise<GenerateQRResult> {
  const QRCode = (await import('qrcode')).default
  const verifyUrl = `${VERIFY_BASE_URL}?receipt=${encodeURIComponent(receiptNumber)}&hash=${encodeURIComponent(verifyHash)}`

  const dataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  })

  return { dataUrl, verifyUrl }
}

/**
 * Parse a previously-scanned payload (the URL a QR scanner extracted) back
 * into its receiptNumber/verifyHash parts. Returns null if the payload
 * isn't a recognizable verification URL.
 */
export function parseQRCode(scannedPayload: string): QRPayload | null {
  try {
    const url = new URL(scannedPayload)
    const receiptNumber = url.searchParams.get('receipt')
    const verifyHash = url.searchParams.get('hash')
    if (!receiptNumber || !verifyHash) return null
    return { receiptNumber, verifyHash }
  } catch (error) {
    console.error('[qr.service] parseQRCode failed — not a valid URL payload:', error)
    return null
  }
}

/**
 * Confirm a scanned verifyHash matches what would be computed for the
 * given receipt, using constant-time comparison to avoid timing attacks.
 */
export function verifyQRHash(receiptNumber: string, paymentId: number, scannedHash: string): boolean {
  assertSecret()
  const expected = computeVerifyHash(receiptNumber, paymentId)
  const expectedBuf = Buffer.from(expected, 'hex')
  const scannedBuf = Buffer.from(scannedHash, 'hex')
  if (expectedBuf.length !== scannedBuf.length) return false
  return timingSafeEqual(expectedBuf, scannedBuf)
}