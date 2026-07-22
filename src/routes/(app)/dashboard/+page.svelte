// File: src/routes/(app)/dashboard/+page.svelte

<script lang="ts">
	interface StatCard {
		label: string;
		value: string | number;
		change?: string;
		trend?: 'up' | 'down';
	}

	interface DashboardData {
		role: 'student' | 'lecturer' | 'admin' | 'owner';
		stats: StatCard[];
		recentActivity: Activity[];
		upcomingEvents: CalendarEvent[];
	}

	interface Activity {
		id: string;
		title: string;
		description: string;
		timestamp: string;
		type: 'submission' | 'grade' | 'alert' | 'payment';
	}

	interface CalendarEvent {
		id: string;
		title: string;
		date: string;
		time: string;
		type: 'exam' | 'class' | 'deadline' | 'event';
	}

	// Mock data - replace with actual data
	const dashboardData: DashboardData = {
		role: 'student',
		stats: [
			{ label: 'GPA', value: '3.85', change: '+0.15', trend: 'up' },
			{ label: 'Courses', value: '6', change: 'On track', trend: 'up' },
			{ label: 'Submissions', value: '24/24', change: 'Complete', trend: 'up' },
			{ label: 'Pending Balance', value: '₦12,500', change: 'Due in 7 days', trend: 'down' }
		],
		recentActivity: [
			{
				id: '1',
				title: 'Grade Posted',
				description: 'English Literature CA1 - 18/20',
				timestamp: '2 hours ago',
				type: 'grade'
			},
			{
				id: '2',
				title: 'Assignment Submitted',
				description: 'Calculus Assignment 3',
				timestamp: '1 day ago',
				type: 'submission'
			},
			{
				id: '3',
				title: 'Payment Received',
				description: 'First semester tuition payment processed',
				timestamp: '3 days ago',
				type: 'payment'
			},
			{
				id: '4',
				title: 'New Alert',
				description: 'Examination timetable for 200L courses released',
				timestamp: '5 days ago',
				type: 'alert'
			}
		],
		upcomingEvents: [
			{ id: '1', title: 'Calculus Exam', date: 'Dec 15', time: '10:00 AM', type: 'exam' },
			{ id: '2', title: 'Literature Assignment Due', date: 'Dec 12', time: '11:59 PM', type: 'deadline' },
			{ id: '3', title: 'Physics Practical', date: 'Dec 18', time: '2:00 PM', type: 'class' }
		]
	};

	function getActivityIcon(type: Activity['type']) {
		const icons = {
			submission: '📤',
			grade: '📊',
			alert: '📢',
			payment: '💳'
		};
		return icons[type];
	}

	function getEventTypeColor(type: CalendarEvent['type']) {
		const colors = {
			exam: '#dc2626',
			class: '#2563eb',
			deadline: '#f59e0b',
			event: '#10b981'
		};
		return colors[type];
	}
</script>

