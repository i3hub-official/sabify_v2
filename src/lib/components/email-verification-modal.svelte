<!-- src/lib/components/email-verification-modal.svelte -->
<script lang="ts">
  import { toast } from 'svelte-sonner'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '$lib/components/ui/dialog'
  import { AlertCircle, Mail, Lock } from '@lucide/svelte'

  let { open = $bindable(false), feature = 'this feature' } = $props()
  let code = $state('')
  let isLoading = $state(false)
  let step = $state<'prompt' | 'verify'>('prompt')

  async function sendCode() {
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
        step = 'verify'
      } else {
        toast.error('Failed to send code', { description: data.error })
      }
    } catch (error) {
      toast.error('Error', { description: 'Unable to send verification code' })
    } finally {
      isLoading = false
    }
  }

  async function verifyCode() {
    if (!code.trim()) {
      toast.error('Please enter the code')
      return
    }

    isLoading = true
    try {
      const res = await fetch('/api/auth/verify-email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Email verified!', {
          description: 'You can now access all features',
        })
        open = false
        code = ''
        step = 'prompt'
        // Refresh page or update user state
        window.location.reload()
      } else {
        toast.error('Invalid code', { description: data.error })
      }
    } catch (error) {
      toast.error('Error', { description: 'Unable to verify code' })
    } finally {
      isLoading = false
    }
  }
</script>

<Dialog bind:open>
  <DialogContent>
    {#if step === 'prompt'}
      <DialogHeader>
        <DialogTitle>Verify your email</DialogTitle>
        <DialogDescription>
          Email verification is required to access {feature}. We'll send you a code to confirm your email address.
        </DialogDescription>
      </DialogHeader>

      <div class="py-6 space-y-4">
        <div class="flex items-start gap-3">
          <AlertCircle class="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p class="font-medium text-sm">Why verify?</p>
            <p class="text-sm text-muted-foreground">
              Email verification helps us keep your account secure and ensures you can receive important notifications.
            </p>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <Button
          variant="outline"
          onclick={() => (open = false)}
          disabled={isLoading}
          class="flex-1"
        >
          Skip for now
        </Button>
        <Button
          onclick={sendCode}
          disabled={isLoading}
          class="flex-1 gap-2"
        >
          <Mail class="h-4 w-4" />
          {isLoading ? 'Sending...' : 'Send code'}
        </Button>
      </div>
    {:else if step === 'verify'}
      <DialogHeader>
        <DialogTitle>Enter verification code</DialogTitle>
        <DialogDescription>
          We sent a 6-character code to your email. Enter it below to verify your email address.
        </DialogDescription>
      </DialogHeader>

      <div class="py-6">
        <div class="space-y-2">
          <label for="code" class="text-sm font-medium">Verification code</label>
          <div class="relative">
            <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="code"
              type="text"
              placeholder="ABC123"
              bind:value={code}
              disabled={isLoading}
              class="pl-10 text-center text-lg font-mono tracking-widest uppercase"
              maxlength={6}
            />
          </div>
          <p class="text-xs text-muted-foreground">
            Didn't receive a code?
            <button
              onclick={sendCode}
              disabled={isLoading}
              class="text-primary hover:underline font-medium"
            >
              Resend
            </button>
          </p>
        </div>
      </div>

      <div class="flex gap-3">
        <Button
          variant="outline"
          onclick={() => ((step = 'prompt'), (code = ''))}
          disabled={isLoading}
          class="flex-1"
        >
          Back
        </Button>
        <Button
          onclick={verifyCode}
          disabled={isLoading || !code.trim()}
          class="flex-1"
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </Button>
      </div>
    {/if}
  </DialogContent>
</Dialog>