// src/lib/server/receipt.ts (NEW)
// ─────────────────────────────────────────────────────────────────────────────
// Receipt generation and QR code utilities.
// ─────────────────────────────────────────────────────────────────────────────

import QRCode from 'qrcode';
import crypto from 'crypto';

interface ReceiptData {
  receiptNumber: string;
  amount: number; // in kobo
  paidAt?: string; // ISO string
  dueTitle: string;
  userName: string;
}

/**
 * Generate a human-readable receipt number.
 * Format: RCP-YYYY-MM-DD-XXXXX (e.g., RCP-2025-07-20-00001)
 */
export function generateReceiptNumber(paymentId: number): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const paddedId = String(paymentId).padStart(5, '0');
  return `RCP-${date}-${paddedId}`;
}

/**
 * Generate a QR code that encodes receipt data.
 * Returns base64-encoded PNG image.
 */
export async function generateQRCode(data: ReceiptData): Promise<string> {
  try {
    // Create a verifiable string with receipt data
    const receiptString = JSON.stringify({
      receiptNumber: data.receiptNumber,
      amount: data.amount,
      dueTitle: data.dueTitle,
      userName: data.userName,
      paidAt: data.paidAt || new Date().toISOString(),
    });

    // Generate QR code as data URL
    const qrCodeUrl = await QRCode.toDataURL(receiptString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
    });

    return qrCodeUrl; // Base64 data URL
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}

/**
 * Generate HMAC hash for receipt verification.
 * Used to detect tampering.
 */
export function generateReceiptHash(
  paymentId: number,
  secret: string = process.env.RECEIPT_SECRET || 'default-secret'
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(paymentId.toString())
    .digest('hex');
}

/**
 * Verify receipt hash for tampering.
 */
export function verifyReceiptHash(
  paymentId: number,
  storedHash: string,
  secret: string = process.env.RECEIPT_SECRET || 'default-secret'
): boolean {
  const expectedHash = generateReceiptHash(paymentId, secret);
  return expectedHash === storedHash;
}

/**
 * Format amount (in kobo) as naira string.
 * Example: 150000 → "₦1,500.00"
 */
export function formatCurrency(amountInKobo: number): string {
  const naira = amountInKobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(naira);
}