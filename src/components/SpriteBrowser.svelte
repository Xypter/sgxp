<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { spriteCardText } from '../lib/spriteCardText';
	import { getCardColorUrls } from '../lib/cardColors';
	import { ensureGradientOverridesLoaded, getGradientOverrides } from '../lib/cardColorGradients.svelte';

	// Import from component library
	import { Button, Input, Select, Combobox, NumberedPagination } from '$lib/components';
	import { RotateCcw, Search } from 'lucide-svelte';

	import SpriteViewer from './SpriteViewer.svelte';
	import { applySpriteListFieldParams } from '$lib/spriteListQuery';

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
		section: {
			id: number;
			name: string;
		};
		typeOfSheet: TypeOfSheet[];
		createdAt: string;
		updatedAt: string;
	}

	// Props for server-side initial data
	interface Props {
		initialSprites?: Sprite[];
		initialTotalResults?: number;
	}

	let { initialSprites = [], initialTotalResults = 0 }: Props = $props();

	// OPTIMIZATION: Track if we have server-provided data to prevent double-fetching
	const hasServerData = initialSprites.length > 0;

	ensureGradientOverridesLoaded();

	// Mirrors SpriteCard.svelte's cardStyle computation - this file renders its own card
	// markup instead of reusing that component (see the OPTIMIZATION comments below), so the
	// frame/strip/gradient CSS vars need to be set here too.
	function cardStyleFor(sprite: any): string {
		const cardColors = getCardColorUrls(sprite.cardColor, sprite.stripColor, getGradientOverrides());
		return (
			`--sprite-frame-url: url("${cardColors.frameUrl}");` +
			(cardColors.stripUrl ? `--sprite-strip-url: url("${cardColors.stripUrl}");` : '') +
			`--sprite-frame-height-percent: ${cardColors.frameHeightPercent}%;` +
			`--sprite-strip-height-percent: ${cardColors.stripHeightPercent}%;` +
			`--sprite-gradient-top: ${cardColors.gradientTop};` +
			`--sprite-gradient-bottom: ${cardColors.gradientBottom};`
		);
	}

	// State using Svelte 5 runes
	let sprites = $state<Sprite[]>(initialSprites as Sprite[]);
	// Card upload dates are rendered in UTC on the server and in the viewer's own
	// timezone once mounted (see spriteCardText).
	let mounted = $state(false);
	let totalResults = $state(initialTotalResults);
	let currentPage = $state(1);
	let sortBy = $state('newest');
	let sectionFilter = $state<string>('');
	let characterFilter = $state<string>(''); // Single character selection
	let styleSourceType = $state<string>('');
	let styleSourceId = $state<string>('');
	let authorFilter = $state<string>('');
	let isFetchingInProgress = $state(false);
	let searchTerm = $state('');
	let activeSearchTerm = $state(''); // The search term that triggers API call
	let fetchAbortController: AbortController | null = null;

	// OPTIMIZATION: Track if this is the first render to prevent double-fetch
	let isInitialRender = true;

	// Viewer state - replacing modal state
	let viewingSprite = $state<Sprite | null>(null);
	let showBrowser = $state(true);
	let transitioningCardId = $state<number | null>(null);
	// Scroll position in the browser grid at the moment a sprite was opened, so pressing
	// back/close restores exactly where the user was instead of re-centering the grid.
	let savedScrollY = 0;

	// URL (path + query) of the browser grid at the moment a sprite was opened in the
	// in-page viewer, or null when no viewer history entry of ours is on the stack.
	// openSpriteViewer pushes /sprites/<id> with a raw history.pushState that Astro's
	// ClientRouter never sees - but when the user goes back, the entry being returned to
	// is one Astro created itself, so the router treats it as a real navigation: shows the
	// navbar spinner, re-fetches /sprites from the server, and swaps the whole page
	// (remounting this component and re-rendering every card). handleAstroBeforePreparation
	// uses this to recognize that exact back-navigation and turn Astro's handling of it into
	// a no-op, so only handlePopState's own logic runs and just re-shows the existing grid.
	let viewerReturnUrl: string | null = null;
	// Set by handleAstroBeforePreparation for the navigation it neutralized, consumed by
	// handleAstroBeforeSwap for that same navigation.
	let neutralizeNextAstroSwap = false;

	// Astro's ClientRouter reacts to the back-navigation first - its popstate listener is
	// registered at startup, before this component exists, and runs before ours (a
	// capture-phase listener on window does NOT get to go first here), so it can't simply
	// be stopped at popstate. Cancelling this event isn't an option either: the router
	// answers a cancelled navigation with a full `location.href` page load. Instead, let the
	// navigation proceed but give it a loader that fetches nothing (see also
	// handleAstroBeforeSwap, which makes the swap a no-op). Registered as a capture-phase
	// listener on window so it runs before - and stops - the Navbar's own listener on
	// document, which would otherwise flash the page-loading spinner.
	//
	// (Only entries Astro created carry its history state; after a direct page load the
	// grid's entry has none, and the router ignores the popstate entirely - which is why
	// this only showed up when /sprites was reached through the navbar.)
	function handleAstroBeforePreparation(event: Event) {
		const prep = event as Event & { navigationType: string; to: URL; loader: () => Promise<void>; newDocument: Document };
		if (
			viewerReturnUrl !== null &&
			prep.navigationType === 'traverse' &&
			prep.to.pathname + prep.to.search === viewerReturnUrl
		) {
			viewerReturnUrl = null;
			neutralizeNextAstroSwap = true;
			event.stopPropagation();
			prep.loader = async () => {
				prep.newDocument = document;
			};
		}
	}

	function handleAstroBeforeSwap(event: Event) {
		if (!neutralizeNextAstroSwap) return;
		neutralizeNextAstroSwap = false;
		const swapEvent = event as Event & { swap: () => void; viewTransition?: ViewTransition };
		swapEvent.swap = () => {};
		// The router still restores this entry's scroll position right after the (no-op)
		// swap - with the global smooth scroll-behavior, i.e. animated, while the grid is
		// still hidden. showBrowserAgain's own instant scroll lands mid-animation, and
		// Chrome keeps applying the rest of the smooth scroll on top of it (ending 100-250px
		// too far down). Make the router's scroll instant; showBrowserAgain restores this.
		document.documentElement.style.scrollBehavior = 'auto';
		// Nothing changes, so skip the page-level view transition too - otherwise its
		// snapshot of the viewer would cross-fade over the grid sliding back in. Skipping
		// rejects the transition's promises with an AbortError that nothing else handles,
		// so swallow those here rather than leave an uncaught error on every back.
		const vt = swapEvent.viewTransition;
		if (vt) {
			vt.ready.catch(() => {});
			vt.finished.catch(() => {});
			vt.updateCallbackDone.catch(() => {});
			vt.skipTransition();
		}
	}

	// Derived values for select triggers (updated to match Payload CMS search API)
	const sortOptions = [
		{ value: "newest", label: "Newest First" },
		{ value: "oldest", label: "Oldest First" },
		{ value: "title-asc", label: "Title A-Z" },
		{ value: "title-desc", label: "Title Z-A" },
		{ value: "recently-updated", label: "Recently Updated" },
		{ value: "id-desc", label: "ID (Desc)" },
		{ value: "id-asc", label: "ID (Asc)" },
		{ value: "most-liked", label: "Most Liked" },
		{ value: "most-viewed", label: "Most Viewed" },
		{ value: "most-commented", label: "Most Commented" }
	];

	// Dynamic dropdown options from API
	let sectionOptions = $state<Array<{ value: string; label: string }>>([]);
	let characterOptions = $state<Array<{ value: string; label: string; characterType?: 'official' | 'fan' }>>([]);
	let authorOptions = $state<Array<{ value: string; label: string }>>([]);
	let styleSourceTypeOptions = $state<Array<{ value: string; label: string }>>([]);
	let officialGamesOptions = $state<Array<{ value: string; label: string }>>([]);
	let fanGamesOptions = $state<Array<{ value: string; label: string }>>([]);
	let seriesOptions = $state<Array<{ value: string; label: string }>>([]);
	let teamsOptions = $state<Array<{ value: string; label: string }>>([]);

	const API_BASE_URL = `${import.meta.env.PUBLIC_PAYLOAD_URL}/api/sprites`;
	const MOCK_DATA_MULTIPLIER = 1;
	// 10 rows worth of cards before pagination kicks in (10 cards/row at typical desktop width)
	const SPRITES_PER_PAGE = 100;
	// Derived values
	const pageCount = $derived(Math.ceil(totalResults / SPRITES_PER_PAGE));

	// Fetch dropdown filter options from API using the new /api/sprites/filters endpoint
	async function fetchFilterOptions() {
		try {
			// Use proxy route to avoid CORS issues
			const response = await fetch('/api/proxy/sprites/filters');

			if (response.ok) {
				const data = await response.json();
				const filters = data.filters;

				// Populate section options
				if (filters.sections) {
					sectionOptions = filters.sections.map((section: any) => ({
						value: section.id.toString(),
						label: section.name
					}));
				}

				// Populate character options
				if (filters.characters) {
					characterOptions = filters.characters.map((character: any) => {
						// Include character type in label for clarity (e.g., "Sonic (Official)" or "Shadow (Fan)")
						const typeLabel = character.characterType
							? character.characterType === 'official'
								? ' (Official)'
								: ' (Fan)'
							: '';

						return {
							value: character.id.toString(),
							label: `${character.name}${typeLabel}`,
							characterType: character.characterType // Keep the type for potential filtering
						};
					});
				}

				// Populate author options - note: we'll still fetch from users endpoint for now
				// since the filters endpoint might not include all users
				const authorsResponse = await fetch('/api/proxy/users?limit=100&depth=0');
				if (authorsResponse.ok) {
					const authorsData = await authorsResponse.json();
					const authors = authorsData.docs || [];
					authorOptions = authors.map((author: any) => ({
						value: author.id.toString(),
						label: author.displayName || author.username
					}));
				}

				// Populate style source type options
				if (filters.styleSourceTypes) {
					styleSourceTypeOptions = [
						...filters.styleSourceTypes.map((type: any) => ({
							value: type.value,
							label: type.label
						})),
						{ value: 'custom', label: 'Custom' }
					];
				}

				// Populate conditional dropdown options
				if (filters.officialGames) {
					officialGamesOptions = filters.officialGames.map((game: any) => ({
						value: game.id.toString(),
						label: game.name
					}));
				}

				if (filters.fanGames) {
					fanGamesOptions = filters.fanGames.map((game: any) => ({
						value: game.id.toString(),
						label: game.name
					}));
				}

				if (filters.series) {
					seriesOptions = filters.series.map((series: any) => ({
						value: series.id.toString(),
						label: series.name
					}));
				}

				if (filters.teams) {
					teamsOptions = filters.teams.map((team: any) => ({
						value: team.id.toString(),
						label: team.name
					}));
				}
			}
		} catch (error) {
			console.error('Error fetching filter options:', error);
		}
	}

	// Map sortBy values to Payload CMS sort format
	function getSortParam(sortByValue: string): string {
		const sortMapping: Record<string, string> = {
			'newest': '-createdAt',
			'oldest': 'createdAt',
			'title-asc': 'title',
			'title-desc': '-title',
			'recently-updated': '-updatedAt',
			'id-desc': '-id',
			'id-asc': 'id',
			'most-liked': '-likes',
			'most-viewed': '-views',
			'most-commented': '-comments'
		};
		return sortMapping[sortByValue] || '-createdAt';
	}

	// Fetching logic - Uses standard Payload CMS endpoint for reliable pagination
	async function fetchSprites() {
		// Cancel any in-progress fetch to ensure we get the latest requested page
		if (fetchAbortController) {
			fetchAbortController.abort();
		}
		fetchAbortController = new AbortController();
		const signal = fetchAbortController.signal;

		isFetchingInProgress = true;
		try {
			const params = new URLSearchParams();

			// Add standard Payload params
			params.set('depth', '1');
			params.set('draft', 'false');
			params.set('limit', SPRITES_PER_PAGE.toString());
			params.set('page', currentPage.toString());
			params.set('sort', getSortParam(sortBy));
			// Only the fields the grid + in-page viewer use (see spriteListQuery.ts)
			applySpriteListFieldParams(params);

			// Add filters using Payload's where query syntax
			if (authorFilter) {
				params.set('where[author][equals]', authorFilter);
			}

			if (sectionFilter) {
				params.set('where[section][equals]', sectionFilter);
			}

			if (characterFilter) {
				params.set('where[characters][contains]', characterFilter);
			}

			if (styleSourceType) {
				params.set('where[styleSourceType][equals]', styleSourceType);
			}

			if (styleSourceId) {
				if (styleSourceType === 'officialGame') {
					params.set('where[styleOfficialGame][equals]', styleSourceId);
				} else if (styleSourceType === 'fanGame') {
					params.set('where[styleFanGame][equals]', styleSourceId);
				} else if (styleSourceType === 'series') {
					params.set('where[styleSeries][equals]', styleSourceId);
				} else if (styleSourceType === 'team') {
					params.set('where[styleTeam][equals]', styleSourceId);
				}
			}

			// Add keyword search if present (searches title field)
			if (activeSearchTerm) {
				params.set('where[title][contains]', activeSearchTerm);
			}

			// Use the standard sprites endpoint for reliable pagination
			const url = `/api/sprites?${params.toString()}`;
			const response = await fetch(url, { signal });
			const data = await response.json();

			let fetchedSprites: Sprite[];

			// Check if the API call was successful
			// Standard Payload endpoint returns { docs, totalDocs, ... }
			const spriteResults = data.docs || [];
			const hasValidData = data.totalDocs !== undefined || spriteResults.length > 0;
			if (hasValidData) {
				// Use the docs directly from Payload response
				const extractedSprites = spriteResults;

				// Multiply the data for testing purposes
				if (MOCK_DATA_MULTIPLIER > 1 && extractedSprites.length > 0) {
					const originalSprites = extractedSprites;
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
					fetchedSprites = extractedSprites;
					totalResults = data.totalDocs;
				}

				sprites = fetchedSprites;
			} else {
				sprites = [];
				totalResults = 0;
			}
		} catch (error) {
			// Ignore abort errors - these are expected when a new fetch cancels an old one
			if (error instanceof Error && error.name === 'AbortError') {
				return;
			}
			console.error('Error fetching sprites:', error);
			sprites = [];
			totalResults = 0;
		} finally {
			// Only set to false if this fetch wasn't aborted
			if (!signal.aborted) {
				isFetchingInProgress = false;
			}
		}
	}

	function handleSearch() {
		activeSearchTerm = searchTerm;
		currentPage = 1; // Reset to first page when searching
	}

	function resetAllFilters() {
		searchTerm = '';
		activeSearchTerm = '';
		sortBy = 'newest';
		sectionFilter = '';
		characterFilter = '';
		styleSourceType = '';
		styleSourceId = '';
		authorFilter = '';
		currentPage = 1;

		// Explicitly fetch sprites to ensure we reload even if values didn't change
		fetchSprites();
	}


	// The grid stays mounted while a sprite is open - just hidden (.browser-hidden) - so
	// closing the viewer re-shows the same cards instead of rebuilding ~7k elements and
	// re-running the card-text setup. The slide in/out is a Web Animation on the grid
	// (transform + opacity, so it runs on the compositor), matching the old
	// fly={{ x: -100, duration: 200 }} transition it replaced.
	const SLIDE_MS = 200;
	let browserEl: HTMLDivElement | undefined = $state();

	function slideBrowser(direction: 'in' | 'out'): Promise<unknown> {
		if (!browserEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return Promise.resolve();
		}
		const hidden = { transform: 'translateX(-100px)', opacity: 0 };
		const shown = { transform: 'none', opacity: 1 };
		return browserEl
			.animate(direction === 'in' ? [hidden, shown] : [shown, hidden], {
				duration: SLIDE_MS,
				easing: direction === 'in' ? 'cubic-bezier(0.33, 1, 0.68, 1)' : 'cubic-bezier(0.32, 0, 0.67, 0)',
			})
			.finished.catch(() => {});
	}

	// Bring the grid back after the viewer's 200ms out-transition, restoring the scroll
	// position it was left at. The viewer's content stays in the document while it
	// animates out, so restoring scroll any earlier would be measured against the wrong
	// (viewer-height) document.
	//
	function showBrowserAgain() {
		setTimeout(async () => {
			showBrowser = true;
			await tick();
			// Instant, not the global smooth scroll-behavior - see openSpriteViewer.
			window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' });
			// Undo handleAstroBeforeSwap's temporary instant scrolling, if it applied.
			document.documentElement.style.scrollBehavior = '';
			slideBrowser('in');
		}, SLIDE_MS);
	}

	let openingViewer = false;

	// Viewer functions - replacing modal functions
	async function openSpriteViewer(sprite: Sprite, event?: MouseEvent) {
		// If this is from a click event, prevent default navigation
		if (event) {
			event.preventDefault();
		}
		// The grid stays clickable while it slides out - ignore a second card click.
		if (openingViewer) return;
		openingViewer = true;

		transitioningCardId = sprite.id;

		// Remember where the user was browsing so we can restore it on back/close
		savedScrollY = window.scrollY;

		// Slide out browser, then hide it
		await slideBrowser('out');
		showBrowser = false;
		openingViewer = false;

		// Set viewing sprite and show viewer
		viewingSprite = sprite;

		// Scroll to top with no visible scroll animation - the global CSS `scroll-behavior:
		// smooth` on <html> would otherwise animate a plain scrollTo(0, 0), so force it instant.
		window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

		// Push state to history
		viewerReturnUrl = location.pathname + location.search;
		history.pushState(
			{ spriteViewer: true, spriteId: sprite.id },
			'',
			`/sprites/${sprite.id}`
		);

		transitioningCardId = null;
	}

	function closeSpriteViewer() {
		// Fade out viewer (viewer-container's out:fly), then bring the grid back.
		viewingSprite = null;
		showBrowserAgain();

		// Navigate back in history
		if (history.state?.spriteViewer) {
			history.back();
		}
	}

	function handlePopState(event: PopStateEvent) {
		// Back on the grid's own entry: the viewer entry is gone. (Astro's popstate listener
		// runs before this one and has already dispatched astro:before-preparation for this
		// navigation, if any, so handleAstroBeforePreparation has already seen the URL.)
		if (viewerReturnUrl !== null && location.pathname + location.search === viewerReturnUrl) {
			viewerReturnUrl = null;
		}

		if (viewingSprite && !event.state?.spriteViewer) {
			// User pressed back button - same as closeSpriteViewer above.
			viewingSprite = null;
			showBrowserAgain();
		}
	}

	async function handleSpriteClick(sprite: Sprite, event: MouseEvent) {
		// Check if it's a middle-click or ctrl/cmd-click (should open in new tab)
		if (event.button === 1 || event.ctrlKey || event.metaKey) {
			return; // Let the browser handle it
		}

		await openSpriteViewer(sprite, event);
	}

	// Single effect to handle all filter changes and fetching
	// Use a closure to track previous values without triggering reactivity
	let prevFilterValues = {
		sortBy: '',
		sectionFilter: '',
		characterFilter: '',
		styleSourceType: '',
		styleSourceId: '',
		authorFilter: '',
		activeSearchTerm: '',
		currentPage: 1
	};

	$effect(() => {
		// Track current values
		const current = {
			sortBy,
			sectionFilter,
			characterFilter,
			styleSourceType,
			styleSourceId,
			authorFilter,
			activeSearchTerm,
			currentPage
		};

		// Skip the initial render if we have server-provided data
		if (isInitialRender) {
			prevFilterValues = current;
			return;
		}

		// Reset styleSourceId if styleSourceType changed
		if (prevFilterValues.styleSourceType !== current.styleSourceType) {
			if (current.styleSourceId !== '') {
				styleSourceId = '';
				prevFilterValues = { ...current, styleSourceId: '' };
				return;
			}
		}

		// Check if filters changed (not page)
		const filtersChanged =
			prevFilterValues.sortBy !== current.sortBy ||
			prevFilterValues.sectionFilter !== current.sectionFilter ||
			prevFilterValues.characterFilter !== current.characterFilter ||
			prevFilterValues.styleSourceType !== current.styleSourceType ||
			prevFilterValues.styleSourceId !== current.styleSourceId ||
			prevFilterValues.authorFilter !== current.authorFilter ||
			prevFilterValues.activeSearchTerm !== current.activeSearchTerm;

		// If filters changed, reset page to 1
		if (filtersChanged && current.currentPage !== 1) {
			prevFilterValues = current;
			currentPage = 1;
			return;
		}

		// Update tracked values and fetch
		prevFilterValues = current;

		// Use untrack to prevent fetchSprites from triggering this effect again
		untrack(() => {
			fetchSprites();
		});
	});

	// Initial fetch on mount
	onMount(() => {
		// Mark initial render as complete after this tick
		tick().then(() => {
			isInitialRender = false;
		});

		// Fetch filter options for dropdowns
		fetchFilterOptions();

		// Server-rendered dates are UTC; now show them in the viewer's timezone.
		mounted = true;

		// No server data, fetch immediately
		if (!hasServerData || sprites.length === 0) {
			fetchSprites();
		}

		// Listen to popstate for browser back/forward
		window.addEventListener('popstate', handlePopState);
		// Capture phase on window - see handleAstroBeforePreparation.
		window.addEventListener('astro:before-preparation', handleAstroBeforePreparation, true);
		document.addEventListener('astro:before-swap', handleAstroBeforeSwap);

		return () => {
			window.removeEventListener('popstate', handlePopState);
			window.removeEventListener('astro:before-preparation', handleAstroBeforePreparation, true);
			document.removeEventListener('astro:before-swap', handleAstroBeforeSwap);
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
	<div class="browser-container" bind:this={browserEl} class:browser-hidden={!showBrowser || !!viewingSprite}>
			<!-- Desktop logo, colored by the theme (see .sprites-logo below). Hidden on
			     phones, which never fetch its masks and show the text logo instead. -->
			<div class="desktop-logo">
				<div class="sprites-logo" role="img" aria-label="Sprites"></div>
			</div>

			<!-- Mobile Logo - simple text -->
			<div class="mobile-logo" style="
				color: var(--font-color);
				font-family: spritelogo;
				font-size: 10vw;
				text-align: center;
				padding: 20px 0;
				text-shadow:
					-2px -2px 0 var(--bg-color),
					0px -2px 0 var(--bg-color),
					2px -2px 0 var(--bg-color),
					2px 0px 0 var(--bg-color),
					2px 2px 0 var(--bg-color),
					0px 2px 0 var(--bg-color),
					-2px 2px 0 var(--bg-color),
					-2px 0px 0 var(--bg-color)
			">
				SPRITES
			</div>

			<div class="flex flex-col items-center justify-start p-4 md:p-8 space-y-8 w-full" style="padding-top: 0px;">
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
						<div class="mb-6 flex gap-2">
							<Input
								bind:value={searchTerm}
								placeholder="Search sprites by title, author, or game..."
								themed={true}
								class="search-input"
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter') {
										handleSearch();
									}
								}}
							/>
							<!-- Not disabled while a fetch runs (fetchSprites aborts the previous
							     one, and fading the buttons on every fetch read as a flicker). -->
							<Button variant="primary" icon={Search} onclick={handleSearch}>
								Search
							</Button>
							<Button variant="secondary" icon={RotateCcw} onclick={resetAllFilters}>
								Reset Filters
							</Button>
						</div>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<!-- Sort By -->
						<div class="space-y-2">
							<div class="text-sm font-medium" style="color: var(--font-color);">Sort by</div>
							<Select
								bind:value={sortBy}
								options={sortOptions}
								placeholder="Newest First"
								themed={true}
								class="w-full"
							/>
						</div>

						<!-- Author Filter -->
						<div class="space-y-2">
							<div class="text-sm font-medium" style="color: var(--font-color);">Author</div>
							<Combobox
								bind:value={authorFilter}
								options={authorOptions}
								placeholder="All Authors"
								searchPlaceholder="Search authors..."
								themed={true}
								class="w-full"
							/>
						</div>

						<!-- Section Filter -->
						<div class="space-y-2">
							<div class="text-sm font-medium" style="color: var(--font-color);">Section</div>
							<Combobox
								bind:value={sectionFilter}
								options={sectionOptions}
								placeholder="All Sections"
								searchPlaceholder="Search sections..."
								themed={true}
								class="w-full"
							/>
						</div>

						<!-- Character Filter -->
						<div class="space-y-2">
							<div class="text-sm font-medium" style="color: var(--font-color);">Character</div>
							<Combobox
								bind:value={characterFilter}
								options={characterOptions}
								placeholder="All Characters"
								searchPlaceholder="Search characters..."
								themed={true}
								class="w-full"
							/>
						</div>

						<!-- Style Source Type Filter -->
						<div class="space-y-2">
							<div class="text-sm font-medium" style="color: var(--font-color);">Style Source Type</div>
							<Select
								bind:value={styleSourceType}
								options={styleSourceTypeOptions}
								placeholder="Any Style Source"
								themed={true}
								class="w-full"
							/>
						</div>

						<!-- Conditional Style Source Dropdown - Official Game -->
						{#if styleSourceType === 'officialGame'}
							<div class="space-y-2">
								<div class="text-sm font-medium" style="color: var(--font-color);">Official Game</div>
								<Combobox
									bind:value={styleSourceId}
									options={officialGamesOptions}
									placeholder="Select Official Game..."
									searchPlaceholder="Search games..."
									themed={true}
									class="w-full"
								/>
							</div>
						{/if}

						<!-- Conditional Style Source Dropdown - Fan Game -->
						{#if styleSourceType === 'fanGame'}
							<div class="space-y-2">
								<div class="text-sm font-medium" style="color: var(--font-color);">Fan Game</div>
								<Combobox
									bind:value={styleSourceId}
									options={fanGamesOptions}
									placeholder="Select Fan Game..."
									searchPlaceholder="Search games..."
									themed={true}
									class="w-full"
								/>
							</div>
						{/if}

						<!-- Conditional Style Source Dropdown - Series -->
						{#if styleSourceType === 'series'}
							<div class="space-y-2">
								<div class="text-sm font-medium" style="color: var(--font-color);">Series</div>
								<Combobox
									bind:value={styleSourceId}
									options={seriesOptions}
									placeholder="Select Series..."
									searchPlaceholder="Search series..."
									themed={true}
									class="w-full"
								/>
							</div>
						{/if}

						<!-- Conditional Style Source Dropdown - Team -->
						{#if styleSourceType === 'team'}
							<div class="space-y-2">
								<div class="text-sm font-medium" style="color: var(--font-color);">Team</div>
								<Combobox
									bind:value={styleSourceId}
									options={teamsOptions}
									placeholder="Select Team..."
									searchPlaceholder="Search teams..."
									themed={true}
									class="w-full"
								/>
							</div>
						{/if}
					</div>
				</div>

				<div class="sprite-container-group w-full">
					<div class="sprite-container-title" style="color: var(--font-color);">Sprites</div>

					<div class="flex items-center justify-center p-4"
						style="background-color: var(--page-color);
						border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white); border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white); box-shadow: var(--box-shadow); position: relative; z-index: 1;"
					>
						<!-- No disabling while a page loads: fetchSprites aborts the previous
						     request, and fading the buttons for each fetch read as a flicker. -->
						<NumberedPagination bind:page={currentPage} count={totalResults} perPage={SPRITES_PER_PAGE} siblingCount={2} />
					</div>

					<div id="hello" class="sprite-container">
						{#if isFetchingInProgress}
							<div class="loading-sprites-message">
								<p class="loading-sprites-text">Loading sprites...</p>
							</div>
						{:else if sprites.length > 0}
							{#each sprites as sprite (sprite.id)}
								{@const text = spriteCardText(sprite, { localDate: mounted })}
								<a
									href={`/sprites/${sprite.id}`}
									class="sprite-box sprite-glow"
									data-astro-prefetch="false"
									style="view-transition-name: {transitioningCardId === sprite.id ? 'sprite-card' : 'none'}; {cardStyleFor(sprite)}"
									onclick={(e) => handleSpriteClick(sprite, e)}
								>
									<!-- OPTIMIZATION: Reduced from 10 stars to 4 for fewer DOM nodes -->
									<div class="sprite-star-container">
										{#each Array.from({ length: 4 }) as _, index}
											<div class="sprite-star"></div>
										{/each}
									</div>

									<div class="sprite-number">{@html text.number}</div>

									<div class="sprite-title">
										<div id="author" class="sprite-text">{@html text.title}</div>
									</div>

									<div class="sprite-image">
										<!-- OPTIMIZATION: Added lazy loading for images -->
										<img src={sprite.iconImage?.url || sprite.image?.url || 'https://via.placeholder.com/150'}
											 alt={sprite.iconImage?.alt || `Sprite icon for ${sprite.title}`}
											 loading="lazy" />
									</div>

									<div class="sprite-author">
										<div class="sprite-text">{@html text.author}</div>
									</div>

									<div class="sprite-stats">
										<div class="sprite-text">{@html text.gameName}</div>
									</div>

									<div class="sprite-stats">
										<div class="sprite-text">{@html text.dimensions}</div>
									</div>

									<div class="sprite-stats">
										<div class="sprite-text">{@html text.createdDate}</div>
									</div>

									<div class="sprite-stats">
										<div class="sprite-text">{@html text.fileSize}</div>
									</div>
								</a>
							{/each}
						{:else}
							<div class="no-sprites-message">
								<div class="no-sprites-icon">
									<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
										<circle cx="11" cy="11" r="8"></circle>
										<path d="m21 21-4.35-4.35"></path>
									</svg>
								</div>
								<h3 class="no-sprites-title">No Sprites Found</h3>
								<p class="no-sprites-description">Try adjusting your search terms or filters.</p>
								<Button variant="secondary" icon={RotateCcw} onclick={resetAllFilters}>
									Reset All Filters
								</Button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

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

	/* The grid while a sprite is open. content-visibility: hidden (not display: none)
	   skips its rendering but keeps its styles and layout, so bringing it back doesn't
	   re-style and re-lay-out every card. Size containment collapses it to 0 height;
	   its content is also left out of tab order, find-in-page and the accessibility tree. */
	.browser-hidden {
		content-visibility: hidden;
	}

	.viewer-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
	}

	/* Logo visibility control */
	.desktop-logo {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		overflow: hidden;
	}

	/* A pre-rendered still of the old three.js logo, which redrew WebGL every frame on
	   the main thread and so also forced the theme backdrop and the whole grid through
	   a main-thread frame 60 times a second. It's two alpha masks - the logo's light
	   and dark parts, made by scripts/generate-sprites-logo.mjs - painted in the
	   theme's font color and a darkened header color; stacked dark-then-light they
	   composite exactly like the two-tone render.
	   Full size (946x200) from a 900px-wide column, shrinking with it down to 55%, the
	   same scaling the three.js logo used before the mobile breakpoint. */
	.sprites-logo {
		position: relative;
		flex: none;
		width: clamp(calc(946px * 0.55), calc(100% * 946 / 900), 946px);
		aspect-ratio: 946 / 200;
	}

	.sprites-logo::before,
	.sprites-logo::after {
		content: '';
		position: absolute;
		inset: 0;
		-webkit-mask-size: 100% 100%;
		mask-size: 100% 100%;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
	}

	.sprites-logo::before {
		background-color: color-mix(in srgb, var(--page-color) 60%, black);
		-webkit-mask-image: -webkit-image-set(url('/img/sprites-logo-dark-1x.png') 1x, url('/img/sprites-logo-dark-2x.png') 2x);
		mask-image: image-set(url('/img/sprites-logo-dark-1x.png') 1x, url('/img/sprites-logo-dark-2x.png') 2x);
	}

	.sprites-logo::after {
		background-color: var(--font-color);
		-webkit-mask-image: -webkit-image-set(url('/img/sprites-logo-light-1x.png') 1x, url('/img/sprites-logo-light-2x.png') 2x);
		mask-image: image-set(url('/img/sprites-logo-light-1x.png') 1x, url('/img/sprites-logo-light-2x.png') 2x);
	}

	.mobile-logo {
		display: none;
	}

	@media (max-width: 768px) {
		.desktop-logo {
			display: none;
		}

		.mobile-logo {
			display: block;
		}

		/* Full width boxes with no left/right borders on mobile */
		:global(.sprite-container-title),
		:global(.sprite-content-title) {
			border-left: none !important;
			border-right: none !important;
			width: 100vw !important;
			margin-left: calc(-50vw + 50%) !important;
			margin-right: calc(-50vw + 50%) !important;
			padding-left: 1rem !important;
			padding-right: 1rem !important;
		}

		:global(.sprite-content-box),
		:global(.sprite-container),
		:global(.sprite-sheet-section),
		:global(.search-section) {
			border-left: none !important;
			border-right: none !important;
			width: 100vw !important;
			margin-left: calc(-50vw + 50%) !important;
			margin-right: calc(-50vw + 50%) !important;
			box-shadow: none !important;
		}

		/* Ensure pagination controls and sprite card area stay within bounds and full width */
		:global(.sprite-container-group) {
			width: 100vw !important;
			margin-left: calc(-50vw + 50%) !important;
			margin-right: calc(-50vw + 50%) !important;
			overflow: hidden;
		}

		/* Pagination container should be full width with no borders on sides */
		:global(.sprite-container-group) > div:has(:global([data-pagination-root])),
		:global(.sprite-container-group) > div {
			border-left: none !important;
			border-right: none !important;
			width: 100vw !important;
			margin-left: calc(-50vw + 50%) !important;
			margin-right: calc(-50vw + 50%) !important;
			box-shadow: none !important;
		}

		/* Mobile search bar - input on first line, buttons on second line */
		.search-bar-container .mb-6 {
			flex-wrap: wrap;
		}

		.search-bar-container .mb-6 :global(.search-input) {
			width: 100%;
			flex: 1 1 100%;
		}
	}

	/* Search Input Styling */
	:global(.search-input) {
		flex: 1;
		min-width: 0; /* Allow flex item to shrink below content size */
		padding: 8px 12px !important; /* Reduce padding from default */
	}

	/* Search bar container - default horizontal layout */
	.search-bar-container .mb-6 {
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
	}

	/* Loading Sprites Message Styling */
	.loading-sprites-message {
		grid-column: 1 / -1; /* Span all grid columns */
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
	}

	.loading-sprites-text {
		font-family: 'saira', monospace;
		font-size: 18px;
		color: color-mix(in srgb, var(--font-color) 70%, transparent);
		text-shadow:
			1px 0px 0 var(--bg-color),
			1px 1px 0 var(--bg-color),
			0px 1px 0 var(--bg-color);
	}

	/* No Sprites Found Message Styling */
	.no-sprites-message {
		grid-column: 1 / -1; /* Span all grid columns */
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 20px;
		text-align: center;
		min-height: 400px;
	}

	.no-sprites-icon {
		margin-bottom: 24px;
		color: color-mix(in srgb, var(--font-color) 40%, transparent);
		opacity: 0.7;
	}

	.no-sprites-title {
		font-family: 'saira', monospace;
		font-weight: 800;
		font-size: 24px;
		color: var(--font-color);
		margin-bottom: 12px;
		text-shadow:
			1px 0px 0 var(--bg-color),
			1px 1px 0 var(--bg-color),
			0px 1px 0 var(--bg-color);
	}

	.no-sprites-description {
		font-family: 'saira', monospace;
		font-size: 16px;
		color: color-mix(in srgb, var(--font-color) 70%, transparent);
		margin-bottom: 32px;
		max-width: 400px;
	}
</style>