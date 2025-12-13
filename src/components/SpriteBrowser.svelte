<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { charMap, altNumberMap } from '../lib/charMap.js';

	// Import from component library
	import { Button, Input, Select, Combobox, Pagination } from '$lib/components';

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

	// Extended interface with memoized sprite text conversions
	interface SpriteWithMemoized extends Sprite {
		_memoized?: {
			spriteNumber: any[];
			title: any[];
			author: any[];
			gameName: any[];
			blockType: any[];
			createdDate: any[];
			fileSize: any[];
		};
	}

	// Props for server-side initial data
	interface Props {
		initialSprites?: Sprite[];
		initialTotalResults?: number;
	}

	let { initialSprites = [], initialTotalResults = 0 }: Props = $props();

	// OPTIMIZATION: Track if we have server-provided data to prevent double-fetching
	const hasServerData = initialSprites.length > 0;

	// State using Svelte 5 runes
	// OPTIMIZATION: Don't memoize synchronously - start with raw data
	let sprites = $state<SpriteWithMemoized[]>(initialSprites as SpriteWithMemoized[]);
	let totalResults = $state(initialTotalResults);
	let currentPage = $state(1);
	let sortBy = $state('createdAt:desc');
	let gameFilter = $state('all');
	let typeFilter = $state('all');
	let authorFilter = $state('all');
	let isFetchingInProgress = $state(false);
	let searchTerm = $state('');
	
	// OPTIMIZATION: Track if initial memoization is complete
	let isMemoized = $state(false);
	// OPTIMIZATION: Track if this is the first render to prevent double-fetch
	let isInitialRender = true;

	// Viewer state - replacing modal state
	let viewingSprite = $state<Sprite | null>(null);
	let showBrowser = $state(true);
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

	const API_BASE_URL = `${import.meta.env.PUBLIC_PAYLOAD_URL}/api/sprites`;
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

	// Memoize text-to-sprite conversions for performance
	function memoizeSpriteText(sprite: SpriteWithMemoized): void {
		if (sprite._memoized) return; // Already memoized

		sprite._memoized = {
			spriteNumber: formattedNumberToAltSprite(count(sprite.id)),
			title: textToSpriteWithWrapping(sprite.title || '', charMap, 100, 2),
			author: textToSprite(sprite.author?.displayName || sprite.author?.username || ''),
			gameName: textToSpriteWithWrapping(sprite.typeOfSheet?.[0]?.game?.name || '', charMap, 150, 1),
			blockType: textToSprite(sprite.typeOfSheet?.[0]?.blockType || ''),
			createdDate: textToSprite(sprite.createdAt ? new Date(sprite.createdAt).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }) : ''),
			fileSize: textToSprite(sprite.image?.filesize ? formatBytes(sprite.image.filesize) : '0 Bytes')
		};
	}

	// OPTIMIZATION: Deferred memoization using requestIdleCallback or setTimeout fallback
	function memoizeSpritesDeferred(spritesToMemoize: SpriteWithMemoized[]): void {
		const BATCH_SIZE = 5; // Process 5 sprites at a time
		let index = 0;

		function processBatch(deadline?: IdleDeadline) {
			// Process sprites while we have time (or in batches if no IdleDeadline)
			const endIndex = Math.min(index + BATCH_SIZE, spritesToMemoize.length);
			
			while (index < endIndex) {
				memoizeSpriteText(spritesToMemoize[index]);
				index++;
			}

			// If there are more sprites to process, schedule the next batch
			if (index < spritesToMemoize.length) {
				if ('requestIdleCallback' in window) {
					requestIdleCallback(processBatch);
				} else {
					setTimeout(() => processBatch(), 0);
				}
			} else {
				// All done - trigger reactivity update
				isMemoized = true;
				sprites = [...spritesToMemoize];
			}
		}

		// Start processing
		if ('requestIdleCallback' in window) {
			requestIdleCallback(processBatch);
		} else {
			setTimeout(() => processBatch(), 0);
		}
	}

	// Fetching logic - Updated to match React component API
	async function fetchSprites() {
		// OPTIMIZATION: Prevent concurrent fetches
		if (isFetchingInProgress) return;
		
		isFetchingInProgress = true;
		try {
			const [sortField, sortOrder] = sortBy.split(':');
			// OPTIMIZATION: Using depth=2 to populate author.profilePicture (depth=3 was too slow at 667ms)
			let url = `${API_BASE_URL}?depth=2&draft=false&locale=undefined&trash=false&limit=21&page=${currentPage}&sort=${sortField}`;
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

			let fetchedSprites: SpriteWithMemoized[];

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
				fetchedSprites = multipliedSprites;
				totalResults = data.totalDocs * MOCK_DATA_MULTIPLIER;
			} else {
				fetchedSprites = data.docs;
				totalResults = data.totalDocs;
			}

			// OPTIMIZATION: Memoize in deferred batches after fetch
			sprites = fetchedSprites;
			memoizeSpritesDeferred(fetchedSprites);
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
		authorFilter = 'all';
		currentPage = 1;
	}


	// Viewer functions - replacing modal functions
	async function openSpriteViewer(sprite: Sprite, event?: MouseEvent) {
		// If this is from a click event, prevent default navigation
		if (event) {
			event.preventDefault();
		}

		transitioningCardId = sprite.id;

		// Slide out browser
		showBrowser = false;

		// Wait for slide out animation
		await new Promise(resolve => setTimeout(resolve, 200));

		// Set viewing sprite and show viewer
		viewingSprite = sprite;

		// Scroll to top of page instantly
		window.scrollTo(0, 0);

		// Push state to history
		history.pushState(
			{ spriteViewer: true, spriteId: sprite.id },
			'',
			`/sprites/${sprite.id}`
		);

		transitioningCardId = null;
	}

	function closeSpriteViewer() {
		// Fade out viewer
		viewingSprite = null;

		// Wait for fade out, then show browser and scroll to top
		setTimeout(() => {
			showBrowser = true;
			// Scroll to top instantly
			setTimeout(() => {
				window.scrollTo(0, 0);
			}, 50);
		}, 50);

		// Navigate back in history
		if (history.state?.spriteViewer) {
			history.back();
		}
	}

	function handlePopState(event: PopStateEvent) {
		if (viewingSprite && !event.state?.spriteViewer) {
			// User pressed back button, close viewer and scroll to top
			viewingSprite = null;
			setTimeout(() => {
				showBrowser = true;
				// Scroll to top instantly
				setTimeout(() => {
					window.scrollTo(0, 0);
				}, 50);
			}, 50);
		}
	}

	async function handleSpriteClick(sprite: Sprite, event: MouseEvent) {
		// Check if it's a middle-click or ctrl/cmd-click (should open in new tab)
		if (event.button === 1 || event.ctrlKey || event.metaKey) {
			return; // Let the browser handle it
		}

		await openSpriteViewer(sprite, event);
	}

	// OPTIMIZATION: Separate effect for filter/page changes only
	// This won't run on initial render if we have server data
	$effect(() => {
		// Track all filter dependencies
		const _sortBy = sortBy;
		const _gameFilter = gameFilter;
		const _typeFilter = typeFilter;
		const _authorFilter = authorFilter;
		const _searchTerm = searchTerm;
		const _currentPage = currentPage;

		// Skip the initial render if we have server-provided data
		if (isInitialRender) {
			return;
		}

		// Fetch when filters change (after initial render)
		fetchSprites();
	});

	// Initial fetch on mount
	onMount(() => {
		// Mark initial render as complete after this tick
		tick().then(() => {
			isInitialRender = false;
		});

		// If we have server data, start deferred memoization
		if (hasServerData && sprites.length > 0) {
			memoizeSpritesDeferred(sprites);
		} else {
			// No server data, fetch immediately
			fetchSprites();
		}

		// Listen to popstate for browser back/forward
		window.addEventListener('popstate', handlePopState);

		return () => {
			window.removeEventListener('popstate', handlePopState);
		};
	});
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

