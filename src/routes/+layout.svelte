<!-- src/routes/(marketing)/+layout.svelte -->
<script lang="ts">
    import './app.css';
    import type { Snippet } from 'svelte';

    import { ModeWatcher } from 'mode-watcher';
    import { Toaster } from '$lib/components/ui/sonner';

    let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
   
</svelte:head>

<ModeWatcher />
<Toaster richColors position="top-right" />

{@render children()}