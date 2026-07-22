<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme';
  import {
    BookOpen, FileText, ClipboardList, CreditCard, QrCode,
    Bell, Footprints, Calendar, Megaphone, Layers,
    ArrowRight, File, DollarSign, AlertTriangle,
    Library, Building2, GraduationCap, Shield,
    Mail, ChevronDown, Check
  } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Separator } from '$lib/components/ui/separator';
  import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from '$lib/components/ui/accordion';
  import { Input } from '$lib/components/ui/input';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { goto } from '$app/navigation';
  import UniversityCTA from '$lib/components/UniversityCTA.svelte';

  onMount(() => {
    theme.init();
  });

  // Navigation handler
  const handleNavigate = (path: string) => () => {
    console.log(`Navigating to ${path}`);
    goto(path);
  };

</script>

<svelte:head>
  <title>Sabify — Everything Campus. One App.</title>
  <meta
    name="description"
    content="The academic platform for Nigerian and West African university students. Past questions, departmental dues, campus safety, events, and more."
  />
</svelte:head>

<!-- Main wrapper to prevent horizontal scroll -->
<div class="overflow-x-hidden w-full">

<!-- ════════════════════════════════════════════════════════════════════════════════
     HERO
     ════════════════════════════════════════════════════════════════════════════════ -->
<section class="relative min-h-screen flex items-center justify-center px-4 sm:px-6 md:px-12 py-20 overflow-hidden">

  <div class="absolute inset-0 -z-10">
    <div
      class="absolute top-20 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none"
    ></div>
    <div
      class="absolute -bottom-20 left-1/3 w-96 h-96 bg-primary/3 rounded-full blur-3xl pointer-events-none"
    ></div>
  </div>

  <!-- Logo - Left on wide screens, centered on mobile -->
  <div class="absolute top-4 sm:top-6 md:top-8 left-1/2 md:left-6 lg:left-12 -translate-x-1/2 md:-translate-x-0 z-10">
    <div class="inline-flex items-center gap-2 sm:gap-3 relative z-10">
      <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/20 flex items-center justify-center font-bold text-base sm:text-lg backdrop-blur-sm border border-primary/10">S</div>
      <span class="text-xl sm:text-2xl font-bold">Sabify</span>
    </div>
  </div>

  <div class="w-full max-w-6xl mx-auto text-center space-y-6 sm:space-y-8 px-4 sm:px-0">
    <!-- Headline -->
    <div class="space-y-3 sm:space-y-4">
      <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
        Everything Campus.<br />
        <span class="italic text-primary">One App.</span>
      </h1>
      <p class="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
        Past questions. Departmental dues. Campus safety. Events. Assignments. Textbooks.
        Everything your university never gave you—now in one platform.
      </p>
    </div>

    <!-- CTA Buttons -->
    <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 sm:pt-4">
      <Button size="lg" class="gap-2 h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base w-full sm:w-auto" onclick={handleNavigate('/signin')}>
        Continue to Sign in <ArrowRight size={18} />
      </Button>
      <Button size="lg" variant="outline" class="h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base w-full sm:w-auto" onclick={handleNavigate('/signup')}>
        Get started
      </Button>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════════════════════════════
     REAL PROBLEMS
     ════════════════════════════════════════════════════════════════════════════════ -->
