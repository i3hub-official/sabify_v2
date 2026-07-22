<!-- src/routes/+error.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button/index.js';
	
	// Error icons
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import ServerCrash from '@lucide/svelte/icons/server-crash';
	import FileQuestion from '@lucide/svelte/icons/file-question';
	import ShieldOff from '@lucide/svelte/icons/shield-off';
	import FileWarning from '@lucide/svelte/icons/file-warning';
	import Clock from '@lucide/svelte/icons/clock';
	import Ban from '@lucide/svelte/icons/ban';
	import Copy from '@lucide/svelte/icons/copy';
	import FileX from '@lucide/svelte/icons/file-x';
	import Gauge from '@lucide/svelte/icons/gauge';
	import Wifi from '@lucide/svelte/icons/wifi-off';
	import Wrench from '@lucide/svelte/icons/wrench';
	import HourglassIcon from '@lucide/svelte/icons/hourglass';
	
	// Action icons
	import Home from '@lucide/svelte/icons/home';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Bug from '@lucide/svelte/icons/bug';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Rocket from '@lucide/svelte/icons/rocket';
	import Ghost from '@lucide/svelte/icons/ghost';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Smile from '@lucide/svelte/icons/smile';
	import Link2 from '@lucide/svelte/icons/link-2';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Terminal from '@lucide/svelte/icons/terminal';
	import Clipboard from '@lucide/svelte/icons/clipboard';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Info from '@lucide/svelte/icons/info';
	import PartyPopper from '@lucide/svelte/icons/party-popper';
	import Heart from '@lucide/svelte/icons/heart';
	import Star from '@lucide/svelte/icons/star';
	import ThumbsUp from '@lucide/svelte/icons/thumbs-up';

	const status = $derived($page.status);
	const message = $derived($page.error?.message ?? 'Something went wrong.');

	type Preset = { 
		icon: typeof AlertTriangle; 
		title: string; 
		hint: string;
		iconColor?: string;
	};

	const presets: Record<number, Preset> = {
		400: { 
			icon: FileWarning, 
			title: 'Bad request', 
			hint: 'The request was malformed or missing required information.',
			iconColor: 'text-yellow-500'
		},
		401: { 
			icon: ShieldOff, 
			title: 'Sign in required', 
			hint: 'Your session may have expired. Please sign in again.',
			iconColor: 'text-blue-500'
		},
		403: { 
			icon: ShieldOff, 
			title: 'Access denied', 
			hint: "You don't have permission to view this page.",
			iconColor: 'text-red-500'
		},
		404: { 
			icon: FileQuestion, 
			title: 'Page not found', 
			hint: "The page you're looking for doesn't exist or may have moved.",
			iconColor: 'text-yellow-500'
		},
		405: { 
			icon: Ban, 
			title: 'Method not allowed', 
			hint: "This action isn't supported for this page.",
			iconColor: 'text-red-500'
		},
		408: { 
			icon: Clock, 
			title: 'Request timed out', 
			hint: 'The server took too long to respond. Check your connection and try again.',
			iconColor: 'text-yellow-500'
		},
		409: { 
			icon: Copy, 
			title: 'Conflict', 
			hint: 'This action conflicts with existing data — someone may have already made this change.',
			iconColor: 'text-orange-500'
		},
		413: { 
			icon: FileX, 
			title: 'File too large', 
			hint: "What you're uploading exceeds the size limit.",
			iconColor: 'text-red-500'
		},
		422: { 
			icon: FileWarning, 
			title: "Couldn't process that", 
			hint: 'The information provided looks correct but could not be processed.',
			iconColor: 'text-yellow-500'
		},
		429: { 
			icon: Gauge, 
			title: 'Too many requests', 
			hint: "You've made too many requests in a short time. Please wait a moment and try again.",
			iconColor: 'text-orange-500'
		},
		500: { 
			icon: ServerCrash, 
			title: 'Something broke on our end', 
			hint: "We've logged the issue. Try again in a moment.",
			iconColor: 'text-red-500'
		},
		502: { 
			icon: Wifi, 
			title: 'Bad gateway', 
			hint: 'An upstream service returned an invalid response. Try again shortly.',
			iconColor: 'text-yellow-500'
		},
		503: { 
			icon: Wrench, 
			title: 'Service unavailable', 
			hint: "We're temporarily down, likely for maintenance. Please check back soon.",
			iconColor: 'text-yellow-500'
		},
		504: { 
			icon: HourglassIcon, 
			title: 'Gateway timeout', 
			hint: 'The server took too long to respond. Please try again.',
			iconColor: 'text-yellow-500'
		},
	};

	function fallbackPreset(code: number): Preset {
		if (code >= 500) {
			return { 
				icon: ServerCrash, 
				title: 'Server error', 
				hint: "Something went wrong on our end. We've logged the issue.",
				iconColor: 'text-red-500'
			};
		}
		if (code >= 400) {
			return { 
				icon: AlertTriangle, 
				title: 'Request error', 
				hint: 'Something about this request could not be completed.',
				iconColor: 'text-yellow-500'
			};
		}
		return { 
			icon: AlertTriangle, 
			title: 'Unexpected error', 
			hint: 'An unexpected error occurred.',
			iconColor: 'text-red-500'
		};
	}

	const preset = $derived(presets[status] ?? fallbackPreset(status));

	// ── Quips ────────────────────────────────────────────────────────────
	const QUIPS: Record<string, string[]> = {
		notFound: [
			"This page went to buy milk and never came back.",
			"404: page is currently on strike.",
			"You've reached the edge of the map. Here be dragons.",
			"Even our search party couldn't find this one.",
			"This link led to Narnia. Unfortunately, we don't support Narnia.",
			"Someone took the red pill and the page vanished.",
			"This page has been abducted by aliens. We're working on a rescue mission.",
			"404: page is in a better place now. (The recycle bin.)",
			"Sorry, this page is on a coffee break. It'll be back when it feels like it.",
			"This page doesn't exist. Or does it? *x-files theme plays*",
			"Looks like this page has been digitized. And by digitized, we mean deleted.",
			"This page is a ghost. Boo! (But also, sorry.)",
			"We searched high and low. Even under the couch cushions. Nothing.",
			"The page you're looking for is currently on a sabbatical.",
		],
		auth: [
			"Access denied — the bouncer says your name's not on the list.",
			"This door needs a badge. Yours seems to have expired.",
			"You shall not pass. (Sorry, had to.)",
			"Nice try. This one's locked tighter than final exam questions.",
			"Who are you? No really, we need to know.",
			"This area is more exclusive than a VIP section at a concert.",
			"Your ID: not found. Your chances: not good.",
			"Even the fingerprint scanner is confused.",
			"Private property. Trespassers will be forced to take a pop quiz.",
			"You don't have the keys to this kingdom. (Game of Thrones reference.)",
			"Sorry, this content is invite-only. And you're not on the list.",
			"Authentication failed. Did you try turning it off and on again?",
			"Access denied. The server has spoken.",
			"This is a members-only area. And you're not a member. Yet.",
		],
		rateLimit: [
			"Whoa, slow down there, champion. Even servers need to breathe.",
			"You've been clicking like it's a caffeine-fueled hackathon. Take a breath.",
			"Our server needs a moment. You broke a small sweat, we broke a bigger one.",
			"Please wait. Our server is running on 3 cups of coffee and a dream.",
			"You're clicking faster than a student at a multiple-choice exam.",
			"Take a deep breath. Then click again. Or don't. You do you.",
			"Our server is currently out of breath. Please wait.",
			"Too many clicks! The server is feeling overwhelmed.",
			"I'm fast, but even I have limits. (Said every server ever.)",
			"Click limit exceeded. Go stretch, get some water.",
			"Your clicking speed is impressive. The server is also impressed. And tired.",
			"Rate limit reached. The server is now on a coffee break.",
			"Slow down! The server is getting dizzy.",
			"You've clicked more times than a sneeze in a dust storm. Please wait.",
		],
		serverError: [
			"Our server went out into space. Don't know when it's coming back.",
			"Something exploded quietly in the server room. We're sweeping up the pieces.",
			"The hamsters powering our backend are on a union break.",
			"Error 500: our code had a small existential crisis.",
			"We asked the server nicely. It just stared back in silence.",
			"Somewhere, a semicolon is missing, and everything fell apart.",
			"The server is currently questioning its life choices.",
			"Our database is stuck in traffic. It'll be here soon.",
			"The cloud is being cloudy. We're trying to find a rainbow.",
			"Server is offline. Probably because it's dreaming of electric sheep.",
			"We're experiencing technical difficulties. The server is having a bad day.",
			"Error 500: the server is crying. We're giving it a hug.",
			"Something broke. We're currently in the denial phase.",
			"The server panicked. We're calming it down with some soothing music.",
			"An unexpected error occurred. Unexpected... but not surprising.",
		],
		generic: [
			"Well, this is awkward.",
			"Something went sideways. We're not entirely sure which way is 'up' right now either.",
			"Gremlins. It's always gremlins.",
			"This wasn't supposed to happen. We're as surprised as you are.",
			"Error code: 0x8000... actually, we don't know either.",
			"Something went wrong. Our code is as confused as a chameleon in a bag of Skittles.",
			"An error occurred. We're writing a strongly worded letter to the server.",
			"We don't know what happened, but we're going to blame IT.",
			"Everything is fine! *fire alarm in the background*",
			"Something broke. We're currently in the denial phase.",
			"The error message is: it's probably a Monday.",
			"Just a minor glitch in the Matrix. Nothing to see here.",
			"Error: our code is currently on strike. We're negotiating.",
			"Something went wrong, but we're too polite to point fingers.",
		],
	};

	function quipCategory(code: number): keyof typeof QUIPS {
		if (code === 404) return 'notFound';
		if (code === 401 || code === 403) return 'auth';
		if (code === 429) return 'rateLimit';
		if (code >= 500) return 'serverError';
		return 'generic';
	}

	// ── Quip with probability gate ──────────────────────────────────────
	// Only show quips 60% of the time - feels like an easter egg
	const QUIP_PROBABILITY = 0.6; // 60% chance to show a quip

	let quip = $state<string | null>(null);
	let quipIcon = $state<any>(null);

	$effect(() => {
		// Roll the dice - 60% chance to show a quip
		if (Math.random() < QUIP_PROBABILITY) {
			const pool = QUIPS[quipCategory(status)];
			quip = pool[Math.floor(Math.random() * pool.length)];
			
			// Random icon for the quip
			const icons = [Ghost, Rocket, Sparkles, Coffee, Smile, Bug, ShieldCheck, PartyPopper, Heart, Star, ThumbsUp];
			quipIcon = icons[Math.floor(Math.random() * icons.length)];
		} else {
			quip = null;
			quipIcon = null;
		}
	});

	const homeHref = $derived.by(() => {
		const user = $page.data?.user;
		if (!user) return '/login';
		if (user.type === 'student') return '/student';
		return '/';
	});

	const isRetryable = $derived(status >= 500 || status === 408 || status === 429);

	function reload() {
		location.reload();
	}

	function copyError() {
		const errorText = `Error ${status}: ${preset.title}\n${message}\n\nDetails: ${JSON.stringify($page.error, null, 2)}`;
		navigator.clipboard?.writeText(errorText);
	}

	// ── cn helper ──────────────────────────────────────────────────────
	function cn(...classes: (string | undefined | null | false)[]) {
		return classes.filter(Boolean).join(' ');
	}
