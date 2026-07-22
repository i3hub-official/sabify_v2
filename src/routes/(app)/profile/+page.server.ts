// src/routes/profile/+page.server.ts
import { requireAuth, requireVerified } from '$lib/server/auth/guards.js'

export const actions = {
  updateProfile: async ({ locals, request }) => {
    const user = await requireVerified(locals.user)
    // user is verified + authenticated

    const formData = await request.formData()
    // ... update logic
  },
}