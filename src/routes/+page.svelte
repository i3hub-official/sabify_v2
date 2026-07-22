<!-- src/routes/(marketing)/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme';
  import {
    BookOpen, FileText, ClipboardList, CreditCard, QrCode,
    Bell, Footprints, Calendar, Megaphone, Layers,
    ArrowRight, File, DollarSign, AlertTriangle,
    Library, Building2, GraduationCap, Sparkles,
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

  onMount(() => {
    theme.init();
  });

  let email = '';
  let isSubscribed = false;

  async function handleSubscribe(e: Event) {
    e.preventDefault();
    // TODO: Connect to your newsletter service
    isSubscribed = true;
    setTimeout(() => (isSubscribed = false), 3000);
  }

  const faqs = [
    {
      q: 'What universities does Sabify support?',
      a: 'Sabify is built to work with any Nigerian and West African university structure. Whether you organize by Faculty, College, Department, or Levels, Sabify adapts. We currently support 100+ universities and are expanding weekly.'
    },
    {
      q: 'How does the submission proof work?',
      a: 'When you submit an assignment through Sabify, we timestamp it with photo evidence. Your submission is hashed and stored immutably. No more "I never received it" disputes.'
    },
    {
      q: 'Is my payment receipt really tamper-proof?',
      a: 'Yes. Each payment generates a QR receipt signed with institutional keys. Treasurers and department heads can verify it instantly. No more manual ledger searches.'
    },
    {
      q: 'Can my university customize Sabify?',
      a: 'Absolutely. Sabify is white-labelable. Your university can brand it with your logo, colors, and custom workflows. Contact our sales team for enterprise plans.'
    },
    {
      q: 'How private is my data?',
      a: 'Very. We encrypt all personally identifiable information at rest and in transit. Your past questions, payment history, and location data are yours. We never sell data.'
    },
    {
      q: 'Is there a student cost?',
      a: 'Sabify is free for students. Universities pay an institutional subscription per semester. Some departments may charge small fees for premium features.'
    }
  ];
</script>

<svelte:head>
  <title>Sabify — Everything Campus. One App.</title>
  <meta
    name="description"
    content="The academic platform for Nigerian and West African university students. Past questions, departmental dues, campus safety, events, and more."
  />
</svelte:head>

<!-- ════════════════════════════════════════════════════════════════════════════════
     HERO
     ════════════════════════════════════════════════════════════════════════════════ -->
<section class="relative min-h-screen flex items-center justify-center px-4 py-20">
  <div class="absolute inset-0 -z-10">
    <div
      class="absolute top-20 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none"
    ></div>
    <div
      class="absolute -bottom-20 left-1/3 w-96 h-96 bg-primary/3 rounded-full blur-3xl pointer-events-none"
    ></div>
  </div>

  <div class="max-w-3xl mx-auto text-center space-y-8">
       <!-- Headline -->
    <div class="space-y-4">
      <h1 class="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight">
        Everything Campus.<br />
        <span class="italic text-primary">One App.</span>
      </h1>
      <p class="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        Past questions. Departmental dues. Campus safety. Events. Assignments. Textbooks.
        Everything your university never gave you—now in one platform.
      </p>
    </div>

    <!-- CTA Buttons -->
    <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
      <Button size="lg" class="gap-2 h-12 px-8" onclick={() => goto('/signup')}>
        Get started <ArrowRight size={18} />
      </Button>
      <Button size="lg" variant="outline" class="h-12 px-8" onclick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
        See how it works
      </Button>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════════════════════════════
     REAL PROBLEMS
     ════════════════════════════════════════════════════════════════════════════════ -->
<section class="py-20 px-4 bg-muted/30" id="features">
  <div class="max-w-6xl mx-auto space-y-12">
    <!-- Header -->
    <div class="text-center space-y-4">
      <Badge variant="secondary" class="mx-auto">Real problems. Real solutions.</Badge>
      <h2 class="text-4xl md:text-5xl font-bold">What actually breaks at Nigerian universities</h2>
      <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
        We asked students across West Africa. Here's what they said.
      </p>
    </div>

    <!-- Problems Grid -->
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Past Questions -->
      <Card class="hover:shadow-lg hover:border-primary/50 transition-all">
        <CardHeader>
          <div class="flex items-start justify-between">
            <FileText class="text-primary" size={24} />
          </div>
          <CardTitle class="text-xl">"Who has last year's past question?"</CardTitle>
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
          <CardTitle class="text-xl">"I paid my dues, where's my receipt?"</CardTitle>
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
          <CardTitle class="text-xl">"No one told me the exam was rescheduled"</CardTitle>
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
          <CardTitle class="text-xl">"The lecturer said I never submitted"</CardTitle>
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
          <CardTitle class="text-xl">"Walking back from library at 10pm is risky"</CardTitle>
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
          <CardTitle class="text-xl">"I missed the department's career talk"</CardTitle>
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
<section class="py-20 px-4">
  <div class="max-w-6xl mx-auto space-y-12">
    <!-- Header -->
    <div class="text-center space-y-4">
      <Badge variant="secondary" class="mx-auto">Built for every university</Badge>
      <h2 class="text-4xl md:text-5xl font-bold">One platform. Any structure.</h2>
      <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
        Faculty, College, Department, Level — whatever your university calls it, Sabify adapts.
      </p>
    </div>

    <!-- Structure Cards -->
    <div class="grid md:grid-cols-3 gap-6">
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
<section class="py-20 px-4 bg-muted/30">
  <div class="max-w-6xl mx-auto space-y-12">
    <!-- Header -->
    <div class="text-center space-y-4">
      <Badge variant="secondary" class="mx-auto">Everything you need</Badge>
      <h2 class="text-4xl md:text-5xl font-bold">Sabify's core features</h2>
    </div>

    <!-- Tabs -->
    <Tabs defaultValue="vault" class="w-full">
      <TabsList class="grid w-full md:w-fit mx-auto md:grid-cols-4">
        <TabsTrigger value="vault">Vault</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="pay">Pay</TabsTrigger>
        <TabsTrigger value="shield">Shield</TabsTrigger>
      </TabsList>

      <!-- Vault Tab -->
      <TabsContent value="vault" class="space-y-8 mt-8">
        <div class="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <BookOpen class="text-primary mb-2" size={24} />
              <CardTitle>Past Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Years of exams from your department. Searchable. Downloadable. No more WhatsApp
                scavenger hunts.
              </CardDescription>
              <Badge class="mt-4">Type [T]</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <File class="text-primary mb-2" size={24} />
              <CardTitle>Assignment Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Every assignment from every course. Submit with timestamped proof. No more
                "missing script" disputes.
              </CardDescription>
              <Badge class="mt-4">Type [A]</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Library class="text-primary mb-2" size={24} />
              <CardTitle>Textbooks &amp; Handouts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                OCR-powered. Search inside scanned handouts. Pin for offline access. Your library,
                anywhere.
              </CardDescription>
              <Badge class="mt-4">Type [B]</Badge>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <!-- Events Tab -->
      <TabsContent value="events" class="space-y-8 mt-8">
        <div class="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Calendar class="text-primary mb-2" size={24} />
              <CardTitle>University Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Every lecture, test, and deadline from your faculty or college. Automatically
                synced.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Megaphone class="text-primary mb-2" size={24} />
              <CardTitle>Student Union Events</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Cultural day. Sports fiesta. Career fairs. Never hear about it the day after.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Bell class="text-primary mb-2" size={24} />
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
        <div class="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CreditCard class="text-primary mb-2" size={24} />
              <CardTitle>Pay Any Due</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Paystack and Flutterwave. Pay once. Get your QR receipt instantly.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <QrCode class="text-primary mb-2" size={24} />
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
        <div class="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Bell class="text-primary mb-2" size={24} />
              <CardTitle>Emergency Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Encrypted campus-wide notifications. Security incidents. Power outages. Exam
                changes. Instant.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Footprints class="text-primary mb-2" size={24} />
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
<section class="py-20 px-4">
  <div class="max-w-3xl mx-auto text-center space-y-8">
    <h2 class="text-4xl md:text-5xl font-bold">Ready to transform your university?</h2>
    <p class="text-lg text-muted-foreground">
      Join thousands of students who've stopped settling for less. Your university never gave you
      Sabify. But now you can have it.
    </p>
    <Button size="lg" class="gap-2 h-12 px-8" onclick={() => goto('/signup')}>
      Start for free <ArrowRight size={18} />
    </Button>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════════════════════════════
     NEWSLETTER
     ════════════════════════════════════════════════════════════════════════════════ -->
<section class="py-20 px-4 bg-muted/30">
  <div class="max-w-2xl mx-auto">
    <Card class="border-2">
      <CardHeader class="text-center space-y-2">
        <Mail class="mx-auto text-primary" size={32} />
        <CardTitle class="text-2xl">Stay in the loop</CardTitle>
        <CardDescription>
          Get updates on new features, universities launching, and campus stories from across
          Africa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onsubmit={handleSubscribe} class="space-y-3">
          <div class="flex gap-2">
            <Input
              type="email"
              placeholder="your@university.edu"
              bind:value={email}
              disabled={isSubscribed}
              required
            />
            <Button type="submit" disabled={isSubscribed}>
              {isSubscribed ? 'Subscribed!' : 'Subscribe'}
            </Button>
          </div>
          {#if isSubscribed}
            <p class="text-sm text-green-600 flex items-center gap-2">
              <Check size={16} /> Thanks for subscribing!
            </p>
          {/if}
        </form>
      </CardContent>
    </Card>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════════════════════════════
     FAQ
     ════════════════════════════════════════════════════════════════════════════════ -->
<section class="py-20 px-4">
  <div class="max-w-3xl mx-auto space-y-12">
    <!-- Header -->
    <div class="text-center space-y-4">
      <Badge variant="secondary" class="mx-auto">Questions?</Badge>
      <h2 class="text-4xl md:text-5xl font-bold">Frequently asked</h2>
    </div>

    <!-- FAQ Accordion -->
    <Accordion type="single" collapsible class="w-full">
      {#each faqs as faq, idx (idx)}
        <AccordionItem value={`item-${idx}`}>
          <AccordionTrigger class="hover:no-underline text-left">
            {faq.q}
          </AccordionTrigger>
          <AccordionContent class="text-base leading-relaxed">
            {faq.a}
          </AccordionContent>
        </AccordionItem>
      {/each}
    </Accordion>

    <!-- More Help -->
    <div class="text-center pt-8">
      <p class="text-muted-foreground mb-4">Still have questions?</p>
      <Button variant="outline" class="gap-2">
        Contact our team <ArrowRight size={16} />
      </Button>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════════════════════════════
     FOOTER
     ════════════════════════════════════════════════════════════════════════════════ -->
<footer class="border-t bg-muted/30 py-12 px-4">
  <div class="max-w-6xl mx-auto">
    <div class="grid md:grid-cols-4 gap-8 mb-8">
      <!-- Brand -->
      <div class="space-y-2">
        <h3 class="font-bold text-lg">Sabify</h3>
        <p class="text-sm text-muted-foreground italic">Everything Campus. One App.</p>
      </div>

      <!-- Product -->
      <div class="space-y-3">
        <h4 class="font-semibold text-sm">Product</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="#" class="text-muted-foreground hover:text-primary transition">Features</a></li>
          <li><a href="#" class="text-muted-foreground hover:text-primary transition">Pricing</a></li>
          <li><a href="#" class="text-muted-foreground hover:text-primary transition">For Universities</a></li>
        </ul>
      </div>

      <!-- Company -->
      <div class="space-y-3">
        <h4 class="font-semibold text-sm">Company</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="#" class="text-muted-foreground hover:text-primary transition">About</a></li>
          <li><a href="#" class="text-muted-foreground hover:text-primary transition">Blog</a></li>
          <li><a href="#" class="text-muted-foreground hover:text-primary transition">Contact</a></li>
        </ul>
      </div>

      <!-- Legal -->
      <div class="space-y-3">
        <h4 class="font-semibold text-sm">Legal</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="#" class="text-muted-foreground hover:text-primary transition">Privacy</a></li>
          <li><a href="#" class="text-muted-foreground hover:text-primary transition">Terms</a></li>
          <li><a href="#" class="text-muted-foreground hover:text-primary transition">Cookie policy</a></li>
        </ul>
      </div>
    </div>

    <Separator class="my-8" />

    <!-- Bottom -->
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
      <p>&copy; 2025 Sabify. All rights reserved.</p>
      <div class="flex gap-6">
        <a href="#" class="hover:text-primary transition">Twitter</a>
        <a href="#" class="hover:text-primary transition">LinkedIn</a>
        <a href="#" class="hover:text-primary transition">Instagram</a>
      </div>
    </div>
  </div>
</footer>