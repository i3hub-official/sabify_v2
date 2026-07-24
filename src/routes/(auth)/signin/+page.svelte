<!-- src/routes/(auth)/signin/+page.svelte -->

<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Mail, Lock, ArrowRight, Eye, EyeOff, BookOpen, CreditCard, Shield, Sparkles, Home } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { toast } from 'svelte-sonner';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let isLoading = $state(false);
	let errors = $state<Record<string, string>>({});

	// Form validation
	function validateForm() {
		const newErrors: Record<string, string> = {};

		if (!email.trim()) {
			newErrors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			newErrors.email = 'Please enter a valid email';
		}

		if (!password) {
			newErrors.password = 'Password is required';
		} else if (password.length < 6) {
			newErrors.password = 'Password must be at least 6 characters';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	async function handleSignin() {
		if (!validateForm()) return;

		isLoading = true;

		try {
			const response = await fetch('/api/auth/signin', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email: email.trim().toLowerCase(),
					password
				})
			});

			const data = await response.json();

			if (!response.ok) {
				if (data.error === 'invalid_credentials') {
					errors.form = 'Invalid email or password';
					toast.error('Signin failed', {
						description: 'Please check your credentials and try again'
					});
				} else if (data.error === 'email_not_verified') {
					toast.error('Email not verified', {
						description: 'Please verify your email before signing in'
					});
					await goto('/verify-email');
				} else {
					errors.form = data.message || 'Signin failed. Please try again.';
					toast.error('Error', {
						description: data.message || 'Something went wrong'
					});
				}
				return;
			}

			// Success
			toast.success('Welcome back!', {
				description: 'Logging you in...'
			});

			// Redirect based on role
			if (data.user?.role === 'ADMIN') {
				await goto('/admin/dashboard');
			} else if (data.user?.role === 'OWNER') {
				await goto('/owner/dashboard');
			} else if (data.user?.role === 'LECTURER') {
				await goto('/dashboard');
			} else {
				await goto('/dashboard');
			}
		} catch (error) {
			console.error('Signin error:', error);
			errors.form = 'Network error. Please check your connection and try again.';
			toast.error('Connection error', {
				description: 'Unable to reach the server'
			});
		} finally {
			isLoading = false;
		}
	}

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}
</script>

<svelte:head>
	<title>Signin — Sabify</title>
	<meta name="description" content="Signin to your Sabify account" />
</svelte:head>

<!-- Header Navigation -->
<header class="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/40">
	<div class="px-6 md:px-12 h-16 flex items-center justify-between">
		<!-- Logo -->
		<div class="inline-flex items-center gap-3">
			<!-- <div class="w-9 h-9 rounded-lg bg-primary flex items-center justify-center font-bold text-sm text-primary-foreground">
				S
			</div> -->
			<span class="font-semibold text-foreground">Sabify</span>
		</div>

		<!-- Home Button -->
		<Button
			variant="ghost"
			size="sm"
			onclick={() => goto('/')}
			class="gap-2"
		>
			<Home size={16} />
			<span class="hidden sm:inline">Home</span>
		</Button>
	</div>
</header>

