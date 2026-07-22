<!-- src/routes/(auth)/+layout.svelte -->
<script lang="ts">
import '../app.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- Auth routes - public, no sidebar, full page layouts -->
<div class="min-h-screen bg-background">
	{@render children()}
</div>