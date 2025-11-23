<script lang="ts">
	import { onMount } from 'svelte';
	import { charMap, altNumberMap } from '../lib/charMap.js';

	// Import from component library
	import { Button, SearchBar } from '$lib/components';

	// Import shadcn components we don't have wrappers for
	import * as Select from "$components/ui/select";

	import SpriteViewer from './SpriteViewer.svelte';

	// Updated interface to match your API structure
	interface ImageData {
		id: number;
		url: string;
		alt: string;
		filename: string;
		mimeType: string;
		filesize: number;
		width: number;
		height: number;
	}

	interface Author {
		id: number;
		username: string;
		displayName: string;
		profilePicture?: ImageData;
	}

	interface Game {
		id: number;
		name: string;
		description: string | null;
		year: string;
	}

	interface TypeOfSheet {
		id: string;
		seriesOrGame: string;
		game?: Game;
		series?: any;
		blockType: string;
	}

	interface Sprite {
		id: number;
		title: string;
		description: string | null;
		author: Author;
		contributors: any[];
		views: number;
		image: ImageData;
		iconImage: ImageData;
		character: {
			id: number;
			name: string;
		};
		typeOfSheet: TypeOfSheet[];
		createdAt: string;
		updatedAt: string;
	}

	// State using Svelte 5 runes
	let sprites = $state<Sprite[]>([]);
	let totalResults = $state(0);
	let currentPage = $state(1);
	let sortBy = $state('createdAt:desc');
	let gameFilter = $state('all');
	let typeFilter = $state('all');
	let isFetchingInProgress = $state(false);
	let searchTerm = $state('');

	// Modal state
	let modalOpen = $state(false);
	let modalSprite = $state<Sprite | null>(null);
	let modalLoading = $state(false);
	let transitioningCardId = $state<number | null>(null);

	// Derived values for select triggers
	const sortOptions = [
		{ value: "createdAt:desc", label: "Newest First" },
		{ value: "createdAt:asc", label: "Oldest First" },
		{ value: "title:asc", label: "Title A-Z" },
		{ value: "title:desc", label: "Title Z-A" },
		{ value: "updatedAt:desc", label: "Recently Updated" },
		{ value: "id:desc", label: "ID (Desc)" },
		{ value: "id:asc", label: "ID (Asc)" }
	];
	const gameOptions = [
		{ value: "all", label: "All Games" }
	];

	const typeOptions = [
		{ value: "all", label: "All Types" }
	];
	const authorOptions = [
		{ value: "all", label: "All Authors" }
	];
	const sortTriggerContent = $derived(
		sortOptions.find((s) => s.value === sortBy)?.label ?? "Newest First"
	);
	const gameTriggerContent = $derived(
		gameOptions.find((g) => g.value === gameFilter)?.label ?? "All Games"
	);
	const typeTriggerContent = $derived(
		typeOptions.find((t) => t.value === typeFilter)?.label ?? "All Types"
	);

	const API_BASE_URL = "https://cms.sgxp.me/api/sprites";
	const MOCK_DATA_MULTIPLIER = 1;
	// Derived values
	const pageCount = $derived(Math.ceil(totalResults / 21));

	// Helper function to create individual character sprite
	function createCharacterSprite(char: string, characterMap: any, isAltNumberMap: boolean, index: number) {
		if (characterMap[char]) {
			const charData = characterMap[char];
			const width = charData.width;
			const height = charData.height;
			const offsetX = charData.offsetX || 0;
			const offsetY = charData.offsetY || 0;
			const marginRight = isAltNumberMap ? '0px' : '1px';
			
			return {
				key: `${char}-${index}`,
				style: `display: inline-block; width: ${width}px; height: ${height}px; background-image: url('https://i.imgur.com/DFC6vib.png');
 background-size: 400px 14px; background-position: ${charData.x}px ${charData.y}px; margin-left: ${offsetX}px; margin-right: ${marginRight}; margin-top: ${offsetY}px;`
			};
		}
		return null;
	}

	// Helper function to generate sprite for a string of text
	function textToSprite(text: string | null | undefined) {
		if (!text || typeof text !== 'string') {
			return [];
		}
		const characters = text.toUpperCase().split('');
		return characters
			.map((char, index) => createCharacterSprite(char, charMap, false, index))
			.filter((item): item is NonNullable<ReturnType<typeof createCharacterSprite>> => item !== null);
	}

	// Helper function to generate sprite for a number
	function numberToAltSprite(num: number | string | null | undefined) {
		if (num === null || num === undefined) {
			return [];
		}
		const numToProcess = (typeof num === 'string' || typeof num === 'number') ? Number(num) : NaN;
		if (isNaN(numToProcess)) {
			return [];
		}
		const numbers = String(numToProcess).split('');
		return numbers
			.map((digit, index) => createCharacterSprite(digit, altNumberMap, true, index))
			.filter((item): item is NonNullable<ReturnType<typeof createCharacterSprite>> => item !== null);
	}

	// Function to add leading zeros to numbers for stylistic purposes
	function count(number: number) {
		if (number <= 9) {
			return '0000' + number;
		} else if (number > 9 && number <= 99) {
			return '000' + number;
		} else if (number > 99 && number <= 999) {
			return '00' + number;
		} else if (number > 999 && number <= 9999) {
			return '0' + number;
		} else {
			return number.toString();
		}
	}

	// Helper function to generate sprite for a formatted number string (preserves leading zeros)
	function formattedNumberToAltSprite(numString: string | null | undefined) {
		if (!numString || typeof numString !== 'string') {
			return [];
		}
		const digits = numString.split('');
		return digits
			.map((digit, index) => createCharacterSprite(digit, altNumberMap, true, index))
			.filter((item): item is NonNullable<ReturnType<typeof createCharacterSprite>> => item !== null);
	}

	// Enhanced text to sprite with word wrapping and truncation
	function textToSpriteWithWrapping(text: string | null | undefined, characterMap: any, maxWidth: number | null = null, maxLines: number | null = null) {
		if (!text || typeof text !== 'string') {
			return [];
		}
		const input = text.toString().toUpperCase();
		const isAltNumberMap = characterMap === altNumberMap;
		// If no maxWidth specified, use simple behavior
		if (!maxWidth) {
			const characters = input.split('');
			return characters
				.map((char, index) => createCharacterSprite(char, characterMap, isAltNumberMap, index))
				.filter((item): item is NonNullable<ReturnType<typeof createCharacterSprite>> => item !== null);
		}
		
		// Split text into words
		const words = input.split(' ');
		let currentLineWidth = 0;
		let currentLine = 0;
		let elements: any[] = [];
		let charIndex = 0;
		for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
			const word = words[wordIndex];
			// Calculate word width
			let wordWidth = 0;
			for (let i = 0; i < word.length; i++) {
				const char = word[i];
				if (characterMap[char]) {
					wordWidth += characterMap[char].width;
					if (!isAltNumberMap && i < word.length - 1) {
						wordWidth += 1; // Add margin-right spacing
					}
				} else {
					wordWidth += 4;
					// Unknown character width
					if (i < word.length - 1) {
						wordWidth += 1;
						// Add margin-right spacing
					}
				}
			}
			
			// Add space width if not the first word on the line
			let spaceWidth = 0;
			if (currentLineWidth > 0) {
				spaceWidth = characterMap[' '] ? characterMap[' '].width : 3;
				if (!isAltNumberMap) {
					spaceWidth += 1;
					// Add margin-right spacing
				}
			}
			
			// Check if word fits on current line
			if (currentLineWidth > 0 && currentLineWidth + spaceWidth + wordWidth > maxWidth) {
				// Word doesn't fit, start new line
				currentLine++;
				// Check if we've exceeded max lines, add ellipsis if so
				if (maxLines && currentLine >= maxLines) {
					// Add ellipsis
					const ellipsis = '...';
					for (let i = 0; i < ellipsis.length; i++) {
						const char = ellipsis[i];
						const sprite = createCharacterSprite(char, characterMap, isAltNumberMap, charIndex++);
						if (sprite) elements.push(sprite);
					}
					break;
				}
				elements.push({
					key: `newline-${currentLine}`,
					isNewline: true
				});
				currentLineWidth = 0;
			}
			
			// Add space if not at beginning of line
			if (currentLineWidth > 0) {
				const spaceSprite = createCharacterSprite(' ', characterMap, isAltNumberMap, charIndex++);
				if (spaceSprite) elements.push(spaceSprite);
				currentLineWidth += spaceWidth;
			}
			
			// Add word characters
			for (let i = 0; i < word.length; i++) {
				const char = word[i];
				const sprite = createCharacterSprite(char, characterMap, isAltNumberMap, charIndex++);
				if (sprite) elements.push(sprite);
				if (characterMap[char]) {
					currentLineWidth += characterMap[char].width;
					if (!isAltNumberMap && i < word.length - 1) {
						currentLineWidth += 1; // Add margin-right spacing
					}
				} else {
					currentLineWidth += 4;
					// Unknown character width
					if (i < word.length - 1) {
						currentLineWidth += 1; // Add margin-right spacing
					}
				}
			}
		}
		
		return elements;
	}

	// Sprite Card size labeler for sprite sheets
	function formatBytes(bytes: number, decimals: number = 2) {
		if (!+bytes) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
	}

	// Fetching logic - Updated to match React component API
	async function fetchSprites() {
		isFetchingInProgress = true;
		try {
			const [sortField, sortOrder] = sortBy.split(':');
			let url = `${API_BASE_URL}?depth=3&draft=false&locale=undefined&trash=false&limit=21&page=${currentPage}&sort=${sortField}`;
			if (sortOrder === 'desc') {
				url += `&sort=-${sortField}`;
			}
			if (gameFilter !== 'all') {
				url += `&where[game][equals]=${gameFilter}`;
			}
			if (typeFilter !== 'all') {
				url += `&where[type][equals]=${typeFilter}`;
			}
			if (searchTerm) {
				url += `&where[title][contains]=${searchTerm}`;
			}
			
			const response = await fetch(url);
			const data = await response.json();
			// Multiply the data for testing purposes
			if (MOCK_DATA_MULTIPLIER > 1 && data.docs && data.docs.length > 0) {
				const originalSprites = data.docs;
				const multipliedSprites = [];
				for (let i = 0; i < MOCK_DATA_MULTIPLIER; i++) {
					const duplicatedSprites = originalSprites.map((sprite: Sprite, index: number) => ({
						...sprite,
						id: sprite.id + (i * 1000) + index, // Ensure unique IDs
						title: `${sprite.title} (Copy ${i + 1})`,
						views: sprite.views + Math.floor(Math.random() * 100), // Add some variation
					}));
					multipliedSprites.push(...duplicatedSprites);
				}
				sprites = multipliedSprites;
				totalResults = data.totalDocs * MOCK_DATA_MULTIPLIER;
			} else {
				sprites = data.docs;
				totalResults = data.totalDocs;
			}
		} catch (error) {
			console.error('Error fetching sprites:', error);
			sprites = [];
			totalResults = 0;
		} finally {
			isFetchingInProgress = false;
		}
	}

	function resetAllFilters() {
		searchTerm = '';
		sortBy = 'createdAt:desc';
		gameFilter = 'all';
		typeFilter = 'all';
		currentPage = 1;
	}

	// Helper function to generate visible page numbers
	function getVisiblePages() {
		const delta = 2;
		const range = [];
		const rangeWithDots: (number | string)[] = [];
		for (let i = Math.max(2, currentPage - delta); i <= Math.min(pageCount - 1, currentPage + delta); i++) {
			range.push(i);
		}
		if (currentPage - delta > 2) {
			rangeWithDots.push(1, '...');
		} else {
			rangeWithDots.push(1);
		}
		rangeWithDots.push(...range);
		if (currentPage + delta < pageCount - 1) {
			rangeWithDots.push('...', pageCount);
		} else if (pageCount > 1) {
			rangeWithDots.push(pageCount);
		}
		return rangeWithDots;
	}

	// Modal functions
	async function openSpriteModal(sprite: Sprite, event?: MouseEvent) {
		// If this is from a click event, prevent default navigation
		if (event) {
			event.preventDefault();
		}

		transitioningCardId = sprite.id;
		
		// Check if View Transitions API is supported
		const supportsViewTransitions = 'startViewTransition' in document;
		
		const openModal = async () => {
			modalSprite = sprite;
			modalOpen = true;
			document.body.style.overflow = 'hidden';
			
			// Push state to history
			history.pushState(
				{ spriteModal: true, spriteId: sprite.id },
				'',
				`/sprites/${sprite.id}`
			);
			
			// Small delay to ensure transition completes
			await new Promise(resolve => setTimeout(resolve, 100));
			transitioningCardId = null;
		};

		if (supportsViewTransitions) {
			// @ts-ignore - View Transitions API
			await document.startViewTransition(openModal).finished;
		} else {
			await openModal();
		}
	}

	function closeSpriteModal() {
		const supportsViewTransitions = 'startViewTransition' in document;
		
		const closeModal = () => {
			modalOpen = false;
			modalSprite = null;
			document.body.style.overflow = '';
			transitioningCardId = null;
		};

		if (supportsViewTransitions) {
			// @ts-ignore - View Transitions API
			document.startViewTransition(closeModal);
		} else {
			closeModal();
		}
		
		// Navigate back in history
		if (history.state?.spriteModal) {
			history.back();
		}
	}

	function handlePopState(event: PopStateEvent) {
		if (modalOpen && !event.state?.spriteModal) {
			// User pressed back button, close modal
			const supportsViewTransitions = 'startViewTransition' in document;
			
			const closeModal = () => {
				modalOpen = false;
				modalSprite = null;
				document.body.style.overflow = '';
				transitioningCardId = null;
			};

			if (supportsViewTransitions) {
				// @ts-ignore - View Transitions API
				document.startViewTransition(closeModal);
			} else {
				closeModal();
			}
		}
	}

	async function handleSpriteClick(sprite: Sprite, event: MouseEvent) {
		// Check if it's a middle-click or ctrl/cmd-click (should open in new tab)
		if (event.button === 1 || event.ctrlKey || event.metaKey) {
			return; // Let the browser handle it
		}

		await openSpriteModal(sprite, event);
	}

	// Watchers for state changes using Svelte 5 runes
	$effect(() => {
		fetchSprites();
	});

	// Initial fetch on mount
	onMount(() => {
		fetchSprites();
		
		// Listen to popstate for browser back/forward
		window.addEventListener('popstate', handlePopState);
		
		return () => {
			window.removeEventListener('popstate', handlePopState);
		};
	});

	// Handle filter changes - these will be triggered by bind:value changes
	$effect(() => {
		// Reset to page 1 when filters change
		currentPage = 1;
	});

	function handleSearchChange(value: string) {
		searchTerm = value;
		currentPage = 1;
	}
