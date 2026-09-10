<script lang="ts">
	import { charMap, textToSprite, textToSpriteWithWrapping, formattedNumberToAltSprite, count, formatBytes } from '../lib/spriteCardText';
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

	const spriteNumber = $derived(formattedNumberToAltSprite(count(sprite.id)));
	const title = $derived(textToSpriteWithWrapping(sprite.title || '', charMap, 100, 2));
	const author = $derived(textToSprite(sprite.author?.displayName || sprite.author?.username || ''));
	const gameName = $derived(textToSpriteWithWrapping(sprite.section?.name || '', charMap, 150, 1));
	const dimensions = $derived(textToSprite(sprite.image?.width && sprite.image?.height ? `${sprite.image.width} X ${sprite.image.height}` : ''));
	const createdDate = $derived(textToSprite(sprite.createdAt ? new Date(sprite.createdAt).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }) : ''));
	const fileSize = $derived(textToSprite(sprite.image?.filesize ? formatBytes(sprite.image.filesize) : '0 Bytes'));
</script>

<a href={`/sprites/${sprite.id}`} class="sprite-box sprite-glow" style={cardStyle}>
	<div class="sprite-star-container">
		{#each Array.from({ length: 4 }) as _, index (index)}
			<div class="sprite-star"></div>
		{/each}
	</div>

	<div class="sprite-number">
		{#each spriteNumber as item (item.key)}
			<span style={item.style}></span>
		{/each}
	</div>

	<div class="sprite-title">
		<div class="sprite-text">
			{#each title as item (item.key)}
				{#if item.isNewline}
					<div class="sprite-newline" style="display: block; width: 100%;"></div>
				{:else}
					<span style={item.style}></span>
				{/if}
			{/each}
		</div>
	</div>

	<div class="sprite-image">
		<img
			src={sprite.iconImage?.url || sprite.image?.url || 'https://via.placeholder.com/150'}
			alt={sprite.iconImage?.alt || `Sprite icon for ${sprite.title}`}
			loading="lazy"
		/>
	</div>

	<div class="sprite-author">
		<div class="sprite-text">
			{#each author as item (item.key)}
				<span style={item.style}></span>
			{/each}
		</div>
	</div>

	<div class="sprite-stats">
		<div class="sprite-text">
			{#each gameName as item (item.key)}
				{#if item.isNewline}
					<div class="sprite-newline" style="display: block; width: 100%;"></div>
				{:else}
					<span style={item.style}></span>
				{/if}
			{/each}
		</div>
	</div>

	<div class="sprite-stats">
		<div class="sprite-text">
			{#each dimensions as item (item.key)}
				<span style={item.style}></span>
			{/each}
		</div>
	</div>

	<div class="sprite-stats">
		<div class="sprite-text">
			{#each createdDate as item (item.key)}
				<span style={item.style}></span>
			{/each}
		</div>
	</div>

	<div class="sprite-stats">
		<div class="sprite-text">
			{#each fileSize as item (item.key)}
				<span style={item.style}></span>
			{/each}
		</div>
	</div>
</a>
