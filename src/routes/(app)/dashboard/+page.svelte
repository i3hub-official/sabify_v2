<!-- src/routes/(app)/dashboard/components/StudentDashboard.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		AcademicMetrics,
		FinancialMetrics,
		EngagementMetrics,
		SafetyMetrics,
		type StudentDashboardMetrics
	} from '$lib/services/student-dashboard.service.js';

	import {
		BookOpen,
		Clock,
		TrendingUp,
		Calendar,
		CreditCard,
		Receipt,
		AlertCircle,
		LogIn,
		CalendarCheck,
		FolderUp,
		CheckCircle,
		Shield,
		Phone,
		PersonStanding,
		Bell,
		User,
		Building,
		GraduationCap,
		BarChart3,
		Activity,
		Wallet,
		Users,
		FileText,
		Download,
		Eye,
		ChevronRight
	} from '@lucide/svelte';

	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	const { metrics = null, loading = false, error = null } = $props() as {
		metrics?: StudentDashboardMetrics | null;
		loading?: boolean;
		error?: string | null;
	};

	// Format currency
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-NG', {
			style: 'currency',
			currency: 'NGN',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	// Format date
	function formatDate(date: Date | string | null): string {
		if (!date) return 'N/A';
		const d = typeof date === 'string' ? new Date(date) : date;
		return new Intl.DateTimeFormat('en-NG', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		}).format(d);
	}

	// Format relative time
	function getRelativeTime(date: Date | string | null): string {
		if (!date) return 'N/A';
		const d = typeof date === 'string' ? new Date(date) : date;
		const now = new Date();
		const diff = now.getTime() - d.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;
		if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
		return formatDate(d);
	}

	// GPA color
	function getGpaColor(gpa: number | null): string {
		if (gpa === null) return 'text-muted-foreground';
		if (gpa >= 4.5) return 'text-emerald-500';
		if (gpa >= 3.5) return 'text-blue-500';
		if (gpa >= 2.5) return 'text-yellow-500';
		if (gpa >= 1.5) return 'text-orange-500';
		return 'text-red-500';
	}

	// Progress color
	function getProgressColor(value: number): string {
		if (value >= 80) return 'bg-emerald-500';
		if (value >= 60) return 'bg-blue-500';
		if (value >= 40) return 'bg-yellow-500';
		return 'bg-red-500';
	}
</script>

