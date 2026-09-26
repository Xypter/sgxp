<script lang="ts">
	import { onMount } from 'svelte';
	import { spriteCardText } from '../lib/spriteCardText';
	import { getCardColorUrls } from '../lib/cardColors';
	import { ensureGradientOverridesLoaded, getGradientOverrides } from '../lib/cardColorGradients.svelte';

	interface Props {
		sprite: any;
	}

	let { sprite }: Props = $props();

	ensureGradientOverridesLoaded();

	const cardColors = $derived(getCardColorUrls(sprite.cardColor, sprite.stripColor, getGradientOverrides()));
	const cardStyle = $derived(
		`--sprite-frame-url: url("${cardColors.frameUrl}");` +
		(cardColors.stripUrl ? `--sprite-strip-url: url("${cardColors.stripUrl}");` : '') +
		`--sprite-frame-height-percent: ${cardColors.frameHeightPercent}%;` +
		`--sprite-strip-height-percent: ${cardColors.stripHeightPercent}%;` +
		`--sprite-gradient-top: ${cardColors.gradientTop};` +
		`--sprite-gradient-bottom: ${cardColors.gradientBottom};`
	);

	// Server-rendered dates are UTC; switch to the viewer's timezone once mounted
	// (see spriteCardText).
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
	const text = $derived(spriteCardText(sprite, { localDate: mounted }));
</script>

<a href={`/sprites/${sprite.id}`} class="sprite-box sprite-glow" style={cardStyle}>
	<div class="sprite-star-container">
		{#each Array.from({ length: 4 }) as _, index (index)}
			<div class="sprite-star"></div>
		{/each}
	</div>

	<div class="sprite-number">{@html text.number}</div>

	<div class="sprite-title">
		<div class="sprite-text">{@html text.title}</div>
	</div>

	<div class="sprite-image">
		<img
			src={sprite.iconImage?.url || sprite.image?.url || 'https://via.placeholder.com/150'}
			alt={sprite.iconImage?.alt || `Sprite icon for ${sprite.title}`}
			loading="lazy"
		/>
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