<section class="py-16 sm:py-20 px-4 sm:px-6 md:px-12 bg-muted/30 overflow-hidden" id="features">
  <div class="w-full max-w-7xl mx-auto space-y-10 sm:space-y-12">
    <!-- Header -->
    <div class="text-center space-y-3 sm:space-y-4 px-4 sm:px-0">
      <Badge variant="secondary" class="mx-auto">Real problems. Real solutions.</Badge>
      <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold">What actually breaks at Nigerian universities</h2>
      <p class="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
        We asked students across West Africa. Here's what they said.
      </p>
    </div>

    <!-- Problems Grid -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      <!-- Past Questions -->
      <Card class="hover:shadow-lg hover:border-primary/50 transition-all">
        <CardHeader>
          <div class="flex items-start justify-between">
            <FileText class="text-primary" size={24} />
          </div>
          <CardTitle class="text-lg sm:text-xl">"Who has last year's past question?"</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <CardDescription>
            No more chasing seniors at 2am. Every past test from every department, organized and
            searchable.
          </CardDescription>
          <Badge variant="outline" class="w-fit">
            <span class="text-primary font-semibold">Solved:</span>
            <span class="ml-2">Centralized library</span>
          </Badge>
        </CardContent>
      </Card>

      <!-- Departmental Dues -->
      <Card class="hover:shadow-lg hover:border-primary/50 transition-all">
        <CardHeader>
          <div class="flex items-start justify-between">
            <DollarSign class="text-primary" size={24} />
          </div>
          <CardTitle class="text-lg sm:text-xl">"I paid my dues, where's my receipt?"</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <CardDescription>
            Departmental dues disappear into thin air. Get a tamper-proof QR receipt. Instant audit
            trail.
          </CardDescription>
          <Badge variant="outline" class="w-fit">
            <span class="text-primary font-semibold">Solved:</span>
            <span class="ml-2">Digital receipts</span>
          </Badge>
        </CardContent>
      </Card>

      <!-- Announcements -->
      <Card class="hover:shadow-lg hover:border-primary/50 transition-all">
        <CardHeader>
          <div class="flex items-start justify-between">
            <AlertTriangle class="text-primary" size={24} />
          </div>
          <CardTitle class="text-lg sm:text-xl">"No one told me the exam was rescheduled"</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <CardDescription>
            Important announcements get lost in WhatsApp groups. Get real-time alerts that actually
            reach you.
          </CardDescription>
          <Badge variant="outline" class="w-fit">
            <span class="text-primary font-semibold">Solved:</span>
            <span class="ml-2">Campus alerts</span>
          </Badge>
        </CardContent>
      </Card>

      <!-- Submission Proof -->
      <Card class="hover:shadow-lg hover:border-primary/50 transition-all">
        <CardHeader>
          <div class="flex items-start justify-between">
            <ClipboardList class="text-primary" size={24} />
          </div>
          <CardTitle class="text-lg sm:text-xl">"The lecturer said I never submitted"</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <CardDescription>
            Physical submissions have no proof. Timestamp your hand-in with photo evidence. End the
            blame game.
          </CardDescription>
          <Badge variant="outline" class="w-fit">
            <span class="text-primary font-semibold">Solved:</span>
            <span class="ml-2">Submission logbook</span>
          </Badge>
        </CardContent>
      </Card>

      <!-- Campus Safety -->
      <Card class="hover:shadow-lg hover:border-primary/50 transition-all">
        <CardHeader>
          <div class="flex items-start justify-between">
            <Footprints class="text-primary" size={24} />
          </div>
          <CardTitle class="text-lg sm:text-xl">"Walking back from library at 10pm is risky"</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <CardDescription>
            Share your walk with trusted friends. If you don't check in, they get notified. Campus
            safety, built in.
          </CardDescription>
          <Badge variant="outline" class="w-fit">
            <span class="text-primary font-semibold">Solved:</span>
            <span class="ml-2">Safe-walk</span>
          </Badge>
        </CardContent>
      </Card>

      <!-- Events -->
      <Card class="hover:shadow-lg hover:border-primary/50 transition-all">
        <CardHeader>
          <div class="flex items-start justify-between">
            <Calendar class="text-primary" size={24} />
          </div>
          <CardTitle class="text-lg sm:text-xl">"I missed the department's career talk"</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <CardDescription>
            Events get announced once on a notice board. Get every departmental lecture, seminar,
            and deadline in one calendar.
          </CardDescription>
          <Badge variant="outline" class="w-fit">
            <span class="text-primary font-semibold">Solved:</span>
            <span class="ml-2">Events hub</span>
          </Badge>
        </CardContent>
      </Card>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════════════════════════════
     FLEXIBLE STRUCTURE
     ════════════════════════════════════════════════════════════════════════════════ -->
