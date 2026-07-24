<!-- src/routes/(marketing)/+layout.svelte -->
<script lang="ts">
	  import { page } from '$app/stores'
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="min-h-screen bg-background">
	{@render children()}
</div>