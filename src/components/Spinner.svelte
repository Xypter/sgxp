<script lang="ts">
  // The site's one loader: the "dots" spinner from cli-spinners
  // (https://github.com/sindresorhus/cli-spinners), same as the navbar's.
  //
  // Drawn as pixel art rather than the braille font glyphs it's based on: a
  // font glyph gets anti-aliased (and smeared further when it lands on a
  // fractional pixel, as it does centered inside a button), so the dots came
  // out soft and uneven. Here each dot is an exact square of whole pixels,
  // rendered with anti-aliasing off.
  //
  // All frames sit in one strip that a CSS transform animation steps through
  // (compositor-driven, so it keeps pace while the main thread is busy). Each
  // frame lasts exactly 2 screen refreshes at 60Hz (4 at 120Hz): a frame time
  // that isn't a whole number of refreshes shows frames for uneven lengths,
  // which reads as stutter.
  const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const FRAME_MS = 100 / 3;

  // Braille dot bits (U+2800 + mask) -> [column, row] in the 2x4 cell.
  const DOTS: [number, number, number][] = [
    [0x01, 0, 0], [0x02, 0, 1], [0x04, 0, 2], [0x40, 0, 3],
    [0x08, 1, 0], [0x10, 1, 1], [0x20, 1, 2], [0x80, 1, 3],
  ];
  const frameDots = FRAMES.map((glyph) => {
    const mask = glyph.codePointAt(0)! - 0x2800;
    return DOTS.filter(([bit]) => mask & bit).map(([, col, row]) => [col, row] as const);
  });

  interface Props {
    /** Box size in px (the dots scale in whole-pixel steps). */
    size?: number;
    /** Screen-reader text; pass `null` when nearby text already says it. */
    label?: string | null;
    /** Box only as wide as the dots (e.g. beside a button label), not `size`. */
    fit?: boolean;
    class?: string;
  }

  let { size = 16, label = 'Loading', fit = false, class: className = '' }: Props = $props();

  // Dot size in whole pixels, with a one-dot gap: 2px dots up to 23px boxes,
  // 3px up to 31px, and so on.
  const dot = $derived(Math.max(2, Math.floor(size / 8)));
  const cellW = $derived(dot * 3);
  const cellH = $derived(dot * 7);
</script>

<span
  class="spinner {className}"
  style:width="{fit ? cellW : size}px"
  style:height="{Math.max(size, cellH)}px"
  role={label ? 'status' : undefined}
  aria-label={label ?? undefined}
  aria-hidden={label ? undefined : 'true'}
>
  <span class="spinner-window" style:width="{cellW}px" style:height="{cellH}px">
    <svg
      class="spinner-strip"
      width={cellW}
      height={cellH * FRAMES.length}
      viewBox="0 0 {cellW} {cellH * FRAMES.length}"
      shape-rendering="crispEdges"
      aria-hidden="true"
      style="--frames: {FRAMES.length}; --frame-ms: {FRAME_MS}ms; --cell-h: {cellH}px;"
    >
      {#each frameDots as dots, f}
        {#each dots as [col, row]}
          <rect x={col * dot * 2} y={f * cellH + row * dot * 2} width={dot} height={dot} />
        {/each}
      {/each}
    </svg>
  </span>
</span>

<style>
  .spinner {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    vertical-align: middle;
    color: inherit;
  }

  /* One frame's window; the strip slides up a whole frame at a time. */
  .spinner-window {
    display: block;
    overflow: hidden;
  }

  .spinner-strip {
    display: block;
    fill: currentColor;
    animation: spinner-frames calc(var(--frames) * var(--frame-ms)) steps(var(--frames)) infinite;
  }

  @keyframes spinner-frames {
    to {
      transform: translateY(calc(var(--frames) * var(--cell-h) * -1));
    }
  }
</style>