</script>

<svelte:head>
	<style>
		@keyframes fadeIn {
			from { opacity: 0; }
			to { opacity: 1; }
		}
		
		@keyframes fadeOut {
			from { opacity: 1; }
			to { opacity: 0; }
		}

		/* View Transitions fallback */
		::view-transition-old(sprite-modal),
		::view-transition-new(sprite-modal) {
			animation-duration: 0.3s;
		}
		
		::view-transition-old(sprite-card),
		::view-transition-new(sprite-card) {
			animation-duration: 0.4s;
		}
	</style>
</svelte:head>

<div class="flex flex-col items-center justify-start p-4 md:p-8 space-y-8 h-screen w-full">
	<div class="search-section w-full">
		<div class="search-header">
			<div class="search-stats">
				<span id="totalResults" class="text-sm text-muted-foreground">
					{isFetchingInProgress ?
					'Loading...' : `${totalResults} Results`}
				</span>
			</div>
		</div>
		<div class="search-bar-container">
			<div class="mb-6">
				<SearchBar
					bind:value={searchTerm}
					placeholder="Search sprites by title, author, or game..."
					onSearch={handleSearchChange}
					class="w-full"
					inputClass="py-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				/>
			</div>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="space-y-2">
				<label class="text-sm font-medium text-foreground">Sort by</label>
				<Select.Root type="single" name="sort" bind:value={sortBy}>
					<Select.Trigger id="sortSelect" class="w-full">
						{sortTriggerContent}
					</Select.Trigger>
					<Select.Content>
						{#each sortOptions as option (option.value)}
							<Select.Item value={option.value} label={option.label}>
								{option.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="space-y-2">
				<label class="text-sm font-medium text-foreground">Game</label>
				<Select.Root type="single" name="game" bind:value={gameFilter}>
					<Select.Trigger id="gameFilter" class="w-full">
						{gameTriggerContent}
					</Select.Trigger>
					<Select.Content>
						{#each gameOptions as option (option.value)}
							<Select.Item value={option.value} label={option.label}>
								{option.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="space-y-2">
				<label class="text-sm font-medium text-foreground">Type</label>
				<Select.Root type="single" name="type" bind:value={typeFilter}>
					<Select.Trigger id="typeFilter" class="w-full">
						{typeTriggerContent}
					</Select.Trigger>
					<Select.Content>
						{#each typeOptions as option (option.value)}
							<Select.Item value={option.value} label={option.label}>
								{option.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="space-y-2">
				<label class="text-sm font-medium text-foreground">Author</label>
				<Select.Root 
					type="single" name="author">
					<Select.Trigger id="authorFilter" class="w-full">
						{sortTriggerContent}
					</Select.Trigger>
					<Select.Content>
						{#each authorOptions as option (option.value)}
							<Select.Item value={option.value} label={option.label}>
								{option.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
	</div>
	
	<div class="sprite-container-group w-full">
		<div class="sprite-container-title">Sprites</div>
		
		<div class="flex items-center justify-center p-4"
			style="background-color: var(--page-color);
			border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white); border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);"
		>
			<div class="flex items-center space-x-2">
				<Button
					variant="outline"
					size="sm"
					on:click={() => currentPage > 1 && (currentPage = currentPage - 1)}
					disabled={currentPage === 1 || isFetchingInProgress || pageCount <= 1}
				>
					Previous
				</Button>
				
				{#each getVisiblePages() as page}
					{#if page === '...'}
						<span class="px-3 py-2">...</span>
					{:else}
						<Button
							variant={currentPage === page ? "default" : "outline"}
							size="sm"
							on:click={() => !isFetchingInProgress && pageCount > 1 && (currentPage = Number(page))}
							disabled={isFetchingInProgress || pageCount <= 1}
						>
							{page}
						</Button>
					{/if}
				{/each}
				
				<Button
					variant="outline"
					size="sm"
					on:click={() => currentPage < pageCount && (currentPage = currentPage + 1)}
					disabled={currentPage >= pageCount ||
					isFetchingInProgress || pageCount <= 1}
				>
					Next
				</Button>
			</div>
		</div>
		
		<div id="hello" class="sprite-container">
			{#if isFetchingInProgress}
				<div class="w-full flex justify-center items-center h-40">
					<p class="text-muted-foreground">Loading sprites...</p>
				</div>
			{:else if sprites.length > 0}
				{#each sprites as sprite (sprite.id)}
					<a 
						href={`/sprites/${sprite.id}`} 
						class="sprite-box sprite-glow"
						style="view-transition-name: {transitioningCardId === sprite.id ? 'sprite-card' : 'none'};"
						on:click={(e) => handleSpriteClick(sprite, e)}
					>
						<div class="sprite-star-container">
							{#each Array.from({ length: 10 }) as _, index}
								<div class="sprite-star"></div>
							{/each}
						</div>
						
						<div class="sprite-number">
							{#each formattedNumberToAltSprite(count(sprite.id)) as item (item.key)}
								<span style={item.style}></span>
							{/each}
						</div>
						
						<div class="sprite-title">
							<div id="author" class="sprite-text">
								{#each textToSpriteWithWrapping(sprite.title || '', charMap, 100, 2) as item (item.key)}
									{#if item.isNewline}
										<div class="sprite-newline" style="display: block;
										width: 100%;"></div>
									{:else}
										<span style={item.style}></span>
									{/if}
								{/each}
							</div>
						</div>
						
						<div class="sprite-image">
							<img src={sprite.iconImage?.url || sprite.image?.url || 'https://via.placeholder.com/150'} 
								 alt={sprite.iconImage?.alt || `Sprite icon for ${sprite.title}`} />
						</div>
						
						<div class="sprite-author">
							<div class="sprite-text">
								{#each textToSprite(sprite.author?.displayName || sprite.author?.username || '') as item (item.key)}
									<span style={item.style}></span>
								{/each}
							</div>
						</div>
						
						<div class="sprite-stats">
							<div class="sprite-text">
								{#each textToSpriteWithWrapping(sprite.typeOfSheet?.[0]?.game?.name || '', charMap, 150, 1) as item (item.key)}
									{#if item.isNewline}
										<div class="sprite-newline" style="display: block;
										width: 100%;"></div>
									{:else}
										<span style={item.style}></span>
									{/if}
								{/each}
							</div>
						</div>
						
						<div class="sprite-stats">
							<div class="sprite-text">
								{#each textToSprite(sprite.typeOfSheet?.[0]?.blockType || '') as item (item.key)}
									<span style={item.style}></span>
								{/each}
							</div>
						</div>
						
						<div class="sprite-stats">
							<div class="sprite-text">
								{#each textToSprite(sprite.createdAt ? new Date(sprite.createdAt).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '') as item (item.key)}
									<span style={item.style}></span>
								{/each}
							</div>
						</div>
						
						<div class="sprite-stats">
							<div class="sprite-text">
								{#each textToSprite(sprite.image?.filesize ? formatBytes(sprite.image.filesize) : '0 Bytes') as item (item.key)}
									<span style={item.style}></span>
								{/each}
							</div>
						</div>
					</a>
				{/each}
			{:else}
				<div class="w-full flex flex-col items-center justify-end p-8 text-center">
					<div class="text-muted-foreground mb-4">
						<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<circle cx="11" cy="11" r="8"></circle>
							<path d="m21 21-4.35-4.35"></path>
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-foreground mb-2">No sprites found</h3>
					<p class="text-muted-foreground mb-6">Try adjusting your search terms or filters.</p>
					<Button
						on:click={resetAllFilters}
						class="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
					>
						Reset All Filters
					</Button>
				</div>
			{/if}
		</div>
	</div>
</div>

{#if modalOpen && modalSprite}
	<div 
		class="sprite-modal-overlay"
		style="view-transition-name: sprite-modal;"
		on:click={closeSpriteModal}
		on:keydown={(e) => e.key === 'Escape' && closeSpriteModal()}
		role="button"
		tabindex="-1"
	>
		<div class="sprite-modal-content" on:click|stopPropagation>
			<SpriteViewer 
				spriteId={modalSprite.id.toString()} 
				initialSprite={modalSprite} 
				initialError={null}
				isModal={true}
				onClose={closeSpriteModal}
			/>
		</div>
	</div>
{/if}

<style>
	.sprite-modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.9);
		z-index: 9999;
		display: flex;
		justify-content: center;
		align-items: center;
		animation: fadeIn 0.3s ease-out;
		overflow: hidden;
	}

	.sprite-modal-content {
		width: 90%;
		max-width: 1400px;
		height: 100vh;
		overflow: hidden;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>