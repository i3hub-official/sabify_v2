<!-- src/lib/components/UniversityCTA.svelte -->
<script lang="ts">
  import { allUniversities, searchAllUniversities } from '$lib/stores/universities';
  import type { University } from '$lib/universities/types';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Input } from '$lib/components/ui/input';
  import { Search, X, CheckCircle2 } from '@lucide/svelte';

  // ── State ─────────────────────────────────────────────────────────
  let searchQuery = $state('');
  let showDropdown = $state(false);
  let selectedUniversity: University | null = $state(null);
  let logoError = $state(false);

  // ── Derived ───────────────────────────────────────────────────────
  const filteredUniversities = $derived(() => {
    let results = searchQuery
      ? searchAllUniversities(searchQuery)
      : allUniversities;
    
    // Sort: active first, then by name
    return results
      .sort((a, b) => {
        // Active universities first
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        // Then sort by name
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10);
  });

  // Reset logo error whenever a new university is picked
  $effect(() => {
    if (selectedUniversity) logoError = false;
  });

  // ── Helpers ───────────────────────────────────────────────────────
  function getLogoPath(uni: University | null): string | null {
    if (!uni) return null;
    const slug = uni.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    return `/uni-icons/${slug}.png`;
  }

  function selectUniversity(uni: University) {
    selectedUniversity = uni;
    searchQuery = `${uni.name} (${uni.acronym})`;
    showDropdown = false;
  }

  function clearUniversity() {
    selectedUniversity = null;
    searchQuery = '';
    showDropdown = false;
  }

  function handleGetStarted() {
    if (!selectedUniversity) return;
    window.location.href = `/signup?university=${selectedUniversity.id}`;
  }

  // Close dropdown when clicking outside
  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.university-search')) {
      showDropdown = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<section class="py-16 sm:py-20 px-4 sm:px-6 md:px-12 border-t border-border bg-muted/30">
    <div class="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
    
    <!-- Text Block -->
    <div class="space-y-4">
      <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
        Your university could be <span class="italic text-primary">next.</span>
      </h2>
      <p class="text-base sm:text-lg text-muted-foreground leading-relaxed">
        Sabify is rolling out across Nigerian universities.
        Find yours and get started — or join the list if we're not there yet.
      </p>
    </div>

    <!-- Form Block -->
    <div class="space-y-3">
      
      <!-- University search input -->
      <div class="university-search relative z-50">
        <div class="relative">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          
          <Input
            type="text"
            bind:value={searchQuery}
            onfocus={() => (showDropdown = true)}
            oninput={() => (showDropdown = true)}
            placeholder="Search for your university…"
            class="pl-10 pr-10 h-12"
            autocomplete="off"
            aria-label="Search universities"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
          />

          {#if selectedUniversity}
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onclick={clearUniversity}
              aria-label="Clear university selection"
            >
              <X size={16} />
            </button>
          {/if}
        </div>

        <!-- Dropdown list - with high z-index -->
        {#if showDropdown && filteredUniversities().length > 0}
          <div 
            class="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-lg shadow-2xl max-h-60 overflow-y-auto z-[9999]"
            role="listbox"
            aria-label="University options"
          >
            {#each filteredUniversities() as uni (uni.id)}
              <button
                type="button"
                class="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-3 border-b last:border-b-0 border-border"
                role="option"
                aria-selected={selectedUniversity?.id === uni.id}
                onclick={() => selectUniversity(uni)}
              >
                <span class="font-mono text-xs font-bold text-primary min-w-[60px] flex-shrink-0">
                  {uni.acronym}
                </span>
                <span class="text-sm flex-1">{uni.name}</span>
                {#if !uni.active}
                  <Badge variant="outline" class="text-xs font-mono">soon</Badge>
                {:else}
                  <Badge class="text-xs font-mono bg-green-500/10 text-green-600 border-green-200">live</Badge>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Selected university card -->
      {#if selectedUniversity}
        <Card class="border-primary/25 animate-in slide-in-from-top-2 duration-150">
          <CardContent class="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {#if !logoError}
                <img
                  src={getLogoPath(selectedUniversity)}
                  alt={selectedUniversity.acronym}
                  class="w-full h-full object-contain p-1"
                  onerror={() => (logoError = true)}
                />
              {:else}
                <span class="text-sm font-bold text-primary">
                  {selectedUniversity.acronym.slice(0, 2)}
                </span>
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">{selectedUniversity.name}</p>
              <p class="text-xs font-mono font-bold text-primary">{selectedUniversity.acronym}</p>
            </div>
            <CheckCircle2 class="text-green-500 flex-shrink-0" size={20} />
          </CardContent>
        </Card>
      {/if}

      <!-- Get Started Button -->
      <Button 
        size="lg" 
        class="w-full h-12 text-base font-semibold"
        disabled={!selectedUniversity}
        onclick={handleGetStarted}
      >
        {selectedUniversity ? `Get started at ${selectedUniversity.acronym} →` : 'Get started →'}
      </Button>

      <!-- Note -->
      <p class="text-xs text-center text-muted-foreground font-mono">
        {#if selectedUniversity && !selectedUniversity.active}
          We're not at {selectedUniversity.acronym} yet — you'll be notified when we launch there.
        {:else}
          MOUAU is live now. More universities launching soon.
        {/if}
      </p>
    </div>

  </div>
</section>