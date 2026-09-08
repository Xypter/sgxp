<script lang="ts">
	import { onMount } from 'svelte';
	import SpriteCard from '../SpriteCard.svelte';

	interface Props {
		authorId: number | string | null | undefined;
		currentSpriteId: number | string;
	}

	let { authorId, currentSpriteId }: Props = $props();

	let sprites = $state<any[]>([]);
	let loading = $state(true);

	// Fetch a candidate pool sorted by newest, then re-rank client-side by
	// aggregate engagement (likes + bookmarks), since Payload can't sort by
	// a combined expression of two fields server-side.
	async function fetchMoreByArtist() {
		if (!authorId) {
			loading = false;
			return;
		}

		try {
			const params = new URLSearchParams({
				'where[author][equals]': String(authorId),
				depth: '1',
				limit: '20',
				sort: '-createdAt'
			});

			const response = await fetch(`/api/sprites?${params.toString()}`);
			if (!response.ok) {
				loading = false;
				return;
			}

			const data = await response.json();
			const candidates = (data.docs || []).filter(
				(s: any) => String(s.id) !== String(currentSpriteId)
			);

			candidates.sort((a: any, b: any) => {
				const scoreA = (a.likeCount || 0) + (a.favoriteCount || 0);
				const scoreB = (b.likeCount || 0) + (b.favoriteCount || 0);
				return scoreB - scoreA;
			});

			sprites = candidates.slice(0, 12);
		} catch (err) {
			console.error('Failed to fetch more sprites by this artist:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchMoreByArtist();
	});
</script>

{#if !loading && sprites.length > 0}
	<div class="more-by-artist-section">
		<div class="sprite-content-title">More By This Artist</div>
		<!-- Reuse the shared .sprite-content-box class (same as Update History/Information)
		     so this section gets the same full-width mobile treatment and even top/bottom padding. -->
		<div class="sprite-content-box">
			<div class="more-by-artist-cards">
				{#each sprites as sprite (sprite.id)}
					<SpriteCard {sprite} />
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.more-by-artist-section {
		margin-bottom: var(--gap);
	}

	.more-by-artist-cards {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 20px;
		/* Clip to a single row of cards regardless of viewport width. The 6px top/bottom
		   padding is breathing room for each card's own box-shadow and hover glow
		   (.sprite-box::before), which extend a few px past the card's own box and were
		   getting clipped when this box was sized to exactly the card height with no slack. */
		padding: 6px 0;
		max-height: calc(192px * var(--multiplication-factor) + 12px);
		overflow: hidden;
		box-sizing: border-box;
	}
</style>
