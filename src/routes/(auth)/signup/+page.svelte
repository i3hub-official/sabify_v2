<!-- src/routes/(auth)/signup/+page.svelte -->

<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { tick } from 'svelte';
	import jsQR from 'jsqr';
	import { getUniConfig } from '$lib/universities/registry';
	import { extractRefFromUrl } from '$lib/universities/receipt';
	import {
		Mail, Lock, User, ArrowRight, Eye, EyeOff,
		AlertCircle, Check, Sparkles, Briefcase, School,
		Phone, BookOpen, Zap, QrCode, Camera, Upload,
		RefreshCw, ShieldCheck, X, ChevronLeft,
		Building2, UserPlus, Home
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	let { data }: { data: { universities: { id: string; name: string; slug: string; logoUrl: string | null; isActive: boolean }[] } } = $props();

	// ─── Form state ───────────────────────────────────────────────────
	let currentStep    = $state(1);
	let isLoading      = $state(false);
	let errorMessage   = $state('');
	let successMessage = $state('');

	// ─── University selection state ───────────────────────────────────
	let selectedUniversity = $state<typeof data.universities[0] | null>(null);
	let searchQuery        = $state('');
	let showDropdown       = $state(false);
	let logoError          = $state(false);
	let searchLoading      = $state(false);
	let searchDebounce: ReturnType<typeof setTimeout> | null = null;
	let allUniversities = $derived([...(data.universities ?? [])].sort((a, b) => a.name.localeCompare(b.name)));

	function searchUniversities(q: string) {
		const lower = q.toLowerCase();
		return allUniversities.filter(u =>
			u.name.toLowerCase().includes(lower) ||
			u.slug.toLowerCase().includes(lower)
		);
	}

	function onSearchInput() {
		showDropdown  = true;
		searchLoading = true;
		if (searchDebounce) clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => { searchLoading = false; }, 300);
	}

	const uniConfig = $derived(
		selectedUniversity ? getUniConfig(selectedUniversity.slug.toUpperCase()) : null
	);
	const receiptConfig = $derived(uniConfig?.receipt ?? null);

	$effect(() => { if (selectedUniversity) logoError = false; });

	const filteredUniversities = $derived(
		searchQuery.trim()
			? searchUniversities(searchQuery).slice(0, 10)
			: allUniversities.slice(0, 10)
	);

	// ─── Generic receipt state ────────────────────────────────────────
	let uniMatric       = $state('');
	let refNumber       = $state('');
	let refMasked       = $state(false);
	let receiptRaw      = $state<Record<string, string> | null>(null);
	let receiptData     = $state<Record<string, string> | null>(null);
	let receiptFetched  = $state(false);
	let receiptLoading  = $state(false);
	let settingFromScan = $state(false);

	// ─── Webcam ───────────────────────────────────────────────────────
	let showWebcam   = $state(false);
	let videoEl      = $state<HTMLVideoElement | null>(null);
	let camStream    = $state<MediaStream | null>(null);
	let scanInterval = $state<ReturnType<typeof setInterval> | null>(null);
	let camError     = $state('');
	let scanCanvas: HTMLCanvasElement;

	// ─── Form fields ──────────────────────────────────────────────────
	let surname             = $state('');
	let firstName           = $state('');
	let otherName           = $state('');
	let matricNumber        = $state('');
	let jambregNo           = $state('');
	let faculty             = $state('');
	let department          = $state('');
	let phone               = $state('');
	let email               = $state('');
	let password            = $state('');
	let confirmPassword     = $state('');
	let showPassword        = $state(false);
	let showConfirmPassword = $state(false);

	// ─── Helpers ──────────────────────────────────────────────────────
	function getLogoPath(uni: typeof data.universities[0] | null): string | null {
		if (!uni) return null;
		const slug = uni.name
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 60);
		return `/uni-icons/${slug}.png`;
	}

	function selectUniversity(uni: typeof data.universities[0]) {
		selectedUniversity = uni;
		searchQuery  = `${uni.name} (${uni.slug.toUpperCase()})`;
		showDropdown = false;
		errorMessage = '';
		clearReceiptState();
	}

	function clearUniversity() {
		selectedUniversity = null;
		searchQuery  = '';
		showDropdown = false;
		clearReceiptState();
	}

	function clearReceiptState() {
		uniMatric = '';
		refNumber = '';
		refMasked = false;
		receiptRaw = null;
		receiptData = null;
		receiptFetched = false;
		clearPrefilled();
	}

	function clearPrefilled() {
		surname = firstName = otherName = jambregNo = matricNumber = faculty = department = '';
	}

	function onMatricInput() {
		if (receiptFetched) {
			receiptRaw = null;
			receiptData = null;
			receiptFetched = false;
			refNumber = '';
			refMasked = false;
			clearPrefilled();
		}
	}

	function onRefInput() {
		if (settingFromScan) return;
		refMasked = false;
		if (receiptFetched) {
			receiptRaw = null;
			receiptData = null;
			receiptFetched = false;
			clearPrefilled();
		}
	}

	function extractRef(raw: string): string {
		const param = receiptConfig?.refExtractParam ?? 'ref';
		return extractRefFromUrl(raw, param);
	}

	async function fetchReceipt(fromScan = false) {
		if (!receiptConfig) return;
		if (!uniMatric.trim()) {
			errorMessage = `Please enter your ${receiptConfig.matricLabel ?? 'matric number'} first.`;
			return;
		}
		const ref = extractRef(refNumber.trim());
		if (!ref) {
			errorMessage = `Please enter or scan the ${receiptConfig.refLabel}.`;
			return;
		}

		receiptLoading = true;
		receiptRaw = null;
		receiptData = null;
		errorMessage = '';
		if (fromScan) refMasked = true;

		try {
			const form = new FormData();
			form.set(receiptConfig.refFieldName ?? 'ref', ref);

			const res    = await fetch(`?/${receiptConfig.actionName}`, { method: 'POST', body: form });
			const result = deserialize(await res.text());

			if (result.type === 'error') {
				errorMessage = result.error?.message ?? 'Something went wrong.';
				refMasked = false;
				return;
			}
			if (result.type !== 'success' || !result.data?.success) {
				errorMessage = (result.data?.error as string) ?? 'Could not fetch receipt. Check the ref number and try again.';
				refMasked = false;
				return;
			}

			const d = result.data.data as Record<string, string> & { preview: Record<string, string> };

			if (
				d.matricNo &&
				!d.matricNo.replace(/\//g, '').includes(uniMatric.replace(/\//g, '').trim())
			) {
				errorMessage = 'Matric number does not match this receipt. Please check and try again.';
				refMasked = false;
				return;
			}

			for (const field of receiptConfig.fields) {
				const value = (d[field.key] ?? '').trim();
				if (!value) continue;
				switch (field.key) {
					case 'name': {
						const parts = value.split(/\s+/);
						firstName = parts[0] ?? '';
						otherName = parts[1] ?? '';
						surname   = parts.slice(2).join(' ');
						break;
					}
					case 'matricNo':   matricNumber = value; break;
					case 'jambregNo':  jambregNo    = value; break;
					case 'college':
					case 'faculty':    faculty      = value; break;
					case 'department': department   = value; break;
				}
			}

			receiptRaw     = d;
			receiptData    = d.preview;
			receiptFetched = true;
			if (fromScan) currentStep = 2;
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Network error';
			refMasked = false;
		} finally {
			receiptLoading = false;
		}
	}

	async function handleQrUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!uniMatric.trim()) {
			errorMessage = 'Please enter your matric number before scanning.';
			return;
		}
		errorMessage = '';
		(e.target as HTMLInputElement).value = '';

		try {
			const bitmap  = await createImageBitmap(file);
			const canvas  = document.createElement('canvas');
			canvas.width  = bitmap.width;
			canvas.height = bitmap.height;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(bitmap, 0, 0);
			const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const code    = jsQR(imgData.data, imgData.width, imgData.height);

			if (code?.data) {
				settingFromScan = true;
				refNumber = extractRef(code.data);
				await tick();
				settingFromScan = false;
				await fetchReceipt(true);
			} else {
				errorMessage = 'Could not read QR code. Please enter the ref number manually.';
			}
		} catch {
			errorMessage = 'Failed to process image. Try again or enter the ref manually.';
		}
	}

	async function startWebcam() {
		if (!uniMatric.trim()) {
			errorMessage = 'Please enter your matric number before scanning.';
			return;
		}
		camError = '';
		errorMessage = '';
		try {
			camStream  = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
			showWebcam = true;
			await new Promise(r => setTimeout(r, 100));
			if (videoEl) {
				videoEl.srcObject = camStream;
				await videoEl.play();
				startScanLoop();
			}
		} catch {
			camError = 'Camera access denied. Please allow camera access or upload an image instead.';
		}
	}

	function startScanLoop() {
		scanCanvas = document.createElement('canvas');
		scanInterval = setInterval(async () => {
			if (!videoEl || videoEl.readyState !== 4) return;
			scanCanvas.width  = videoEl.videoWidth;
			scanCanvas.height = videoEl.videoHeight;
			const ctx     = scanCanvas.getContext('2d')!;
			ctx.drawImage(videoEl, 0, 0);
			const imgData = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
			const code    = jsQR(imgData.data, imgData.width, imgData.height);
			if (code?.data) {
				stopWebcam();
				settingFromScan = true;
				refNumber = extractRef(code.data);
				await tick();
				settingFromScan = false;
				fetchReceipt(true);
			}
		}, 300);
	}

	function stopWebcam() {
		if (scanInterval) clearInterval(scanInterval);
		if (camStream)    camStream.getTracks().forEach(t => t.stop());
		camStream  = null;
		showWebcam = false;
	}

	onDestroy(() => stopWebcam());

	// ─── Step navigation ──────────────────────────────────────────────
	function nextStep() {
		errorMessage = '';
		if (currentStep === 1) {
			if (!selectedUniversity) { errorMessage = 'Please select your university.'; return; }
			currentStep = 2;
		} else if (currentStep === 2) {
			if (!surname.trim() || !firstName.trim() || !matricNumber.trim() || !faculty.trim() || !department.trim() || !email.trim()) {
				errorMessage = 'Please fill in all required fields.';
				return;
			}
			currentStep = 3;
		}
	}

	function prevStep() {
		errorMessage = '';
		currentStep -= 1;
	}

	// ─── Submit ───────────────────────────────────────────────────────
	async function handleSubmit() {
		errorMessage   = '';
		successMessage = '';

		if (!password || password.length < 6) {
			errorMessage = 'Password must be at least 6 characters.';
			return;
		}
		if (password !== confirmPassword) {
			errorMessage = "Passwords don't match.";
			return;
		}

		isLoading = true;
		try {
			const fd = new FormData();
			fd.set('universityAcronym', selectedUniversity?.slug ?? '');
			fd.set('universityId',      selectedUniversity?.id   ?? '');
			fd.set('matricNumber',      matricNumber  ?? '');
			fd.set('jambRegNo',         jambregNo     ?? '');
			fd.set('faculty',           faculty       ?? '');
			fd.set('department',        department    ?? '');
			fd.set('level',             receiptRaw?.level     ?? '');
			fd.set('session',           receiptRaw?.session   ?? '');
			fd.set('receiptNo',         receiptRaw?.receiptNo ?? '');
			fd.set('receiptRef',        refNumber     ?? '');
			fd.set('firstName',         firstName     ?? '');
			fd.set('otherName',         otherName     ?? '');
			fd.set('surname',           surname       ?? '');
			fd.set('phone',             phone         ?? '');
			fd.set('email',             email         ?? '');
			fd.set('password',          password);

			const res    = await fetch('?/signup', { method: 'POST', body: fd });
			const result = deserialize(await res.text());

			if (result.type === 'error') {
				errorMessage = result.error?.message ?? 'Something went wrong.';
				return;
			}
			if (result.type !== 'success' || !result.data?.success) {
				errorMessage = (result.data?.error as string) ?? 'Unable to create account.';
				return;
			}

			await goto('/dashboard');
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Network error';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign up — Sabify</title>
	<meta name="description" content="Create your Sabify account and join thousands of students" />
</svelte:head>

<svelte:window
	onclick={(e) => {
		if (!(e.target as HTMLElement).closest('.university-search')) showDropdown = false;
	}}
/>

<!-- Header Navigation -->
<header class="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/40">
	<div class="px-6 md:px-12 h-16 flex items-center justify-between">
		<!-- Logo -->
		<div class="inline-flex items-center gap-3">
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
		<div class="absolute top-20 right-20 w-64 h-64 rounded-full bg-primary-foreground/5 blur-3xl"></div>
		<div class="absolute bottom-20 left-20 w-48 h-48 rounded-full bg-primary-foreground/5 blur-2xl"></div>

		<div>
			<div class="inline-flex items-center gap-3 mb-12 relative z-10">
				<div class="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center font-bold text-lg backdrop-blur-sm">S</div>
				<span class="text-2xl font-bold">Sabify</span>
			</div>
		</div>

		<div class="space-y-8 relative z-10">
			<div>
				<h1 class="text-5xl font-bold mb-4 leading-tight">
					Your campus,<br />
					<span class="opacity-90"><em>reimagined.</em></span>
				</h1>
				<p class="text-lg opacity-90 max-w-sm">Past questions, dues, safety alerts — one place for every Nigerian student.</p>
			</div>

			<div class="space-y-5">
				<div class="flex gap-4 items-start">
					<div class="mt-0.5"><BookOpen size={20} /></div>
					<div>
						<p class="font-semibold">Verified Past Questions</p>
						<p class="text-sm opacity-75">From every department</p>
					</div>
				</div>
				<div class="flex gap-4 items-start">
					<div class="mt-0.5"><Zap size={20} /></div>
					<div>
						<p class="font-semibold">Instant Dues Payment</p>
						<p class="text-sm opacity-75">With digital receipts</p>
					</div>
				</div>
				<div class="flex gap-4 items-start">
					<div class="mt-0.5"><ShieldCheck size={20} /></div>
					<div>
						<p class="font-semibold">Campus Shield</p>
						<p class="text-sm opacity-75">Real-time safety alerts</p>
					</div>
				</div>
			</div>
		</div>

		<p class="text-sm opacity-75 relative z-10">Already have an account? <a href="/signin" class="underline hover:opacity-100 font-medium">Sign in</a></p>
	</div>

	<!-- Right side - Signup Form -->
	<div class="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 bg-background min-h-screen">
		<div class="w-full max-w-md">
			<!-- Mobile Logo -->
			<div class="lg:hidden mb-8 text-center">
				<div class="inline-flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-lg text-primary-foreground">S</div>
					<span class="text-2xl font-bold">Sabify</span>
				</div>
				<p class="text-sm text-muted-foreground mt-2">Everything Campus. One App.</p>
			</div>

			<!-- Card -->
<Card class="border shadow-sm overflow-visible">
					<CardHeader class="space-y-2 pb-4">
					<CardTitle class="text-2xl font-bold">Create your account</CardTitle>
					<CardDescription>
						{#if currentStep === 1}University selection
						{:else if currentStep === 2}Your academic identity
						{:else}Secure your account
						{/if}
					</CardDescription>
				</CardHeader>

				<CardContent class="space-y-5">
					<!-- Stepper -->
					<div class="flex items-center gap-1.5">
						<div class="h-1.5 rounded-full flex-1 {currentStep >= 1 ? 'bg-primary' : 'bg-muted'} transition-colors"></div>
						<div class="h-1.5 rounded-full flex-1 {currentStep >= 2 ? 'bg-primary' : 'bg-muted'} transition-colors"></div>
						<div class="h-1.5 rounded-full flex-1 {currentStep >= 3 ? 'bg-primary' : 'bg-muted'} transition-colors"></div>
					</div>
					<div class="flex justify-between text-xs text-muted-foreground -mt-1">
						<span class="{currentStep >= 1 ? 'text-primary font-medium' : ''}">University</span>
						<span class="{currentStep >= 2 ? 'text-primary font-medium' : ''}">Identity</span>
						<span class="{currentStep >= 3 ? 'text-primary font-medium' : ''}">Security</span>
					</div>

					<!-- Errors / Success -->
					{#if errorMessage}
						<Alert variant="destructive" class="border-destructive/20 bg-destructive/10 py-3">
							<AlertCircle class="h-4 w-4" />
							<AlertDescription>{errorMessage}</AlertDescription>
						</Alert>
					{/if}
					{#if successMessage}
						<Alert class="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 py-3">
							<Check class="h-4 w-4 text-green-600" />
							<AlertDescription class="text-green-700 dark:text-green-400">{successMessage}</AlertDescription>
						</Alert>
					{/if}

					<!-- ══ STEP 1: University ══ -->
					{#if currentStep === 1}
						<div class="space-y-4">
							<div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
								<School size={16} />
								<span>Find your university — we support active institutions across Nigeria</span>
							</div>

							<!-- University Search -->
							<div class="space-y-3">
								<label class="text-sm font-medium mt-4 block">University <span class="text-destructive">*</span></label>
								<!-- FIX: Removed z-index from parent to prevent stacking context -->
								<div class="university-search relative">

									<div class="relative">
										<School class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
										<input
											type="text"
											bind:value={searchQuery}
											onfocus={() => (showDropdown = true)}
											oninput={onSearchInput}
											placeholder="Search for your university…"
											class="w-full pl-9 pr-9 h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
											autocomplete="off"
										/>
										{#if searchLoading}
											<span class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
										{:else if selectedUniversity}
											<button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive" onclick={clearUniversity}>
												<X size={16} />
											</button>
										{/if}
									</div>

									<!-- FIX: Increased z-index to 9999 to appear above all other content -->
									{#if showDropdown}
										<div class="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-56 overflow-y-auto z-[9999]">
											{#if searchLoading}
												{#each [1, 2, 3] as _}
													<div class="px-4 py-3 border-b last:border-b-0 flex items-center gap-3">
														<div class="h-3 bg-muted rounded animate-pulse w-12" />
														<div class="h-3 bg-muted rounded animate-pulse flex-1 max-w-[180px]" />
													</div>
												{/each}
											{:else if filteredUniversities.length > 0}
												{#each filteredUniversities as uni (uni.slug)}
													<button
														type="button"
														class="w-full px-4 py-2.5 text-left hover:bg-muted border-b last:border-b-0 flex items-center gap-3"
														onclick={() => selectUniversity(uni)}
													>
														<span class="font-bold text-primary text-xs min-w-[44px]">{uni.slug.toUpperCase()}</span>
														<span class="flex-1 text-sm">{uni.name}</span>
														{#if uni.isActive}
															<span class="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">Live</span>
														{/if}
													</button>
												{/each}
											{:else}
												<div class="px-4 py-5 text-center text-muted-foreground text-sm">
													No universities found for "<strong>{searchQuery}</strong>"
												</div>
											{/if}
										</div>
									{/if}
								</div>
							</div>

							<!-- Selected university card -->
							{#if selectedUniversity}
								<div class="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
									<div class="w-9 h-9 rounded-lg bg-background border flex items-center justify-center shrink-0">
										{#if !logoError}
											<img src={getLogoPath(selectedUniversity)} alt={selectedUniversity.slug} onerror={() => (logoError = true)} class="w-full h-full object-contain p-1" />
										{:else}
											<span class="font-bold text-xs text-primary">{selectedUniversity.slug.slice(0, 2).toUpperCase()}</span>
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<p class="font-medium text-sm truncate">{selectedUniversity.name}</p>
										<p class="text-xs text-muted-foreground">{selectedUniversity.slug.toUpperCase()}</p>
									</div>
									<Check size={16} class="text-green-500 flex-shrink-0" />
								</div>
							{/if}

							<!-- Receipt auto-fill section -->
							{#if receiptConfig}
								<div class="p-4 bg-muted/20 rounded-lg border space-y-3">
									<div class="flex items-center gap-2">
										<Zap size={14} class="text-primary" />
										<span class="font-medium text-sm">{receiptConfig.badgeLabel}</span>
									</div>

									<!-- Matric input -->
									<div class="space-y-1.5">
										<label class="text-xs font-medium">
											{receiptConfig.matricLabel ?? 'Matric number'}
											<span class="text-muted-foreground ml-1">— enter this first</span>
										</label>
										<div class="relative">
											<Briefcase class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
											<input
												type="text"
												bind:value={uniMatric}
												oninput={onMatricInput}
												placeholder={receiptConfig.matricPlaceholder ?? 'e.g. 2021/249011'}
												class="w-full pl-9 pr-3 h-9 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											/>
										</div>
									</div>

									<!-- QR scan buttons -->
									<div class="flex gap-2 flex-wrap {!uniMatric.trim() ? 'opacity-50 pointer-events-none' : ''}">
										<button
											type="button"
											class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border hover:bg-muted transition-colors"
											onclick={startWebcam}
											disabled={!uniMatric.trim()}
										>
											<Camera size={13} /> Live camera
										</button>
										<label class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border hover:bg-muted transition-colors cursor-pointer">
											<Upload size={13} /> Upload image
											<input type="file" accept="image/*" class="hidden" disabled={!uniMatric.trim()} onchange={handleQrUpload} />
										</label>
									</div>

									{#if camError}
										<p class="text-xs text-destructive">{camError}</p>
									{/if}

									{#if showWebcam}
										<div class="space-y-2">
											<div class="relative rounded-lg overflow-hidden bg-black aspect-video">
												<!-- svelte-ignore a11y-media-has-caption -->
												<video bind:this={videoEl} playsinline autoplay class="w-full h-full object-cover" />
												<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
													<div class="w-32 h-32 border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" />
												</div>
											</div>
											<p class="text-xs text-muted-foreground text-center">Point at the QR code on your school fee receipt</p>
											<button type="button" class="text-xs text-destructive hover:underline flex items-center gap-1" onclick={stopWebcam}>
												<X size={12} /> Cancel scanning
											</button>
										</div>
									{/if}

									<!-- Manual ref input -->
									<div class="space-y-1.5">
										<label class="text-xs font-medium">Or enter {receiptConfig.refLabel} manually</label>
										<div class="relative">
											<QrCode class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
											<input
												type={refMasked ? 'password' : 'text'}
												value={refMasked ? '••••••••••••' : refNumber}
												oninput={(e) => {
													refNumber = (e.target as HTMLInputElement).value;
													onRefInput();
												}}
												placeholder={receiptConfig.refPlaceholder}
												class="w-full pl-9 pr-20 h-9 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
												disabled={!uniMatric.trim() || receiptLoading}
												readonly={refMasked}
											/>
											{#if receiptLoading}
												<div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-primary">
													<span class="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
													Verifying…
												</div>
											{:else if !refMasked}
												<button
													type="button"
													class="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
													onclick={() => fetchReceipt(false)}
													disabled={!refNumber.trim() || !uniMatric.trim()}
												>
													Fetch
												</button>
											{:else}
												<button
													type="button"
													class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
													onclick={() => {
														refNumber = '';
														refMasked = false;
														receiptRaw = null;
														receiptData = null;
														receiptFetched = false;
														clearPrefilled();
													}}
												>
													<X size={14} />
												</button>
											{/if}
										</div>
									</div>

									<!-- Receipt preview -->
									{#if receiptData}
										<div class="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
											<p class="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 mb-2">
												<Check size={12} /> Receipt verified — fields auto-filled
											</p>
											<div class="space-y-1">
												{#each Object.entries(receiptData) as [key, val] (key)}
													{#if val}
														<div class="flex justify-between text-xs">
															<span class="text-muted-foreground">{key}</span>
															<span class="font-medium">{val}</span>
														</div>
													{/if}
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/if}

							<Button onclick={nextStep} disabled={isLoading} class="w-full gap-2 h-10 font-medium">
								Continue <ArrowRight size={16} />
							</Button>
						</div>
					{/if}

					<!-- ══ STEP 2: Identity ══ -->
					{#if currentStep === 2}
						<div class="space-y-4">
							<div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
								<User size={16} />
								<span>Help us verify your student status</span>
							</div>

							<!-- University banner -->
							{#if selectedUniversity}
								<div class="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
									<div class="w-8 h-8 rounded-md bg-background border flex items-center justify-center overflow-hidden flex-shrink-0">
										{#if !logoError}
											<img src={getLogoPath(selectedUniversity)} alt="" onerror={() => (logoError = true)} class="w-full h-full object-contain p-0.5" />
										{:else}
											<span class="font-bold text-xs text-primary">{selectedUniversity.slug.slice(0, 2).toUpperCase()}</span>
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<p class="font-medium text-xs truncate">{selectedUniversity.name}</p>
										<p class="text-xs text-muted-foreground">{selectedUniversity.slug.toUpperCase()}</p>
									</div>
								</div>
							{/if}

							<!-- Receipt prefill notice -->
							{#if receiptFetched}
								<div class="flex items-center gap-2 flex-wrap p-2.5 rounded-lg text-xs text-muted-foreground bg-primary/5 border border-primary/15">
									<Zap size={12} class="text-primary flex-shrink-0" />
									<span>Fields filled from your receipt are locked.</span>
									<button
										type="button"
										class="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
										onclick={() => { receiptFetched = false; receiptRaw = null; receiptData = null; clearPrefilled(); currentStep = 1; }}
									>
										<RefreshCw size={11} /> Re-scan
									</button>
								</div>
							{/if}

							<!-- JAMB Reg -->
							<div class="space-y-1.5">
								<label class="text-sm font-medium">
									JAMB Registration Number
									{#if receiptFetched}<Lock size={12} class="inline ml-1 text-muted-foreground" />{/if}
								</label>
								<div class="relative">
									<Briefcase class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
									<Input type="text" bind:value={jambregNo} placeholder="202551405692CF" readonly={receiptFetched} class="pl-10 h-10 {receiptFetched ? 'bg-muted/50' : ''}" maxlength={15} />
								</div>
							</div>

							<!-- Matric / Reg number -->
							<div class="space-y-1.5">
								<label class="text-sm font-medium">
									Matric / Registration number <span class="text-destructive">*</span>
									{#if receiptFetched}<Lock size={12} class="inline ml-1 text-muted-foreground" />{/if}
								</label>
								<div class="relative">
									<Briefcase class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
									<Input type="text" bind:value={matricNumber} placeholder="2021/249011" readonly={receiptFetched} class="pl-10 h-10 {receiptFetched ? 'bg-muted/50' : ''}" />
								</div>
							</div>

							<!-- Surname + First name -->
							<div class="grid grid-cols-2 gap-3">
								<div class="space-y-1.5">
									<label class="text-sm font-medium">
										Surname <span class="text-destructive">*</span>
										{#if receiptFetched}<Lock size={12} class="inline ml-1 text-muted-foreground" />{/if}
									</label>
									<div class="relative">
										<User class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
										<Input type="text" bind:value={surname} placeholder="Adebayo" readonly={receiptFetched} class="pl-10 h-10 {receiptFetched ? 'bg-muted/50' : ''}" />
									</div>
								</div>
								<div class="space-y-1.5">
									<label class="text-sm font-medium">
										First name <span class="text-destructive">*</span>
										{#if receiptFetched}<Lock size={12} class="inline ml-1 text-muted-foreground" />{/if}
									</label>
									<div class="relative">
										<User class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
										<Input type="text" bind:value={firstName} placeholder="Oluwaseun" readonly={receiptFetched} class="pl-10 h-10 {receiptFetched ? 'bg-muted/50' : ''}" />
									</div>
								</div>
							</div>

							<!-- Other name -->
							<div class="space-y-1.5">
								<label class="text-sm font-medium">
									Other name(s)
									{#if receiptFetched}<Lock size={12} class="inline ml-1 text-muted-foreground" />{:else}<span class="text-muted-foreground text-xs ml-1">optional</span>{/if}
								</label>
								<div class="relative">
									<User class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
									<Input type="text" bind:value={otherName} placeholder="Middle name" readonly={receiptFetched} class="pl-10 h-10 {receiptFetched ? 'bg-muted/50' : ''}" />
								</div>
							</div>

							<!-- Faculty + Department -->
							<div class="grid grid-cols-2 gap-3">
								<div class="space-y-1.5">
									<label class="text-sm font-medium">
										Faculty / College <span class="text-destructive">*</span>
										{#if receiptFetched}<Lock size={12} class="inline ml-1 text-muted-foreground" />{/if}
									</label>
									<div class="relative">
										<Building2 class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
										<Input type="text" bind:value={faculty} placeholder="Engineering" readonly={receiptFetched} class="pl-10 h-10 {receiptFetched ? 'bg-muted/50' : ''}" />
									</div>
								</div>
								<div class="space-y-1.5">
									<label class="text-sm font-medium">
										Department <span class="text-destructive">*</span>
										{#if receiptFetched}<Lock size={12} class="inline ml-1 text-muted-foreground" />{/if}
									</label>
									<div class="relative">
										<BookOpen class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
										<Input type="text" bind:value={department} placeholder="Computer Science" readonly={receiptFetched} class="pl-10 h-10 {receiptFetched ? 'bg-muted/50' : ''}" />
									</div>
								</div>
							</div>

							<!-- Phone -->
							<div class="space-y-1.5">
								<label class="text-sm font-medium">Phone number <span class="text-muted-foreground text-xs ml-1">optional</span></label>
								<div class="relative">
									<Phone class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
									<Input type="tel" bind:value={phone} placeholder="+234 801 234 5678" class="pl-10 h-10" />
								</div>
							</div>

							<!-- Email -->
							<div class="space-y-1.5">
								<label class="text-sm font-medium">Email address <span class="text-destructive">*</span></label>
								<div class="relative">
									<Mail class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
									<Input type="email" bind:value={email} placeholder="you@university.edu.ng" disabled={isLoading} class="pl-10 h-10" />
								</div>
							</div>

							<!-- Nav -->
							<div class="flex gap-3">
								<Button variant="outline" onclick={prevStep} disabled={isLoading} class="flex-1 h-10 font-medium">
									<ChevronLeft size={16} /> Back
								</Button>
								<Button onclick={nextStep} disabled={isLoading} class="flex-1 gap-2 h-10 font-medium">
									Continue <ArrowRight size={16} />
								</Button>
							</div>
						</div>
					{/if}

					<!-- ══ STEP 3: Security ══ -->
					{#if currentStep === 3}
						<div class="space-y-4">
							<div class="flex items-center gap-2 text-sm text-muted-foreground mb-1">
								<ShieldCheck size={16} />
								<span>Create a strong password to protect your account</span>
							</div>

							<!-- Password -->
							<div class="space-y-1.5">
								<label class="text-sm font-medium">Password <span class="text-destructive">*</span></label>
								<div class="relative">
									<Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
									<Input
										type={showPassword ? 'text' : 'password'}
										placeholder="Create a strong password"
										bind:value={password}
										disabled={isLoading}
										class="pl-10 pr-10 h-10"
									/>
									<button
										type="button"
										onclick={() => (showPassword = !showPassword)}
										disabled={isLoading}
										class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									>
										{#if showPassword}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
									</button>
								</div>
								<p class="text-xs text-muted-foreground">Minimum 6 characters</p>
							</div>

							<!-- Confirm password -->
							<div class="space-y-1.5">
								<label class="text-sm font-medium">Confirm password <span class="text-destructive">*</span></label>
								<div class="relative">
									<Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
									<Input
										type={showConfirmPassword ? 'text' : 'password'}
										placeholder="Confirm your password"
										bind:value={confirmPassword}
										disabled={isLoading}
										class="pl-10 pr-10 h-10"
									/>
									<button
										type="button"
										onclick={() => (showConfirmPassword = !showConfirmPassword)}
										disabled={isLoading}
										class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									>
										{#if showConfirmPassword}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
									</button>
								</div>
							</div>

							<!-- Nav -->
							<div class="flex gap-3">
								<Button variant="outline" onclick={prevStep} disabled={isLoading} class="flex-1 h-10 font-medium">
									<ChevronLeft size={16} /> Back
								</Button>
								<Button onclick={handleSubmit} disabled={isLoading} class="flex-1 gap-2 h-10 font-medium">
									{#if isLoading}
										<span class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
										Creating…
									{:else}
										<UserPlus size={16} /> Create account
									{/if}
								</Button>
							</div>
						</div>
					{/if}

					<!-- Sign-in link -->
					<p class="text-center text-sm text-muted-foreground pt-2 border-t">
						Already have an account?
						<a href="/signin" class="text-primary hover:underline font-medium">Sign in</a>
					</p>
				</CardContent>
			</Card>

			<p class="text-center text-xs text-muted-foreground mt-5">
				By creating an account, you agree to our
				<a href="/terms" class="hover:underline text-primary">Terms of Service</a>
				and
				<a href="/privacy" class="hover:underline text-primary">Privacy Policy</a>
			</p>
		</div>
	</div>
</div>