<div class="sprite-page-wrapper">
	{#if showBrowser && !viewingSprite}
		<div class="browser-container" in:fly={{ x: -100, duration: 200 }} out:fly={{ x: -100, duration: 200 }}>
			<div class="flex flex-col items-center justify-start p-4 md:p-8 space-y-8 w-full">
				<div class="search-section w-full">
					<div class="search-header">
						<div class="search-stats">
							<span id="totalResults" class="text-sm" style="color: var(--font-color); opacity: 0.8;">
								{isFetchingInProgress ?
								'Loading...' : `${totalResults} Results`}
							</span>
						</div>
					</div>
					<div class="search-bar-container">
						<div class="mb-6">
							<Input
								bind:value={searchTerm}
								placeholder="Search sprites by title, author, or game..."
								themed={true}
								class="w-full"
							/>
						</div>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div class="space-y-2">
							<label class="text-sm font-medium" style="color: var(--font-color);">Sort by</label>
							<Select
								bind:value={sortBy}
								options={sortOptions}
								placeholder="Newest First"
								themed={true}
								class="w-full"
							/>
						</div>
						<div class="space-y-2">
							<label class="text-sm font-medium" style="color: var(--font-color);">Game</label>
							<Combobox
								bind:value={gameFilter}
								options={gameOptions}
								placeholder="All Games"
								searchPlaceholder="Search games..."
								themed={true}
								class="w-full"
							/>
						</div>
						<div class="space-y-2">
							<label class="text-sm font-medium" style="color: var(--font-color);">Type</label>
							<Combobox
								bind:value={typeFilter}
								options={typeOptions}
								placeholder="All Types"
								searchPlaceholder="Search types..."
								themed={true}
								class="w-full"
							/>
						</div>
						<div class="space-y-2">
							<label class="text-sm font-medium" style="color: var(--font-color);">Author</label>
							<Combobox
								bind:value={authorFilter}
								options={authorOptions}
								placeholder="All Authors"
								searchPlaceholder="Search authors..."
								themed={true}
								class="w-full"
							/>
						</div>
					</div>
				</div>

				<div class="sprite-container-group w-full">
					<div class="sprite-container-title" style="color: var(--font-color);">Sprites</div>

					<div class="flex items-center justify-center p-4"
						style="background-color: var(--page-color);
						border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white); border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white); box-shadow: var(--box-shadow); position: relative; z-index: 1;"
					>
						<Pagination.Root bind:page={currentPage} count={totalResults} perPage={21} siblingCount={2}>
							{#snippet children({ pages, range })}
								<Pagination.Content>
									<Pagination.Item>
										<Pagination.PrevButton disabled={isFetchingInProgress || pageCount <= 1} />
									</Pagination.Item>
									{#each pages as page (page.key)}
										{#if page.type === 'ellipsis'}
											<Pagination.Item>
												<Pagination.Ellipsis />
											</Pagination.Item>
										{:else}
											<Pagination.Item>
												<Pagination.Link {page} isActive={page.value === currentPage} disabled={isFetchingInProgress || pageCount <= 1} />
											</Pagination.Item>
										{/if}
									{/each}
									<Pagination.Item>
										<Pagination.NextButton disabled={isFetchingInProgress || pageCount <= 1} />
									</Pagination.Item>
								</Pagination.Content>
							{/snippet}
						</Pagination.Root>
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
									onclick={(e) => handleSpriteClick(sprite, e)}
								>
									<!-- OPTIMIZATION: Reduced from 10 stars to 4 for fewer DOM nodes -->
									<div class="sprite-star-container">
										{#each Array.from({ length: 4 }) as _, index}
											<div class="sprite-star"></div>
										{/each}
									</div>

									<div class="sprite-number">
										{#each sprite._memoized?.spriteNumber || [] as item (item.key)}
											<span style={item.style}></span>
										{/each}
									</div>

									<div class="sprite-title">
										<div id="author" class="sprite-text">
											{#each sprite._memoized?.title || [] as item (item.key)}
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
										<!-- OPTIMIZATION: Added lazy loading for images -->
										<img src={sprite.iconImage?.url || sprite.image?.url || 'https://via.placeholder.com/150'}
											 alt={sprite.iconImage?.alt || `Sprite icon for ${sprite.title}`}
											 loading="lazy" />
									</div>

									<div class="sprite-author">
										<div class="sprite-text">
											{#each sprite._memoized?.author || [] as item (item.key)}
												<span style={item.style}></span>
											{/each}
										</div>
									</div>

									<div class="sprite-stats">
										<div class="sprite-text">
											{#each sprite._memoized?.gameName || [] as item (item.key)}
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
											{#each sprite._memoized?.blockType || [] as item (item.key)}
												<span style={item.style}></span>
											{/each}
										</div>
									</div>

									<div class="sprite-stats">
										<div class="sprite-text">
											{#each sprite._memoized?.createdDate || [] as item (item.key)}
												<span style={item.style}></span>
											{/each}
										</div>
									</div>

									<div class="sprite-stats">
										<div class="sprite-text">
											{#each sprite._memoized?.fileSize || [] as item (item.key)}
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
									onclick={resetAllFilters}
									class="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
								>
									Reset All Filters
								</Button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if viewingSprite}
		<div class="viewer-container" in:fly={{ x: 100, duration: 200 }} out:fly={{ x: 100, duration: 200 }}>
			<SpriteViewer
				spriteId={viewingSprite.id.toString()}
				initialSprite={viewingSprite}
				initialError={null}
				isModal={false}
				onClose={closeSpriteViewer}
			/>
		</div>
	{/if}
</div>

<style>
	.sprite-page-wrapper {
		position: relative;
		width: 100%;
	}

	.browser-container,
	.viewer-container {
		width: 100%;
	}

	.viewer-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
	}
</style>