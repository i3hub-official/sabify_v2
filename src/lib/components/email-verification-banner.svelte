<!-- src/lib/components/email-verification-banner.svelte -->
<script lang="ts">
  import { toast } from 'svelte-sonner'
  import { Button } from '$lib/components/ui/button'
  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { X, AlertCircle } from '@lucide/svelte'

  let { user } = $props()
  let dismissed = $state(false)
  let isLoading = $state(false)

  async function sendVerificationCode() {
    isLoading = true
    try {
      const res = await fetch('/api/auth/verify-email/request', {
        method: 'POST',
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Code sent!', {
          description: 'Check your email for the verification code',
        })
      } else {
        toast.error('Failed to send code', {
          description: data.error || 'Please try again',
        })
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Unable to send verification code',
      })
    } finally {
      isLoading = false
    }
  }
</script>

<Alert class="mx-4 mt-4 border-amber-200 bg-amber-50 text-amber-900">
  <AlertCircle class="h-4 w-4 text-amber-600" />
  <AlertDescription class="ml-2 flex items-center justify-between">
    <span>
      Verify your email to unlock all features.
      <button
        onclick={sendVerificationCode}
        disabled={isLoading}
        class="ml-2 font-semibold text-amber-700 hover:text-amber-900 underline"
      >
        {isLoading ? 'Sending...' : 'Send code'}
      </button>
    </span>
    <button
      onclick={() => (dismissed = true)}
      disabled={isLoading}
      class="ml-4 text-amber-700 hover:text-amber-900"
      title="Dismiss"
    >
      <X class="h-4 w-4" />
    </button>
  </AlertDescription>
</Alert>