</script>

<svelte:head>
	<title>{status} — {preset.title}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background px-4">
	<div class="w-full max-w-md text-center">
		<div class="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl border border-border bg-muted transition-all hover:scale-105">
			<preset.icon class={cn("size-10", preset.iconColor ?? "text-muted-foreground")} />
		</div>

		<p class="text-sm font-medium tracking-wide text-muted-foreground">Error {status}</p>
		<h1 class="mt-1 text-2xl font-bold tracking-tight">{preset.title}</h1>
		<p class="mt-2 text-sm text-muted-foreground">{message !== preset.title ? message : preset.hint}</p>

		{#if quip && quipIcon}
			<div class="mt-4 flex items-center justify-center gap-2 rounded-lg bg-muted/50 px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
				<svelte:component this={quipIcon} class="size-4 text-muted-foreground/70 flex-shrink-0" />
				<p class="text-sm italic text-muted-foreground/70">"{quip}"</p>
			</div>
		{/if}

		<div class="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
			<Button href={homeHref} class="gap-2">
				<Home class="size-4" />
				Go home
			</Button>
			{#if isRetryable}
				<Button variant="outline" onclick={reload} class="gap-2">
					<RotateCw class="size-4" />
					Try again
				</Button>
			{/if}
			<Button 
				variant="ghost" 
				onclick={copyError} 
				class="gap-2"
				title="Copy error details"
			>
				<Clipboard class="size-4" />
				<span class="sr-only md:not-sr-only">Copy error</span>
			</Button>
		</div>

		{#if import.meta.env.DEV && $page.error}
			<div class="mt-8 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-left transition-all hover:bg-destructive/15">
				<div class="flex items-center gap-2 mb-2">
					<Terminal class="size-4 text-destructive" />
					<p class="text-xs font-semibold text-destructive">Developer Details</p>
				</div>
				<pre class="overflow-x-auto text-xs text-destructive/90 font-mono bg-background/50 p-2 rounded">{$page.error.stack ?? JSON.stringify($page.error, null, 2)}</pre>
				<p class="mt-2 text-xs text-destructive/70 flex items-center gap-1">
					<Info class="size-3" />
					These details are only visible in development mode
				</p>
			</div>
		{/if}

		{#if !import.meta.env.DEV && status >= 500}
			<div class="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
				<Bug class="size-3" />
				<span>We've been notified about this issue. Thank you for your patience!</span>
			</div>
		{/if}

		<div class="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground/40">
			<Link2 class="size-3" />
			<span>Error reference: {status}-{Math.random().toString(36).substring(2, 7).toUpperCase()}</span>
		</div>

		{#if quip === null}
			<div class="mt-4 text-xs text-muted-foreground/30 select-none">
				No joke today. We're being serious. 😤
			</div>
		{/if}
	</div>
</div>

<style>
	button, a {
		transition: all 0.2s ease;
	}
	
	.animate-in {
		animation: fadeInUp 0.4s ease-out;
	}
	
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>