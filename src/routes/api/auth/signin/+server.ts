// src/routes/api/auth/signin/+server.ts
import { createUserSession, findUserByEmail, verifyPassword } from '$lib/server/auth/index'

export async function POST({ request, cookies }) {
  const { email, password } = await request.json()
  
  const user = await findUserByEmail(email)
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    return json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const { token, refreshToken } = await createUserSession(user.id, {
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  })

  cookies.set(USER_COOKIE, token, cookieOptions)

  return json({ user, token, refreshToken })
}