<section class="py-16 sm:py-20 px-4 sm:px-6 md:px-12 overflow-hidden">
  <div class="w-full max-w-7xl mx-auto space-y-10 sm:space-y-12">
    <!-- Header -->
    <div class="text-center space-y-3 sm:space-y-4 px-4 sm:px-0">
      <Badge variant="secondary" class="mx-auto">Built for every university</Badge>
      <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold">One platform. Any structure.</h2>
      <p class="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
        Faculty, College, Department, Level — whatever your university calls it, Sabify adapts.
      </p>
    </div>

    <!-- Structure Cards -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      <Card class="text-center">
        <CardHeader>
          <div class="flex justify-center mb-4">
            <div class="p-3 rounded-lg bg-primary/10">
              <Building2 class="text-primary" size={28} />
            </div>
          </div>
          <CardTitle>Faculty</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <CardDescription>For universities that organize by Faculty → Department</CardDescription>
          <Badge variant="outline">Faculty of Science → Computer Science</Badge>
        </CardContent>
      </Card>

      <Card class="text-center">
        <CardHeader>
          <div class="flex justify-center mb-4">
            <div class="p-3 rounded-lg bg-primary/10">
              <GraduationCap class="text-primary" size={28} />
            </div>
          </div>
          <CardTitle>College</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <CardDescription>For universities that organize by College → Department</CardDescription>
          <Badge variant="outline">College of Engineering → Electrical Eng.</Badge>
        </CardContent>
      </Card>

      <Card class="text-center">
        <CardHeader>
          <div class="flex justify-center mb-4">
            <div class="p-3 rounded-lg bg-primary/10">
              <Layers class="text-primary" size={28} />
            </div>
          </div>
          <CardTitle>Levels &amp; More</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <CardDescription>100L to 500L. Even custom hierarchies your school uses.</CardDescription>
          <Badge variant="outline">Department → Level → Course</Badge>
        </CardContent>
      </Card>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════════════════════════════
     FEATURES (TABS)
     ════════════════════════════════════════════════════════════════════════════════ -->
