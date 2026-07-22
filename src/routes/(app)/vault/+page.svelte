// File: src/routes/(app)/vault/+page.svelte

<script lang="ts">
	import { onMount } from 'svelte';

	interface VaultItem {
		id: string;
		name: string;
		type: 'assignment' | 'lecture-note' | 'past-question' | 'slide' | 'textbook';
		course: string;
		size: string;
		uploadedBy: string;
		uploadedAt: string;
		downloads: number;
		isFavorite: boolean;
	}

	interface Category {
		id: string;
		label: string;
		icon: string;
		count: number;
	}

	let searchQuery = '';
	let selectedCategory: string | null = null;
	let selectedSort: 'recent' | 'popular' | 'name' = 'recent';
	let viewMode: 'grid' | 'list' = 'grid';
	let isLoading = false;
	let favorites: Set<string> = new Set();

	const categories: Category[] = [
		{ id: 'all', label: 'All Items', icon: '📁', count: 156 },
		{ id: 'assignment', label: 'Assignments', icon: '📝', count: 34 },
		{ id: 'lecture-note', label: 'Lecture Notes', icon: '📚', count: 52 },
		{ id: 'past-question', label: 'Past Questions', icon: '❓', count: 28 },
		{ id: 'slide', label: 'Slides', icon: '🎯', count: 25 },
		{ id: 'textbook', label: 'Textbooks', icon: '📖', count: 17 }
	];

	// Mock vault items
	const allVaultItems: VaultItem[] = [
		{
			id: '1',
			name: 'Calculus Assignment 3 - Solutions',
			type: 'assignment',
			course: 'Calculus 201',
			size: '2.4 MB',
			uploadedBy: 'Dr. Samuel Okoro',
			uploadedAt: '2024-12-10',
			downloads: 234,
			isFavorite: false
		},
		{
			id: '2',
			name: 'Introduction to Differential Equations',
			type: 'lecture-note',
			course: 'Calculus 201',
			size: '1.8 MB',
			uploadedBy: 'Dr. Samuel Okoro',
			uploadedAt: '2024-12-08',
			downloads: 567,
			isFavorite: true
		},
		{
			id: '3',
			name: 'Calculus 2019 Exam Paper',
			type: 'past-question',
			course: 'Calculus 201',
			size: '890 KB',
			uploadedBy: 'Exam Unit',
			uploadedAt: '2024-11-20',
			downloads: 1203,
			isFavorite: false
		},
		{
			id: '4',
			name: 'Integration Techniques - Presentation',
			type: 'slide',
			course: 'Calculus 201',
			size: '3.2 MB',
			uploadedBy: 'Dr. Samuel Okoro',
			uploadedAt: '2024-12-09',
			downloads: 189,
			isFavorite: false
		},
		{
			id: '5',
			name: 'Advanced Calculus Textbook',
			type: 'textbook',
			course: 'Calculus 201',
			size: '5.6 MB',
			uploadedBy: 'Library',
			uploadedAt: '2024-10-15',
			downloads: 892,
			isFavorite: true
		},
		{
			id: '6',
			name: 'Literature Essay Guidelines',
			type: 'assignment',
			course: 'English Literature',
			size: '650 KB',
			uploadedBy: 'Prof. Ada Nwankwo',
			uploadedAt: '2024-12-07',
			downloads: 145,
			isFavorite: false
		}
	];

	let vaultItems: VaultItem[] = allVaultItems;

	onMount(() => {
		loadFavorites();
	});

	function loadFavorites() {
		// Load from localStorage in real app
		favorites = new Set(allVaultItems.filter((item) => item.isFavorite).map((item) => item.id));
	}

	function filterAndSort() {
		let filtered = allVaultItems;

		// Apply search
		if (searchQuery) {
			filtered = filtered.filter(
				(item) =>
					item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					item.course.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}

		// Apply category filter
		if (selectedCategory && selectedCategory !== 'all') {
			filtered = filtered.filter((item) => item.type === selectedCategory);
		}

		// Apply sort
		switch (selectedSort) {
			case 'popular':
				filtered = filtered.sort((a, b) => b.downloads - a.downloads);
				break;
			case 'name':
				filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
				break;
			case 'recent':
			default:
				filtered = filtered.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
		}

		vaultItems = filtered;
	}

	function toggleFavorite(id: string) {
		if (favorites.has(id)) {
			favorites.delete(id);
		} else {
			favorites.add(id);
		}
		favorites = favorites;
	}

	function getTypeColor(type: VaultItem['type']) {
		const colors = {
			assignment: '#3b82f6',
			'lecture-note': '#8b5cf6',
			'past-question': '#ec4899',
			slide: '#f59e0b',
			textbook: '#10b981'
		};
		return colors[type];
	}

	function getTypeLabel(type: VaultItem['type']) {
		const labels = {
			assignment: 'Assignment',
			'lecture-note': 'Lecture Note',
			'past-question': 'Past Question',
			slide: 'Slide',
			textbook: 'Textbook'
		};
		return labels[type];
	}

	$: if (searchQuery || selectedCategory || selectedSort) {
		filterAndSort();
	}
</script>

<div class="vault">
	<!-- Header -->
	<div class="vault-header">
		<div>
			<h1>Document Vault</h1>
			<p>Access course materials, assignments, and study resources</p>
		</div>
		<button class="btn-upload">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="17 8 12 3 7 8" />
				<line x1="12" y1="3" x2="12" y2="15" />
			</svg>
			Upload Document
		</button>
	</div>

	<!-- Controls -->
	<div class="controls-bar">
		<div class="search-group">
			<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.35-4.35" />
			</svg>
			<input
				type="text"
				placeholder="Search documents, courses..."
				bind:value={searchQuery}
				class="search-input"
			/>
		</div>

		<div class="controls-right">
			<select bind:value={selectedSort} class="select-input">
				<option value="recent">Most Recent</option>
				<option value="popular">Most Popular</option>
				<option value="name">Name (A-Z)</option>
			</select>

			<div class="view-toggle">
				<button
					class="view-btn"
					class:active={viewMode === 'grid'}
					onclick={() => (viewMode = 'grid')}
					aria-label="Grid view"
				>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<rect x="3" y="3" width="7" height="7" />
						<rect x="14" y="3" width="7" height="7" />
						<rect x="14" y="14" width="7" height="7" />
						<rect x="3" y="14" width="7" height="7" />
					</svg>
				</button>
				<button
					class="view-btn"
					class:active={viewMode === 'list'}
					onclick={() => (viewMode = 'list')}
					aria-label="List view"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="8" y1="6" x2="21" y2="6" />
						<line x1="8" y1="12" x2="21" y2="12" />
						<line x1="8" y1="18" x2="21" y2="18" />
						<line x1="3" y1="6" x2="3.01" y2="6" />
						<line x1="3" y1="12" x2="3.01" y2="12" />
						<line x1="3" y1="18" x2="3.01" y2="18" />
					</svg>
				</button>
			</div>
		</div>
	</div>

	<div class="vault-content">
		<!-- Sidebar Categories -->
		<aside class="vault-sidebar">
			<h3>Categories</h3>
			<div class="category-list">
				{#each categories as category}
					<button
						class="category-btn"
						class:active={selectedCategory === category.id || (!selectedCategory && category.id === 'all')}
						onclick={() => (selectedCategory = category.id === 'all' ? null : category.id)}
					>
						<span class="category-icon">{category.icon}</span>
						<span class="category-name">{category.label}</span>
						<span class="category-count">{category.count}</span>
					</button>
				{/each}
			</div>
		</aside>

		<!-- Main Content -->
		<main class="vault-main">
			{#if vaultItems.length > 0}
				<div class="results-info">
					<p>Showing <strong>{vaultItems.length}</strong> document{vaultItems.length !== 1 ? 's' : ''}</p>
				</div>

				{#if viewMode === 'grid'}
					<div class="grid-view">
						{#each vaultItems as item}
							<div class="vault-card">
								<div class="card-header">
									<div class="card-type" style="background-color: {getTypeColor(item.type)}">
										{getTypeLabel(item.type).charAt(0)}
									</div>
									<button
										class="favorite-btn"
										class:active={favorites.has(item.id)}
										onclick={() => toggleFavorite(item.id)}
										aria-label="Toggle favorite"
									>
										<svg viewBox="0 0 24 24" fill="currentColor">
											<path
												d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
											/>
										</svg>
									</button>
								</div>

								<div class="card-content">
									<h4 class="card-title">{item.name}</h4>
									<p class="card-course">{item.course}</p>
									<div class="card-meta">
										<span class="card-size">{item.size}</span>
										<span class="card-separator">•</span>
										<span class="card-downloads">
											<svg class="icon-tiny" viewBox="0 0 24 24" fill="currentColor">
												<path d="M4 12a8 8 0 0 1 15.88-1M4 13a8 8 0 0 0 15.88 1" />
											</svg>
											{item.downloads}
										</span>
									</div>
								</div>

								<div class="card-footer">
									<button class="btn-download">
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
											<polyline points="7 10 12 15 17 10" />
											<line x1="12" y1="15" x2="12" y2="3" />
										</svg>
										Download
									</button>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="list-view">
						<div class="list-header">
							<div class="list-col-name">Document Name</div>
							<div class="list-col-course">Course</div>
							<div class="list-col-uploaded">Uploaded</div>
							<div class="list-col-downloads">Downloads</div>
							<div class="list-col-actions">Actions</div>
						</div>
						{#each vaultItems as item}
							<div class="list-row">
								<div class="list-col-name">
									<div class="list-item-icon" style="background-color: {getTypeColor(item.type)}">
										{getTypeLabel(item.type).charAt(0)}
									</div>
									<div>
										<div class="list-item-name">{item.name}</div>
										<div class="list-item-size">{item.size}</div>
									</div>
								</div>
								<div class="list-col-course">{item.course}</div>
								<div class="list-col-uploaded">{item.uploadedAt}</div>
								<div class="list-col-downloads">{item.downloads}</div>
								<div class="list-col-actions">
									<button
										class="action-btn"
										class:active={favorites.has(item.id)}
										onclick={() => toggleFavorite(item.id)}
									>
										<svg viewBox="0 0 24 24" fill="currentColor">
											<path
												d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
											/>
										</svg>
									</button>
									<button class="action-btn" aria-label="Download">
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
											<polyline points="7 10 12 15 17 10" />
											<line x1="12" y1="15" x2="12" y2="3" />
										</svg>
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{:else}
				<div class="empty-state">
					<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path d="M7 9.5A4.5 4.5 0 0 1 11.5 5M5 12a7 7 0 0 1 14 0M3 9h4M3 15h18M15 12v8M9 12v8" />
					</svg>
					<h3>No documents found</h3>
					<p>Try adjusting your search or filters</p>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	.vault {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.vault-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
	}

	.vault-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #1a1a1a;
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.5px;
	}

	.vault-header p {
		font-size: 0.95rem;
		color: #666;
		margin: 0;
	}

	.btn-upload {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1.5rem;
		background: linear-gradient(135deg, #2c5aa0 0%, #1a3a5c 100%);
		color: white;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.btn-upload:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(44, 90, 160, 0.25);
	}

	.btn-upload svg {
		width: 18px;
		height: 18px;
	}

	/* Controls Bar */
	.controls-bar {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.search-group {
		position: relative;
		flex: 1;
		min-width: 250px;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		width: 18px;
		height: 18px;
		color: #999;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border: 1px solid #d4cec3;
		border-radius: 6px;
		font-size: 0.95rem;
		transition: all 150ms ease;
		background: white;
	}

	.search-input:focus {
		outline: none;
		border-color: #2c5aa0;
		box-shadow: 0 0 0 3px rgba(44, 90, 160, 0.1);
	}

	.controls-right {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.select-input {
		padding: 0.75rem 1rem;
		border: 1px solid #d4cec3;
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.select-input:focus {
		outline: none;
		border-color: #2c5aa0;
	}

	.view-toggle {
		display: flex;
		gap: 0.5rem;
		background: white;
		border: 1px solid #d4cec3;
		border-radius: 6px;
		padding: 0.25rem;
	}

	.view-btn {
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: transparent;
		cursor: pointer;
		color: #999;
		transition: all 150ms ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.view-btn:hover {
		color: #1a1a1a;
	}

	.view-btn.active {
		background: #f5f5f5;
		color: #2c5aa0;
	}

	.view-btn svg {
		width: 16px;
		height: 16px;
	}

	/* Vault Content */
	.vault-content {
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: 2rem;
	}

	.vault-sidebar {
		background: white;
		border-radius: 8px;
		border: 1px solid #e5e0d8;
		padding: 1.5rem;
		height: fit-content;
		position: sticky;
		top: 80px;
	}

	.vault-sidebar h3 {
		margin: 0 0 1rem 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: #1a1a1a;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.category-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.category-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 6px;
		cursor: pointer;
		transition: all 150ms ease;
		color: #666;
		font-size: 0.875rem;
		text-align: left;
		width: 100%;
	}

	.category-btn:hover {
		background: #f5f5f5;
		color: #1a1a1a;
	}

	.category-btn.active {
		background: linear-gradient(to right, rgba(44, 90, 160, 0.1), transparent);
		color: #2c5aa0;
		border-color: #2c5aa0;
		font-weight: 600;
	}

	.category-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.category-name {
		flex: 1;
	}

	.category-count {
		font-size: 0.75rem;
		background: #e5e0d8;
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		font-weight: 600;
		color: #999;
	}

	/* Main Content */
	.vault-main {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.results-info {
		font-size: 0.875rem;
		color: #666;
	}

	.results-info strong {
		color: #1a1a1a;
		font-weight: 600;
	}

	/* Grid View */
	.grid-view {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 1.5rem;
	}

	.vault-card {
		background: white;
		border: 1px solid #e5e0d8;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		transition: all 150ms ease;
	}

	.vault-card:hover {
		border-color: #2c5aa0;
		box-shadow: 0 4px 12px rgba(44, 90, 160, 0.1);
		transform: translateY(-2px);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: linear-gradient(135deg, #f8f7f5 0%, #f0ede8 100%);
		border-bottom: 1px solid #e5e0d8;
	}

	.card-type {
		width: 40px;
		height: 40px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 700;
		font-size: 1.1rem;
	}

	.favorite-btn {
		background: none;
		border: none;
		padding: 0;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: #d4cec3;
		transition: all 150ms ease;
	}

	.favorite-btn:hover {
		color: #f59e0b;
	}

	.favorite-btn.active {
		color: #f59e0b;
	}

	.favorite-btn svg {
		width: 18px;
		height: 18px;
	}

	.card-content {
		flex: 1;
		padding: 1rem;
	}

	.card-title {
		margin: 0 0 0.5rem 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: #1a1a1a;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-course {
		font-size: 0.75rem;
		color: #999;
		margin: 0 0 0.75rem 0;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: #999;
	}

	.card-downloads {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.icon-tiny {
		width: 12px;
		height: 12px;
	}

	.card-footer {
		padding: 1rem;
		border-top: 1px solid #e5e0d8;
	}

	.btn-download {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem;
		background: white;
		border: 1px solid #d4cec3;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 150ms ease;
		color: #2c5aa0;
	}

	.btn-download:hover {
		background: #f5f5f5;
		border-color: #2c5aa0;
	}

	.btn-download svg {
		width: 14px;
		height: 14px;
	}

	/* List View */
	.list-view {
		background: white;
		border: 1px solid #e5e0d8;
		border-radius: 8px;
		overflow: hidden;
	}

	.list-header {
		display: grid;
		grid-template-columns: 2fr 1.5fr 1fr 1fr 120px;
		gap: 1rem;
		padding: 1rem;
		background: #f8f7f5;
		border-bottom: 1px solid #e5e0d8;
		font-size: 0.875rem;
		font-weight: 600;
		color: #666;
	}

	.list-row {
		display: grid;
		grid-template-columns: 2fr 1.5fr 1fr 1fr 120px;
		gap: 1rem;
		padding: 1rem;
		border-bottom: 1px solid #f0ede8;
		align-items: center;
		transition: background 150ms ease;
	}

	.list-row:last-child {
		border-bottom: none;
	}

	.list-row:hover {
		background: #f8f7f5;
	}

	.list-col-name {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.list-item-icon {
		width: 36px;
		height: 36px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 700;
		flex-shrink: 0;
	}

	.list-item-name {
		font-size: 0.95rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.list-item-size {
		font-size: 0.75rem;
		color: #999;
		margin-top: 0.25rem;
	}

	.list-col-course,
	.list-col-uploaded {
		font-size: 0.875rem;
		color: #666;
	}

	.list-col-downloads {
		font-size: 0.875rem;
		color: #666;
		text-align: right;
	}

	.list-col-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.action-btn {
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		color: #d4cec3;
		transition: all 150ms ease;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
	}

	.action-btn:hover {
		background: #f0ede8;
		color: #2c5aa0;
	}

	.action-btn.active {
		color: #f59e0b;
	}

	.action-btn svg {
		width: 16px;
		height: 16px;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		color: #999;
	}

	.empty-icon {
		width: 64px;
		height: 64px;
		margin: 0 auto 1.5rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.95rem;
	}

	@media (max-width: 1024px) {
		.vault-content {
			grid-template-columns: 160px 1fr;
			gap: 1.5rem;
		}

		.vault-sidebar {
			top: 60px;
		}

		.grid-view {
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		}
	}

	@media (max-width: 768px) {
		.vault-header {
			flex-direction: column;
		}

		.vault-header h1 {
			font-size: 1.5rem;
		}

		.controls-bar {
			flex-direction: column;
		}

		.search-group {
			width: 100%;
		}

		.vault-content {
			grid-template-columns: 1fr;
		}

		.vault-sidebar {
			display: none;
		}

		.list-header {
			grid-template-columns: 1fr;
			gap: 0;
		}

		.list-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.list-col-course::before {
			content: 'Course: ';
			font-weight: 600;
			color: #666;
		}

		.list-col-uploaded::before {
			content: 'Uploaded: ';
			font-weight: 600;
			color: #666;
		}

		.list-col-downloads::before {
			content: 'Downloads: ';
			font-weight: 600;
			color: #666;
		}

		.list-col-downloads {
			text-align: left;
		}

		.grid-view {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.grid-view {
			grid-template-columns: 1fr;
		}

		.list-view {
			display: none;
		}
	}
</style>