<div class="min-h-screen flex flex-col lg:flex-row pt-16">
	<!-- Left side - Hero -->
	<div class="hidden lg:flex lg:w-1/2 bg-foreground text-primary-foreground flex-col justify-between p-12 relative overflow-hidden">
		<!-- Decorative elements -->
		<div class="absolute top-20 right-1/4 w-72 h-72 bg-primary-foreground/5 rounded-full blur-3xl pointer-events-none" />
		<div class="absolute -bottom-20 left-1/3 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl pointer-events-none" />
		
		<div>
			<div class="inline-flex items-center gap-3 mb-12 relative z-10">
				<div class="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center font-bold text-lg backdrop-blur-sm">
					S
				</div>
				<span class="text-2xl font-bold">Sabify</span>
			</div>
		</div>

		<div class="space-y-8 relative z-10">
			<div>
				<h1 class="text-5xl font-bold mb-4 leading-tight">
					Everything Campus.<br />
					<span class="opacity-90">One App.</span>
				</h1>
				<p class="text-lg opacity-90 max-w-sm">
					Your academic companion for university life in West Africa.
				</p>
			</div>

			<div class="space-y-5">
				<div class="flex gap-4 items-start">
					<div class="mt-0.5"><BookOpen size={22} /></div>
					<div>
						<p class="font-semibold">Past Questions & Materials</p>
						<p class="text-sm opacity-75">Access years of exam papers and study materials</p>
					</div>
				</div>
				<div class="flex gap-4 items-start">
					<div class="mt-0.5"><CreditCard size={22} /></div>
					<div>
						<p class="font-semibold">Digital Receipts</p>
						<p class="text-sm opacity-75">Tamper-proof payment receipts for all dues</p>
					</div>
				</div>
				<div class="flex gap-4 items-start">
					<div class="mt-0.5"><Shield size={22} /></div>
					<div>
						<p class="font-semibold">Campus Safety</p>
						<p class="text-sm opacity-75">Safe-walk and emergency alerts built in</p>
					</div>
				</div>
			</div>
		</div>

		<p class="text-sm opacity-75 relative z-10">Everything Campus. One App. <span class="opacity-50">—</span> 2025</p>
	</div>

	<!-- Right side - Signin Form -->
	<div class="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 bg-background">
		<div class="w-full max-w-md">
			<!-- Mobile Logo (Hidden on desktop) -->
			<div class="lg:hidden mb-8 text-center">
				<div class="inline-flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-lg text-primary-foreground">
						S
					</div>
					<span class="text-2xl font-bold">Sabify</span>
				</div>
				<p class="text-sm text-muted-foreground mt-2">Everything Campus. One App.</p>
			</div>

			<!-- Card -->
			<Card class="border shadow-sm">
				<CardHeader class="space-y-2 pb-6">
					<CardTitle class="text-2xl font-bold">Welcome back</CardTitle>
					<CardDescription>
						Sign in to continue accessing your academic resources
					</CardDescription>
				</CardHeader>

				<CardContent class="space-y-6">
					<!-- Form Errors -->
					{#if errors.form}
						<Alert variant="destructive" class="border-destructive/20 bg-destructive/10">
							<AlertDescription>{errors.form}</AlertDescription>
						</Alert>
					{/if}

					<!-- Email Field -->
					<div class="space-y-2">
						<label for="email" class="text-sm font-medium mb-2 block">
							Email address
						</label>
						<div class="relative">
							<Mail class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
							<Input
								id="email"
								type="email"
								placeholder="you@university.edu"
								bind:value={email}
								disabled={isLoading}
								class="pl-10 h-11"
							/>
						</div>
						{#if errors.email}
							<p class="text-xs text-destructive mt-1">{errors.email}</p>
						{/if}
					</div>

					<!-- Password Field -->
					<div class="space-y-2">
						<div class="flex items-center justify-between mb-2 block">
							<label for="password" class="text-sm font-medium">Password</label>
							<a href="/forgot-password" class="text-xs text-primary hover:underline font-medium">
								Forgot password?
							</a>
						</div>
						<div class="relative">
							<Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
							<Input
								id="password"
								type={showPassword ? 'text' : 'password'}
								placeholder="Enter your password"
								bind:value={password}
								disabled={isLoading}
								class="pl-10 pr-10 h-11"
							/>
							<button
								type="button"
								onclick={togglePasswordVisibility}
								disabled={isLoading}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
								tabindex="-1"
							>
								{#if showPassword}
									<EyeOff size={18} />
								{:else}
									<Eye size={18} />
								{/if}
							</button>
						</div>
						{#if errors.password}
							<p class="text-xs text-destructive mt-1">{errors.password}</p>
						{/if}
					</div>

					<!-- Submit Button -->
					<Button
						onclick={handleSignin}
						disabled={isLoading}
						class="w-full gap-2 h-11 font-medium"
						size="lg"
					>
						{#if isLoading}
							<span class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
							Signing in...
						{:else}
							<span>Sign in</span>
							<ArrowRight size={18} />
						{/if}
					</Button>

					<!-- Divider -->
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<span class="w-full border-t" />
						</div>
						<div class="relative flex justify-center text-xs uppercase">
							<span class="bg-background px-2 text-muted-foreground">
								New here?
							</span>
						</div>
					</div>

					<!-- Signup Link -->
					<Button
						variant="outline"
						class="w-full h-11 font-medium"
						onclick={() => goto('/signup')}
					>
						Create an account
					</Button>
				</CardContent>
			</Card>

			<!-- Terms -->
			<p class="text-center text-xs text-muted-foreground mt-6">
				By signing in, you agree to our
				<a href="/terms" class="hover:underline text-primary">Terms of Service</a>
				and
				<a href="/privacy" class="hover:underline text-primary">Privacy Policy</a>
			</p>
		</div>
	</div>
</div>