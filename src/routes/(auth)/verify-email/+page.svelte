// File: src/routes/(auth)/verify-email/+page.svelte

<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';

	let code = ['', '', '', '', '', ''];
	let isLoading = false;
	let error = '';
	let canResend = false;
	let resendCountdown = 60;

	const codeInputs: HTMLInputElement[] = [];

	function handleCodeInput(index: number) {
		if (code[index].length > 1) {
			code[index] = code[index].slice(0, 1);
		}

		if (code[index] && index < 5) {
			codeInputs[index + 1]?.focus();
		}
	}

	function handleKeyDown(e: KeyboardEvent, index: number) {
		if (e.key === 'Backspace' && !code[index] && index > 0) {
			codeInputs[index - 1]?.focus();
		}

		if (e.key === 'ArrowLeft' && index > 0) {
			codeInputs[index - 1]?.focus();
		}

		if (e.key === 'ArrowRight' && index < 5) {
			codeInputs[index + 1]?.focus();
		}
	}

	const handleSubmit: SubmitFunction = async ({ action, data }) => {
		const fullCode = code.join('');

		if (fullCode.length !== 6) {
			error = 'Please enter the 6-digit code';
			return;
		}

		isLoading = true;
		error = '';

		return async ({ result }) => {
			isLoading = false;

			if (result.type === 'success') {
				goto('/onboarding');
			} else if (result.type === 'failure') {
				error = result.data?.message || 'Verification failed. Please try again.';
				code = ['', '', '', '', '', ''];
				codeInputs[0]?.focus();
			}
		};
	};

	function handleResend() {
		canResend = false;
		resendCountdown = 60;
		error = '';

		const interval = setInterval(() => {
			resendCountdown--;
			if (resendCountdown <= 0) {
				clearInterval(interval);
				canResend = true;
			}
		}, 1000);
	}
</script>

<div class="verify-form">
	<div class="form-header">
		<div class="success-icon">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="20 6 9 17 4 12" />
			</svg>
		</div>
		<h2>Verify your email</h2>
		<p>We've sent a 6-digit code to your email address. Enter it below to confirm your account.</p>
	</div>

	<form method="POST" action="?/verify" use:enhance={handleSubmit}>
		{#if error}
			<div class="error-message" role="alert">
				<svg class="error-icon" viewBox="0 0 24 24" fill="currentColor">
					<circle cx="12" cy="12" r="10" />
				</svg>
				<span>{error}</span>
			</div>
		{/if}

		<div class="code-input-group">
			{#each code as digit, i}
				<input
					type="text"
					inputmode="numeric"
					maxlength="1"
					class="code-input"
					bind:this={codeInputs[i]}
					bind:value={code[i]}
					on:input={() => handleCodeInput(i)}
					on:keydown={(e) => handleKeyDown(e, i)}
					disabled={isLoading}
					autocomplete="off"
				/>
			{/each}
		</div>

		<button type="submit" class="btn-primary" disabled={isLoading}>
			{#if isLoading}
				<span class="spinner" />
				Verifying...
			{:else}
				Verify email
			{/if}
		</button>
	</form>

	<div class="form-footer">
		<p>Didn't receive the code?</p>
		{#if canResend}
			<button type="button" class="link-accent" onclick={handleResend}>
				Send again
			</button>
		{:else}
			<p class="resend-timer">Send again in {resendCountdown}s</p>
		{/if}
	</div>
</div>

<style>
	.verify-form {
		max-width: 420px;
		width: 100%;
	}

	.form-header {
		text-align: center;
		margin-bottom: 2.5rem;
	}

	.success-icon {
		width: 64px;
		height: 64px;
		margin: 0 auto 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #ecfdf5;
		border-radius: 50%;
		color: #10b981;
	}

	.success-icon svg {
		width: 32px;
		height: 32px;
	}

	.form-header h2 {
		font-size: 1.75rem;
		font-weight: 700;
		color: #1a1a1a;
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.3px;
	}

	.form-header p {
		font-size: 0.95rem;
		color: #666;
		margin: 0;
		line-height: 1.5;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		color: #991b1b;
		font-size: 0.875rem;
	}

	.error-icon {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.code-input-group {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.code-input {
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		border: 2px solid #d4cec3;
		border-radius: 8px;
		font-size: 1.5rem;
		font-weight: 700;
		text-align: center;
		transition: all 150ms ease;
		font-family: 'Courier New', monospace;
		color: #1a1a1a;
	}

	.code-input:focus {
		outline: none;
		border-color: #2c5aa0;
		box-shadow: 0 0 0 3px rgba(44, 90, 160, 0.1);
		background: #f8f7f5;
	}

	.code-input:disabled {
		background: #f5f5f5;
		color: #999;
		cursor: not-allowed;
	}

	.code-input::placeholder {
		color: #d4cec3;
	}

	.btn-primary {
		padding: 0.875rem 1rem;
		background: linear-gradient(135deg, #2c5aa0 0%, #1a3a5c 100%);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 150ms ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-family: inherit;
	}

	.btn-primary:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(44, 90, 160, 0.25);
	}

	.btn-primary:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.form-footer {
		text-align: center;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e0d8;
	}

	.form-footer p {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		color: #666;
	}

	.link-accent {
		background: none;
		border: none;
		color: #2c5aa0;
		text-decoration: none;
		font-weight: 600;
		cursor: pointer;
		transition: color 150ms ease;
		font-size: 0.875rem;
	}

	.link-accent:hover {
		color: #1a3a5c;
		text-decoration: underline;
	}

	.resend-timer {
		font-size: 0.875rem;
		color: #999;
		margin: 0;
	}

	@media (max-width: 640px) {
		.verify-form {
			width: 100%;
		}

		.form-header h2 {
			font-size: 1.5rem;
		}

		.code-input-group {
			gap: 0.5rem;
		}
	}
</style>