{#if error}
	<div class="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center">
		<AlertCircle class="size-12 text-destructive" />
		<h3 class="text-lg font-semibold text-destructive">Failed to load dashboard</h3>
		<p class="text-sm text-muted-foreground">{error}</p>
		<Button variant="outline" onclick={() => window.location.reload()}>Retry</Button>
	</div>
{:else if loading}
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Skeleton cards -->
		{#each Array(4) as _}
			<Card>
				<CardHeader class="space-y-1">
					<Skeleton class="h-4 w-24" />
				</CardHeader>
				<CardContent>
					<Skeleton class="h-8 w-16" />
					<Skeleton class="mt-2 h-3 w-32" />
				</CardContent>
			</Card>
		{/each}
	</div>
	<div class="mt-6 grid gap-6 md:grid-cols-2">
		{#each Array(2) as _}
			<Card>
				<CardHeader>
					<Skeleton class="h-5 w-32" />
				</CardHeader>
				<CardContent class="space-y-4">
					{#each Array(4) as _}
						<div class="flex items-center justify-between">
							<Skeleton class="h-4 w-24" />
							<Skeleton class="h-4 w-16" />
						</div>
					{/each}
				</CardContent>
			</Card>
		{/each}
	</div>
{:else if metrics}
	<!-- Student Header -->
	<div class="mb-6 rounded-lg border border-border bg-card p-6">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div class="flex items-center gap-4">
				<div class="flex size-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
					{metrics.student.firstName?.[0]}{metrics.student.surname?.[0]}
				</div>
				<div>
					<h1 class="text-2xl font-bold">
						{metrics.student.firstName} {metrics.student.surname}
					</h1>
					<div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
						<span>{metrics.student.matricNumber}</span>
						<span class="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
						<span>{metrics.student.department.name}</span>
						<span class="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
						<span>Level {metrics.student.currentLevel}</span>
						<span class="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
						<span>{metrics.university.name}</span>
					</div>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Badge variant="outline" class="gap-1">
					<Activity class="size-3" />
					Updated {getRelativeTime(metrics.calculatedAt)}
				</Badge>
				<Button variant="ghost" size="sm" onclick={() => window.location.reload()}>
					Refresh
				</Button>
			</div>
		</div>
	</div>

	<!-- Quick Stats -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- GPA -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Current GPA</CardTitle>
				<GraduationCap class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold {getGpaColor(metrics.academic.gpa)}">
					{metrics.academic.gpa?.toFixed(2) ?? '—'}
				</div>
				<p class="text-xs text-muted-foreground">
					{metrics.academic.enrolledCourses} courses enrolled
				</p>
			</CardContent>
		</Card>

		<!-- Submission Rate -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Submission Rate</CardTitle>
				<BarChart3 class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{metrics.academic.submissionRate}%</div>
				<div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
					<div
						class="h-full rounded-full transition-all {getProgressColor(metrics.academic.submissionRate)}"
						style="width: {metrics.academic.submissionRate}%"
					></div>
				</div>
				<p class="mt-1 text-xs text-muted-foreground">
					{metrics.academic.unsubmittedAssignments} assignments pending
				</p>
			</CardContent>
		</Card>

		<!-- Financial -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Outstanding Balance</CardTitle>
				<Wallet class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold text-amber-500">
					{formatCurrency(metrics.financial.outstandingAmount)}
				</div>
				<p class="text-xs text-muted-foreground">
					{metrics.financial.receiptCount} receipts • Last paid {getRelativeTime(metrics.financial.lastPaymentDate)}
				</p>
			</CardContent>
		</Card>

		<!-- Login Streak -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Login Streak</CardTitle>
				<LogIn class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{metrics.engagement.loginStreak}</div>
				<p class="text-xs text-muted-foreground">
					days • Last login {getRelativeTime(metrics.engagement.lastLogin)}
				</p>
			</CardContent>
		</Card>
	</div>

	<!-- Main Grid -->
	<div class="mt-6 grid gap-6 md:grid-cols-2">
		<!-- Upcoming Deadlines -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Clock class="size-4" />
					Upcoming Deadlines
				</CardTitle>
				<CardDescription>Assignments due in the next 2 weeks</CardDescription>
			</CardHeader>
			<CardContent>
				{#if metrics.academic.upcomingDeadlines.length === 0}
					<div class="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
						<CheckCircle class="size-12 text-emerald-500" />
						<p class="mt-2 font-medium">All caught up!</p>
						<p class="text-sm">No upcoming deadlines</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each metrics.academic.upcomingDeadlines as deadline}
							<div class="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/40">
								<div class="min-w-0 flex-1">
									<p class="font-medium truncate">{deadline.courseName}</p>
									<p class="text-sm text-muted-foreground">{deadline.courseCode}</p>
								</div>
								<div class="ml-4 shrink-0 text-right">
									{#if deadline.daysUntilDue <= 1}
										<Badge variant="destructive" class="text-xs">Due today</Badge>
									{:else if deadline.daysUntilDue <= 3}
										<Badge variant="destructive" class="text-xs">Urgent</Badge>
									{:else if deadline.daysUntilDue <= 7}
										<Badge variant="secondary" class="text-xs">Soon</Badge>
									{:else}
										<Badge variant="outline" class="text-xs">{deadline.daysUntilDue} days</Badge>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
			<CardFooter>
				<Button variant="ghost" class="w-full text-sm" onclick={() => goto('/courses')}>
					View all courses
					<ChevronRight class="ml-2 size-4" />
				</Button>
			</CardFooter>
		</Card>

		<!-- Financial Breakdown -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<CreditCard class="size-4" />
					Financial Summary
				</CardTitle>
				<CardDescription>Departmental dues breakdown</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<!-- Totals -->
					<div class="grid grid-cols-3 gap-4 rounded-lg bg-muted/40 p-3 text-center">
						<div>
							<p class="text-sm text-muted-foreground">Total Dues</p>
							<p class="text-lg font-bold">{formatCurrency(metrics.financial.totalDues)}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Paid</p>
							<p class="text-lg font-bold text-emerald-500">{formatCurrency(metrics.financial.paidAmount)}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Outstanding</p>
							<p class="text-lg font-bold text-amber-500">{formatCurrency(metrics.financial.outstandingAmount)}</p>
						</div>
					</div>

					<!-- Breakdown -->
					{#each metrics.financial.departmentalBreakdown as dept}
						<div class="flex items-center justify-between">
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium truncate">{dept.departmentName}</p>
								<p class="text-xs text-muted-foreground">{formatCurrency(dept.amount)}</p>
							</div>
							<Badge variant={dept.paid ? 'default' : 'secondary'}>
								{dept.paid ? 'Paid' : 'Pending'}
							</Badge>
						</div>
					{/each}
				</div>
			</CardContent>
			<CardFooter>
				<Button variant="ghost" class="w-full text-sm" onclick={() => goto('/payments')}>
					View payment history
					<ChevronRight class="ml-2 size-4" />
				</Button>
			</CardFooter>
		</Card>

		<!-- Engagement -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Activity class="size-4" />
					Engagement
				</CardTitle>
				<CardDescription>Your activity across the platform</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="grid grid-cols-2 gap-4">
					<div class="rounded-lg border border-border p-3 text-center">
						<CalendarCheck class="mx-auto mb-2 size-5 text-muted-foreground" />
						<p class="text-2xl font-bold">{metrics.engagement.eventsAttended}</p>
						<p class="text-xs text-muted-foreground">Events attended</p>
					</div>
					<div class="rounded-lg border border-border p-3 text-center">
						<Calendar class="mx-auto mb-2 size-5 text-muted-foreground" />
						<p class="text-2xl font-bold">{metrics.engagement.upcomingEvents}</p>
						<p class="text-xs text-muted-foreground">Upcoming events</p>
					</div>
					<div class="rounded-lg border border-border p-3 text-center">
						<FolderUp class="mx-auto mb-2 size-5 text-muted-foreground" />
						<p class="text-2xl font-bold">{metrics.engagement.vaultUploads}</p>
						<p class="text-xs text-muted-foreground">Vault uploads</p>
					</div>
					<div class="rounded-lg border border-border p-3 text-center">
						<FileText class="mx-auto mb-2 size-5 text-muted-foreground" />
						<p class="text-2xl font-bold">{metrics.engagement.submissionsThisMonth}</p>
						<p class="text-xs text-muted-foreground">Submissions this month</p>
					</div>
				</div>
			</CardContent>
			<CardFooter>
				<Button variant="ghost" class="w-full text-sm" onclick={() => goto('/profile')}>
					View profile
					<ChevronRight class="ml-2 size-4" />
				</Button>
			</CardFooter>
		</Card>

		<!-- Safety -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Shield class="size-4" />
					Safety & Security
				</CardTitle>
				<CardDescription>Your safety features and alerts</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div class="rounded-lg border border-border p-3 text-center">
							<Phone class="mx-auto mb-2 size-5 text-muted-foreground" />
							<p class="text-2xl font-bold">{metrics.safety.emergencyContacts}</p>
							<p class="text-xs text-muted-foreground">Emergency contacts</p>
						</div>
						<div class="rounded-lg border border-border p-3 text-center">
							<PersonStanding class="mx-auto mb-2 size-5 text-muted-foreground" />
							<p class="text-2xl font-bold">
								{metrics.safety.safeWalkActive ? 'Active' : 'Inactive'}
							</p>
							<p class="text-xs text-muted-foreground">SafeWalk status</p>
						</div>
					</div>

					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-sm text-muted-foreground">Last SafeWalk check-in</span>
							<span class="text-sm font-medium">
								{getRelativeTime(metrics.safety.lastSafeWalkCheckin)}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-muted-foreground">Alerts received</span>
							<span class="text-sm font-medium">{metrics.safety.alertsReceived}</span>
						</div>
					</div>
				</div>
			</CardContent>
			<CardFooter>
				<Button variant="ghost" class="w-full text-sm" onclick={() => goto('/shield')}>
					View safety settings
					<ChevronRight class="ml-2 size-4" />
				</Button>
			</CardFooter>
		</Card>
	</div>

	<!-- Quick Actions -->
	<div class="mt-6 grid gap-4 md:grid-cols-4">
		<Button variant="outline" class="h-auto flex-col gap-2 py-6" onclick={() => goto('/courses')}>
			<BookOpen class="size-6" />
			<span class="text-sm font-medium">My Courses</span>
		</Button>
		<Button variant="outline" class="h-auto flex-col gap-2 py-6" onclick={() => goto('/payments')}>
			<Receipt class="size-6" />
			<span class="text-sm font-medium">Payments</span>
		</Button>
		<Button variant="outline" class="h-auto flex-col gap-2 py-6" onclick={() => goto('/shield')}>
			<Shield class="size-6" />
			<span class="text-sm font-medium">Shield</span>
		</Button>
		<Button variant="outline" class="h-auto flex-col gap-2 py-6" onclick={() => goto('/vault')}>
			<FolderUp class="size-6" />
			<span class="text-sm font-medium">Vault</span>
		</Button>
	</div>
{/if}