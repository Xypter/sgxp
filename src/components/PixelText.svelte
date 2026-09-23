<script lang="ts">
  // Renders a pixel font as images instead of live text. Chrome on Windows switches text
  // anti-aliasing between LCD and grayscale depending on how a layer is composited (it flips
  // during dropdown animations and hover changes), which visibly blurs pixel fonts - images
  // never go through the text rasterizer, so they stay exactly as drawn. Same idea as the
  // sprite cards' charMap text, but the atlas is generated from the font file itself
  // (scripts/generate-pixel-font-atlas.py) and the letters are a mask, so they take the
  // surrounding `color` (each theme's --font-color). The #1D1D20 outline is baked into its
  // own atlas, replacing the old 8-way text-shadow.
  //
  // Only pixel-exact at the atlas's own font size (16px for navFont). The real text stays in
  // the DOM, visually hidden, for screen readers, copy/paste and find-in-page.
  import { navFont, type PixelFont } from '$lib/pixelFonts/navFont';

  let {
    text,
    font = navFont,
    lineHeight,
  }: {
    text: string;
    font?: PixelFont;
    /** Match a parent `line-height` (px). Real text centers the font's own line inside a
     *  taller line box (half-leading), which images can't pick up from CSS, so e.g. items
     *  with `line-height: 22px` need lineHeight={22} to put the glyphs on the same pixels.
     *  Omit when the parent's line-height is `normal` (the font's own line). */
    lineHeight?: number;
  } = $props();

  const boxHeight = $derived(Math.max(lineHeight ?? font.lineHeight, font.lineHeight));
  // Same rounding as the browsers' half-leading: the extra space is split top/bottom,
  // with the odd pixel (if any) going below.
  const halfLeading = $derived(Math.floor((boxHeight - font.lineHeight) / 2));

  const fallback = $derived(font.glyphs['?'] ?? font.glyphs[' ']);
  const glyphs = $derived([...text].map((ch) => font.glyphs[ch] ?? fallback));
  const width = $derived(glyphs.reduce((sum, g) => sum + g.w, 0));
</script>

<span
  class="pixel-text"
  style="width: {width}px; height: {boxHeight}px; vertical-align: -{boxHeight - halfLeading - font.ascent}px; --pt-fill: url('{font.fillUrl}'); --pt-outline: url('{font.outlineUrl}'); --pt-line: {font.lineHeight}px; --pt-half-leading: {halfLeading}px;"
>
  <span class="pixel-text-sr">{text}</span>
  <span class="pixel-text-outline" aria-hidden="true">
    {#each glyphs as g, i (i)}<span style="width: {g.w + 2}px; background-position: -{g.ox}px 0;"></span>{/each}
  </span>
  <span class="pixel-text-fill" aria-hidden="true">
    {#each glyphs as g, i (i)}<span style="width: {g.w}px; -webkit-mask-position: -{g.fx}px 0; mask-position: -{g.fx}px 0;"></span>{/each}
  </span>
</span>

<style>
  /* A fixed-size box one line tall (lineHeight tall if given, glyphs centered in it). In
     flex containers it sits where the old text line box did; inline, the vertical-align
     above puts the font's baseline on the parent's baseline (an inline-block with no
     in-flow text aligns by its bottom edge). */
  .pixel-text {
    position: relative;
    display: inline-block;
    flex-shrink: 0;
  }

  .pixel-text-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .pixel-text-outline,
  .pixel-text-fill {
    position: absolute;
    display: flex;
    pointer-events: none;
    /* Keep hard pixel edges when scaled (high-DPI screens, browser zoom). */
    image-rendering: pixelated;
  }

  /* Outline cells are 1px bigger on every side than the glyph cells; each overlaps the next
     by 2px so consecutive cells still advance by exactly the glyph's width. */
  .pixel-text-outline {
    left: -1px;
    top: calc(var(--pt-half-leading) - 1px);
    height: calc(var(--pt-line) + 2px);
  }

  .pixel-text-outline > span {
    flex: none;
    height: 100%;
    margin-right: -2px;
    background-image: var(--pt-outline);
    background-repeat: no-repeat;
  }

  .pixel-text-fill {
    left: 0;
    top: var(--pt-half-leading);
    height: var(--pt-line);
  }

  .pixel-text-fill > span {
    flex: none;
    height: 100%;
    background-color: currentColor;
    -webkit-mask-image: var(--pt-fill);
    mask-image: var(--pt-fill);
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }
</style>