<div class="dashboard">
	<div class="dashboard-header">
		<div>
			<h1>Welcome back, John!</h1>
			<p>Here's what's happening with your account today</p>
		</div>
		<div class="header-actions">
			<button class="btn-secondary">Download Report</button>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="stats-grid">
		{#each dashboardData.stats as stat}
			<div class="stat-card">
				<div class="stat-header">
					<span class="stat-label">{stat.label}</span>
					{#if stat.trend}
						<span class="stat-trend" class:up={stat.trend === 'up'} class:down={stat.trend === 'down'}>
							{#if stat.trend === 'up'}
								<svg viewBox="0 0 24 24" fill="currentColor">
									<path d="M7 14s1.5 2 5 2 5-2 5-2M9 9h.01M15 9h.01" />
								</svg>
							{:else}
								<svg viewBox="0 0 24 24" fill="currentColor">
									<path d="M7 10s1.5-2 5-2 5 2 5 2M9 15h.01M15 15h.01" />
								</svg>
							{/if}
		{stat.change}
						</span>
					{/if}
				</div>
				<div class="stat-value">{stat.value}</div>
			</div>
		{/each}
	</div>

	<div class="dashboard-grid">
		<!-- Recent Activity -->
		<div class="card activity-card">
			<div class="card-header">
				<h3>Recent Activity</h3>
				<a href="/notifications" class="link-small">View all</a>
			</div>
			<div class="activity-list">
				{#each dashboardData.recentActivity as activity}
					<div class="activity-item">
						<div class="activity-icon">{getActivityIcon(activity.type)}</div>
						<div class="activity-content">
							<div class="activity-title">{activity.title}</div>
							<div class="activity-description">{activity.description}</div>
							<div class="activity-timestamp">{activity.timestamp}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Upcoming Events -->
		<div class="card events-card">
			<div class="card-header">
				<h3>Upcoming Events</h3>
				<a href="/events" class="link-small">View calendar</a>
			</div>
			<div class="events-list">
				{#each dashboardData.upcomingEvents as event}
					<div class="event-item">
						<div class="event-indicator" style="background-color: {getEventTypeColor(event.type)}" />
						<div class="event-content">
							<div class="event-title">{event.title}</div>
							<div class="event-time">
								<svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor">
									<circle cx="12" cy="12" r="10" />
									<polyline points="12 6 12 12 16 14" />
								</svg>
								{event.date} • {event.time}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="quick-actions">
		<h3>Quick Actions</h3>
		<div class="actions-grid">
			<a href="/courses" class="action-card">
				<span class="action-icon">📚</span>
				<div>
					<div class="action-title">My Courses</div>
					<div class="action-subtitle">View enrolled courses</div>
				</div>
			</a>
			<a href="/vault" class="action-card">
				<span class="action-icon">📁</span>
				<div>
					<div class="action-title">Vault</div>
					<div class="action-subtitle">Access learning materials</div>
				</div>
			</a>
			<a href="/payments" class="action-card">
				<span class="action-icon">💳</span>
				<div>
					<div class="action-title">Payments</div>
					<div class="action-subtitle">Manage fees & payments</div>
				</div>
			</a>
			<a href="/support" class="action-card">
				<span class="action-icon">💬</span>
				<div>
					<div class="action-title">Support</div>
					<div class="action-subtitle">Get help & contact support</div>
				</div>
			</a>
		</div>
	</div>
</div>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
	}

	.dashboard-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #1a1a1a;
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.5px;
	}

	.dashboard-header p {
		font-size: 0.95rem;
		color: #666;
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 1rem;
	}

	.btn-secondary {
		padding: 0.75rem 1.5rem;
		background: white;
		border: 1px solid #d4cec3;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-secondary:hover {
		background: #f5f5f5;
		border-color: #c4beb3;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1.5rem;
	}

	.stat-card {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		border: 1px solid #e5e0d8;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.stat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.stat-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat-trend {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.stat-trend.up {
		background: #ecfdf5;
		color: #10b981;
	}

	.stat-trend.down {
		background: #fef2f2;
		color: #dc2626;
	}

	.stat-trend svg {
		width: 12px;
		height: 12px;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: #1a1a1a;
		letter-spacing: -0.3px;
	}

	/* Dashboard Grid */
	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
		gap: 2rem;
	}

	.card {
		background: white;
		border-radius: 8px;
		border: 1px solid #e5e0d8;
		display: flex;
		flex-direction: column;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e0d8;
	}

	.card-header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: #1a1a1a;
	}

	.link-small {
		font-size: 0.875rem;
		color: #2c5aa0;
		text-decoration: none;
		font-weight: 600;
		transition: color 150ms ease;
	}

	.link-small:hover {
		color: #1a3a5c;
	}

	/* Activity List */
	.activity-card {
		flex: 1;
	}

	.activity-list {
		padding: 0;
		display: flex;
		flex-direction: column;
		max-height: 400px;
		overflow-y: auto;
	}

	.activity-item {
		display: flex;
		gap: 1rem;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #f0ede8;
		transition: background 150ms ease;
	}

	.activity-item:last-child {
		border-bottom: none;
	}

	.activity-item:hover {
		background: #f8f7f5;
	}

	.activity-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
		width: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.activity-content {
		flex: 1;
	}

	.activity-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: #1a1a1a;
		margin-bottom: 0.25rem;
	}

	.activity-description {
		font-size: 0.875rem;
		color: #666;
		margin-bottom: 0.5rem;
	}

	.activity-timestamp {
		font-size: 0.75rem;
		color: #999;
	}

	/* Events List */
	.events-card {
		flex: 1;
	}

	.events-list {
		padding: 0;
		display: flex;
		flex-direction: column;
		max-height: 400px;
		overflow-y: auto;
	}

	.event-item {
		display: flex;
		gap: 1rem;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #f0ede8;
		align-items: flex-start;
		transition: background 150ms ease;
	}

	.event-item:last-child {
		border-bottom: none;
	}

	.event-item:hover {
		background: #f8f7f5;
	}

	.event-indicator {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		margin-top: 0.5rem;
		flex-shrink: 0;
	}

	.event-content {
		flex: 1;
	}

	.event-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: #1a1a1a;
		margin-bottom: 0.5rem;
	}

	.event-time {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #666;
	}

	.icon-small {
		width: 14px;
		height: 14px;
	}

	/* Quick Actions */
	.quick-actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.quick-actions h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: #1a1a1a;
	}

	.actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.action-card {
		background: white;
		border: 1px solid #e5e0d8;
		border-radius: 8px;
		padding: 1.5rem;
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		text-decoration: none;
		color: inherit;
		transition: all 150ms ease;
	}

	.action-card:hover {
		border-color: #2c5aa0;
		box-shadow: 0 4px 12px rgba(44, 90, 160, 0.1);
		transform: translateY(-2px);
	}

	.action-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.action-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: #1a1a1a;
		margin-bottom: 0.25rem;
	}

	.action-subtitle {
		font-size: 0.8rem;
		color: #999;
	}

	@media (max-width: 768px) {
		.dashboard-header {
			flex-direction: column;
		}

		.dashboard-header h1 {
			font-size: 1.5rem;
		}

		.header-actions {
			width: 100%;
		}

		.btn-secondary {
			flex: 1;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
		}

		.dashboard-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.actions-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 480px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.actions-grid {
			grid-template-columns: 1fr;
		}
	}
</style>