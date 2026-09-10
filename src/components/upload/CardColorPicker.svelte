<script lang="ts">
  import { CARD_FRAME_COLORS, CARD_STRIP_COLORS, getCardColorUrls, ensureCardImagesPreloaded } from '../../lib/cardColors';
  import { ensureGradientOverridesLoaded, getGradientOverrides } from '../../lib/cardColorGradients.svelte';

  ensureGradientOverridesLoaded();
  ensureCardImagesPreloaded();

  interface CardColorPickerProps {
    iconFile: File | null;
    existingIconUrl?: string | null;
    cardColor: string;
    stripColor: string;
    themed?: boolean;
  }

  let {
    iconFile,
    existingIconUrl = null,
    cardColor = $bindable('classic'),
    stripColor = $bindable('classic'),
    themed = false
  }: CardColorPickerProps = $props();

  let objectUrl = $state<string | null>(null);

  // Generate an object URL for the pending icon file, same pattern as FileUploadField.svelte
  $effect(() => {
    if (iconFile) {
      const url = URL.createObjectURL(iconFile);
      objectUrl = url;
      return () => URL.revokeObjectURL(url);
    } else {
      objectUrl = null;
    }
  });

  // A newly-selected file always wins; otherwise fall back to the sprite's existing icon
  // (edit mode, when the user hasn't picked a replacement) so the preview still works.
  const previewUrl = $derived(objectUrl ?? existingIconUrl);

  // Same effect as the preview card's `filter: brightness(2)` hover glow, but computed as a
  // real color so it only brightens the swatch's outline - a CSS filter here would also wash
  // out the swatch's own mini-card/strip image, not just the outline ring around it.
  function brightenColor(hex: string, factor: number): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const clamp = (n: number) => Math.min(255, Math.round(n * factor));
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(clamp(r))}${toHex(clamp(g))}${toHex(clamp(b))}`;
  }

  // Mirrors getCardColorUrls' own override lookup, so a frame swatch's glow matches whatever
  // gradient bottom is actually in effect for that color (including CMS-edited overrides),
  // not just the hardcoded fallback value baked into CARD_FRAME_COLORS.
  function frameSwatchGlow(option: (typeof CARD_FRAME_COLORS)[number]): string {
    const bottom = getGradientOverrides()[option.value]?.bottom ?? option.gradientBottom;
    return brightenColor(bottom, 2);
  }

  const cardColors = $derived(getCardColorUrls(cardColor, stripColor, getGradientOverrides()));
  const cardStyle = $derived(
    `--sprite-frame-url: url("${cardColors.frameUrl}");` +
    (cardColors.stripUrl ? `--sprite-strip-url: url("${cardColors.stripUrl}");` : '') +
    `--sprite-frame-height-percent: ${cardColors.frameHeightPercent}%;` +
    `--sprite-strip-height-percent: ${cardColors.stripHeightPercent}%;` +
    `--sprite-gradient-top: ${cardColors.gradientTop};` +
    `--sprite-gradient-bottom: ${cardColors.gradientBottom};`
  );

</script>

<div class="card-color-picker" class:themed>
  {#if previewUrl}
    <div class="preview-column">
      <div class="preview-row">
        <div class="sprite-box card-preview-box" style={cardStyle}>
          <!-- Mirrors the star/number/title skeleton in SpriteCard.svelte (left empty here,
               since there's no sprite data yet) so their margins/heights still take up the
               same space, keeping the icon well aligned with the frame artwork below it. -->
          <div class="sprite-star-container">
            {#each Array.from({ length: 4 }) as _, index (index)}
              <div class="sprite-star"></div>
            {/each}
          </div>
          <div class="sprite-number"></div>
          <div class="sprite-title"></div>
          <div class="sprite-image">
            <img src={previewUrl} alt="Icon preview" />
          </div>
        </div>

        <div class="strip-stack" role="listbox" aria-label="Strip color">
          {#each CARD_STRIP_COLORS as option (option.value)}
            <button
              type="button"
              class="strip-swatch"
              class:selected={stripColor === option.value}
              style="background-image: url('{option.swatchUrl}'); --swatch-glow: {option.accentColor};"
              onclick={() => stripColor = option.value}
              role="option"
              aria-selected={stripColor === option.value}
              aria-label={option.label}
              title={option.label}
            ></button>
          {/each}
        </div>
      </div>

      <div class="frame-row" role="listbox" aria-label="Frame color">
        {#each CARD_FRAME_COLORS as option (option.value)}
          <button
            type="button"
            class="frame-swatch"
            class:selected={cardColor === option.value}
            style="background-image: url('{option.swatchUrl}'); --swatch-glow: {frameSwatchGlow(option)};"
            onclick={() => cardColor = option.value}
            role="option"
            aria-selected={cardColor === option.value}
            aria-label={option.label}
            title={option.label}
          ></button>
        {/each}
      </div>
    </div>
  {:else}
    <p class="picker-placeholder">Upload an icon image above to preview card colors.</p>
  {/if}
</div>

<style>
  .card-color-picker {
    display: flex;
    flex-direction: column;
    gap: 8px;
    grid-column: 1 / -1;
  }

  .picker-placeholder {
    font-family: 'saira', monospace;
    font-size: 13px;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    margin: 0;
  }

  .preview-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .preview-row {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 24px;
    flex-wrap: wrap;
  }

  .card-preview-box {
    flex-shrink: 0;
    text-decoration: none;
  }

  /* The real card's icon well gets its vertical position from the star/number/title rows
     above it (see sprite_icon.css); this preview mirrors that skeleton but empty, which came
     out 5px shy of the real thing - nudge it down to match. */
  .card-preview-box :global(.sprite-image) {
    margin-top: calc(7px * var(--multiplication-factor) + 5px);
  }

  .frame-row {
    display: flex;
    flex-direction: row;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .strip-stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .frame-swatch,
  .strip-swatch {
    /* Full native <button> reset - appearance:auto in some browsers keeps invisible padding/
       border even after border:none/padding:0, which shrank where the background actually
       painted inside the declared box and showed up as a gap around the outline. */
    appearance: none;
    -webkit-appearance: none;
    box-sizing: border-box;
    margin: 0;
    font: inherit;
    position: relative;
    padding: 0;
    border: none;
    background-color: transparent;
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-position: center;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    cursor: pointer;
    border-radius: 4px;
  }

  /* 2x native pixel size of sgxp_spritecardmini_NN.png (24x32) */
  .frame-swatch {
    width: 48px;
    height: 64px;
  }

  /* Native pixel size of sgxp_spritestrip_NN.png */
  .strip-swatch {
    width: 117px;
    height: 13px;
  }

  /* Plain outline instead of the big card's box-shadow trick - these are sharp-cornered
     rectangles (no border-radius to route around), and outline+outline-offset:0 sits flush
     against the element by definition, with no z-index/stacking games needed to avoid a gap. */
  .frame-swatch,
  .strip-swatch {
    outline: 1px solid transparent;
    outline-offset: 0;
    transition: outline-color 0.1s ease-in-out;
  }

  .frame-swatch:hover,
  .frame-swatch.selected,
  .strip-swatch:hover,
  .strip-swatch.selected {
    outline-color: var(--swatch-glow, #22ff80);
  }
</style>
