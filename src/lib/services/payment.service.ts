// src/lib/services/payment.service.ts
// Payment initialization/verification for DepartmentalDue payments.
//
// Gateway values are constrained by the schema itself: `Payment.gateway`
// is documented as "paystack" | "flutterwave". PAYMENT_PROVIDER selects
// between them; PAYMENT_API_KEY is that gateway's secret key.
//
// Amounts are always kobo (integers), never floats — per the schema
// comment on DepartmentalDue.amount. Every function here takes/returns
// kobo, not naira, so callers must not divide/multiply by 100 twice.

const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER as 'paystack' | 'flutterwave' | undefined
const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY

const PAYSTACK_BASE_URL = 'https://api.paystack.co'
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3'

export interface PaymentServiceHandle {
  gateway: 'paystack' | 'flutterwave'
}

export interface InitializePaymentResult {
  success: boolean
  authorizationUrl?: string
  reference: string
  error?: string
}

export interface VerifyPaymentResult {
  success: boolean
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  amount?: number // kobo
  paidAt?: Date
  error?: string
}

/**
 * Returns a lightweight handle confirming the gateway is configured, or
 * null if not — this is the shape guards.ts's ensurePaymentService()
 * expects (`service !== null`).
 */
export async function getPaymentService(): Promise<PaymentServiceHandle | null> {
  if (!PAYMENT_PROVIDER || !PAYMENT_API_KEY) return null
  if (PAYMENT_PROVIDER !== 'paystack' && PAYMENT_PROVIDER !== 'flutterwave') return null
  return { gateway: PAYMENT_PROVIDER }
}

export async function initializePayment(params: {
  amount: number // kobo
  email: string
  reference: string
  metadata?: Record<string, unknown>
}): Promise<InitializePaymentResult> {
  const service = await getPaymentService()
  if (!service) {
    return { success: false, reference: params.reference, error: 'Payment service is not configured' }
  }

  try {
    if (service.gateway === 'paystack') {
      const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYMENT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount, // Paystack also expects kobo
          email: params.email,
          reference: params.reference,
          metadata: params.metadata,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.status) {
        return { success: false, reference: params.reference, error: data?.message || `Paystack returned ${res.status}` }
      }
      return { success: true, authorizationUrl: data.data.authorization_url, reference: params.reference }
    }

    // flutterwave
    const res = await fetch(`${FLUTTERWAVE_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYMENT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: params.reference,
        amount: (params.amount / 100).toString(), // Flutterwave expects naira, not kobo
        currency: 'NGN',
        customer: { email: params.email },
        meta: params.metadata,
      }),
    })
    const data = await res.json()
    if (!res.ok || data.status !== 'success') {
      return { success: false, reference: params.reference, error: data?.message || `Flutterwave returned ${res.status}` }
    }
    return { success: true, authorizationUrl: data.data.link, reference: params.reference }
  } catch (error) {
    console.error('[payment.service] initializePayment failed:', error)
    return {
      success: false,
      reference: params.reference,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function verifyPayment(reference: string): Promise<VerifyPaymentResult> {
  const service = await getPaymentService()
  if (!service) {
    return { success: false, status: 'FAILED', error: 'Payment service is not configured' }
  }

  try {
    if (service.gateway === 'paystack') {
      const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${PAYMENT_API_KEY}` },
      })
      const data = await res.json()
      if (!res.ok || !data.status) {
        return { success: false, status: 'FAILED', error: data?.message || `Paystack returned ${res.status}` }
      }
      const paid = data.data.status === 'success'
      return {
        success: paid,
        status: paid ? 'SUCCESS' : 'FAILED',
        amount: data.data.amount,
        paidAt: data.data.paid_at ? new Date(data.data.paid_at) : undefined,
      }
    }

    // flutterwave — verify by tx_ref
    const res = await fetch(`${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${reference}`, {
      headers: { Authorization: `Bearer ${PAYMENT_API_KEY}` },
    })
    const data = await res.json()
    if (!res.ok || data.status !== 'success') {
      return { success: false, status: 'FAILED', error: data?.message || `Flutterwave returned ${res.status}` }
    }
    const paid = data.data.status === 'successful'
    return {
      success: paid,
      status: paid ? 'SUCCESS' : 'FAILED',
      amount: Math.round(data.data.amount * 100), // normalize naira -> kobo
      paidAt: data.data.created_at ? new Date(data.data.created_at) : undefined,
    }
  } catch (error) {
    console.error('[payment.service] verifyPayment failed:', error)
    return { success: false, status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}