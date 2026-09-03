<script lang="ts">
  import { LoaderCircle } from 'lucide-svelte';

  interface Props {
    comicId: number;
    n: number;
    // Known extension from the comic's meta.json - when present this skips
    // the guessing chain entirely (one request instead of up to five).
    ext?: string;
  }

  let { comicId, n, ext }: Props = $props();

  // Fallback for entries uploaded before meta.json existed (or whose
  // meta.json failed to load) - uploaded files keep whatever extension the
  // source file actually had (jpg/png/gif mixed across the archive), so
  // without a known extension we just try them in likelihood order and
  // fall back to a "no preview" placeholder once every extension has 404'd.
  const GUESS_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  let extIndex = $state(0);
  let failed = $state(false);
  let loaded = $state(false);

  const src = $derived(
    `https://cdn.sgxp.me/archive-triage/${comicId}/${n}.${ext || GUESS_EXTENSIONS[extIndex]}`
  );

  // Reset load/error state only when the actual image URL changes - not on
  // every prop change. meta.json often resolves *after* the guessing
  // fallback has already loaded the image successfully; if `ext` then
  // arrives with the same extension the guess already found, `src` stays
  // identical, so the <img> never re-fires a load event. Resetting
  // `loaded` in that case left the spinner stuck forever (only cleared by
  // a full remount, e.g. navigating away and back). Comparing against the
  // resolved src instead means we only reset when there's an actual new
  // image to wait for.
  let lastSrc = src;
  $effect(() => {
    if (src !== lastSrc) {
      lastSrc = src;
      failed = false;
      loaded = false;
    }
  });

  function handleError() {
    loaded = false;
    if (ext) {
      failed = true;
    } else if (extIndex < GUESS_EXTENSIONS.length - 1) {
      extIndex++;
    } else {
      failed = true;
    }
  }

  function handleLoad() {
    loaded = true;
  }
</script>

<div class="qs-image-slot">
  {#if !failed}
    {#if !loaded}
      <div class="qs-image-loading">
        <LoaderCircle size={24} class="qs-img-spinner" />
      </div>
    {/if}
    <img {src} onerror={handleError} onload={handleLoad} alt="Page {n}" loading="eager" class:qs-image-hidden={!loaded} />
  {:else}
    <div class="qs-no-preview">No preview</div>
  {/if}
</div>

<style>
  .qs-image-slot {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    min-height: 0;
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
  }

  /* Mobile: the box runs edge to edge (the modal's own side padding is
     removed for this row), so a left/right border would just draw a
     stray line flush against the screen edge instead of framing anything -
     drop those, and the top border too (see below) - only the bottom
     border remains. Width is fixed to the full viewport regardless of the
     loaded image's own size or aspect ratio. */
  @media (max-width: 640px) {
    .qs-image-slot {
      /* An explicit viewport-based width (rather than the base rule's
         flex:1 1 0 / width:100%, which depend on the ancestor chain's
         flex-grow having already resolved) is what stops this box
         rendering thin for a frame before settling to full width while
         its content (spinner, or the not-yet-visible <img>) is still
         loading in - the modal locks body scroll and is a fixed
         full-viewport overlay while open, so 100vw reliably matches. */
      flex: 0 0 100vw;
      width: 100vw;
      border-left: none;
      border-right: none;
      /* The box now sits flush against the title bar (no gap between
         them), so its own top border would stack directly on top of the
         title bar's border-bottom, reading as one extra-thick line - drop
         it and let the title bar's border be the only separator there. */
      border-top: none;
    }
  }

  .qs-image-slot img {
    max-width: 100%;
    /* Bounded by the slot's own (properly flex-shrunk) height rather than
       a flat viewport fraction - a fixed vh value ignored how much room
       was actually left once the top bar, dots, and nav/action buttons
       below took their share, which is what let the image overflow and
       push those controls out of view. */
    max-height: 100%;
    object-fit: contain;
    display: block;
    opacity: 1;
    transition: opacity 150ms ease-in-out;
  }

  .qs-image-slot img.qs-image-hidden {
    opacity: 0;
    position: absolute;
  }

  .qs-image-loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: color-mix(in srgb, var(--font-color) 50%, transparent);
  }

  :global(.qs-img-spinner) {
    animation: qs-img-spin 1s linear infinite;
  }

  @keyframes qs-img-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .qs-no-preview {
    color: color-mix(in srgb, var(--font-color) 50%, transparent);
    font-family: 'saira', monospace;
    font-size: 13px;
    padding: 2rem 1rem;
    text-align: center;
  }
</style>