<section class="py-16 sm:py-20 px-4 sm:px-6 md:px-12 bg-muted/30 overflow-hidden">
  <div class="w-full max-w-7xl mx-auto space-y-10 sm:space-y-12">
    <!-- Header -->
    <div class="text-center space-y-3 sm:space-y-4 px-4 sm:px-0">
      <Badge variant="secondary" class="mx-auto">Everything you need</Badge>
      <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold">Sabify's core features</h2>
    </div>

    <!-- Tabs -->
    <Tabs defaultValue="vault" class="w-full">
      <TabsList class="grid w-full sm:w-fit mx-auto grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-2 bg-muted/50 rounded-xl border border-border/50">
        <TabsTrigger 
          value="vault" 
          class="group flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-lg border border-transparent transition-all duration-200 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:border-amber-600 data-[state=active]:shadow-md hover:bg-amber-500/10 hover:border-amber-500/30 data-[state=inactive]:text-muted-foreground"
        >
          <div class="p-1.5 rounded-md bg-amber-500/10 group-data-[state=active]:bg-white/20">
            <BookOpen class="text-amber-600 group-data-[state=active]:text-white" size={18} />
          </div>
          <span class="text-sm font-semibold">Vault</span>
        </TabsTrigger>

        <TabsTrigger 
          value="events" 
          class="group flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-lg border border-transparent transition-all duration-200 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=active]:shadow-md hover:bg-blue-500/10 hover:border-blue-500/30 data-[state=inactive]:text-muted-foreground"
        >
          <div class="p-1.5 rounded-md bg-blue-500/10 group-data-[state=active]:bg-white/20">
            <Calendar class="text-blue-600 group-data-[state=active]:text-white" size={18} />
          </div>
          <span class="text-sm font-semibold">Events</span>
        </TabsTrigger>

        <TabsTrigger 
          value="pay" 
          class="group flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-lg border border-transparent transition-all duration-200 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:border-emerald-600 data-[state=active]:shadow-md hover:bg-emerald-500/10 hover:border-emerald-500/30 data-[state=inactive]:text-muted-foreground"
        >
          <div class="p-1.5 rounded-md bg-emerald-500/10 group-data-[state=active]:bg-white/20">
            <CreditCard class="text-emerald-600 group-data-[state=active]:text-white" size={18} />
          </div>
          <span class="text-sm font-semibold">Pay</span>
        </TabsTrigger>

        <TabsTrigger 
          value="shield" 
          class="group flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-lg border border-transparent transition-all duration-200 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:border-rose-600 data-[state=active]:shadow-md hover:bg-rose-500/10 hover:border-rose-500/30 data-[state=inactive]:text-muted-foreground"
        >
          <div class="p-1.5 rounded-md bg-rose-500/10 group-data-[state=active]:bg-white/20">
            <Shield class="text-rose-600 group-data-[state=active]:text-white" size={18} />
          </div>
          <span class="text-sm font-semibold">Shield</span>
        </TabsTrigger>
      </TabsList>

      <!-- Vault Tab -->
      <TabsContent value="vault" class="space-y-8 mt-8">
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card class="border-l-4 border-l-amber-400">
            <CardHeader>
              <BookOpen class="text-amber-600 mb-2" size={24} />
              <CardTitle>Past Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Years of exams from your department. Searchable. Downloadable. No more WhatsApp
                scavenger hunts.
              </CardDescription>
              <Badge class="mt-4 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Type [T]</Badge>
            </CardContent>
          </Card>

          <Card class="border-l-4 border-l-amber-400">
            <CardHeader>
              <File class="text-amber-600 mb-2" size={24} />
              <CardTitle>Assignment Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Every assignment from every course. Submit with timestamped proof. No more
                "missing script" disputes.
              </CardDescription>
              <Badge class="mt-4 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Type [A]</Badge>
            </CardContent>
          </Card>

          <Card class="border-l-4 border-l-amber-400">
            <CardHeader>
              <Library class="text-amber-600 mb-2" size={24} />
              <CardTitle>Textbooks &amp; Handouts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                OCR-powered. Search inside scanned handouts. Pin for offline access. Your library,
                anywhere.
              </CardDescription>
              <Badge class="mt-4 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Type [B]</Badge>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <!-- Events Tab -->
      <TabsContent value="events" class="space-y-8 mt-8">
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card class="border-l-4 border-l-blue-400">
            <CardHeader>
              <Calendar class="text-blue-600 mb-2" size={24} />
              <CardTitle>University Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Every lecture, test, and deadline from your faculty or college. Automatically
                synced.
              </CardDescription>
            </CardContent>
          </Card>

          <Card class="border-l-4 border-l-blue-400">
            <CardHeader>
              <Megaphone class="text-blue-600 mb-2" size={24} />
              <CardTitle>Student Union Events</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Cultural day. Sports fiesta. Career fairs. Never hear about it the day after.
              </CardDescription>
            </CardContent>
          </Card>

          <Card class="border-l-4 border-l-blue-400">
            <CardHeader>
              <Bell class="text-blue-600 mb-2" size={24} />
              <CardTitle>Smart Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get notified 24 hours before any event. No more "I forgot" excuses.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <!-- Pay Tab -->
      <TabsContent value="pay" class="space-y-8 mt-8">
        <div class="grid sm:grid-cols-2 gap-4 sm:gap-6">
          <Card class="border-l-4 border-l-emerald-400">
            <CardHeader>
              <CreditCard class="text-emerald-600 mb-2" size={24} />
              <CardTitle>Pay Any Due</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Paystack and Flutterwave. Pay once. Get your QR receipt instantly.
              </CardDescription>
            </CardContent>
          </Card>

          <Card class="border-l-4 border-l-emerald-400">
            <CardHeader>
              <QrCode class="text-emerald-600 mb-2" size={24} />
              <CardTitle>Tamper-Proof Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Verifiable by any department or faculty treasurer. Audits become instant, not
                painful.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <!-- Shield Tab -->
      <TabsContent value="shield" class="space-y-8 mt-8">
        <div class="grid sm:grid-cols-2 gap-4 sm:gap-6">
          <Card class="border-l-4 border-l-rose-400">
            <CardHeader>
              <Bell class="text-rose-600 mb-2" size={24} />
              <CardTitle>Emergency Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Encrypted campus-wide notifications. Security incidents. Power outages. Exam
                changes. Instant.
              </CardDescription>
            </CardContent>
          </Card>

          <Card class="border-l-4 border-l-rose-400">
            <CardHeader>
              <Footprints class="text-rose-600 mb-2" size={24} />
              <CardTitle>Safe-Walk</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Share your live location with 3 trusted friends. Auto-notify if you don't check
                in by ETA.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════════════════════════════
     CTA SECTION
     ════════════════════════════════════════════════════════════════════════════════ -->
<section class="py-16 sm:py-20 px-4 sm:px-6 md:px-12 overflow-hidden">
 <UniversityCTA />
</section>

<!-- Footer -->
<footer class="border-t border-border bg-card overflow-hidden">
  <div class="px-4 sm:px-6 md:px-12 lg:px-20 py-8 sm:py-12 max-w-7xl mx-auto">
    <div class="flex flex-col items-center gap-6 sm:gap-8 md:flex-row md:items-end md:justify-between">
      <div class="text-center md:text-left">
        <div class="mb-3 flex items-center justify-center gap-3 md:justify-start">
          <div class="flex size-8 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            S
          </div>
          <div class="font-semibold">Sabify</div>
        </div>
        <p class="text-sm text-muted-foreground">
          Everything Campus. One App.
        </p>
      </div>

      <div class="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Powered by</span>
        <span class="font-medium text-foreground">I3Hub</span>
      </div>
    </div>

    <div class="mt-8 sm:mt-12 border-t border-border pt-6 sm:pt-8 text-center text-xs text-muted-foreground/70">
      © {new Date().getFullYear()} Sabify. All rights reserved.
    </div>
  </div>
</footer>

</div>