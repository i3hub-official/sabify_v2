// src/lib/server/auth/invitationToken.ts
// Invitation tokens follow the same pattern as PasswordResetToken/
// VerificationToken: a high-entropy random token is emailed to the invitee,
// only its SHA-256 hash is stored in the database. The token's own entropy
// (32 random bytes) is what provides security — a plain hash (no separate
// server secret) is sufficient here, same tradeoff as most invite-link
// implementations.

import { createHash } from 'crypto'
import { generateToken } from './index'

export function createInvitationToken(): { token: string; tokenHash: string } {
	const token = generateToken()
	const tokenHash = hashInvitationToken(token)
	return { token, tokenHash }
}

export function hashInvitationToken(token: string): string {
	return createHash('sha256').update(token).digest('hex')
}