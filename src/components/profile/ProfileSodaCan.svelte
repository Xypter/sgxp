<script lang="ts">
  import { onMount } from 'svelte';
  import { Pencil } from 'lucide-svelte';
  import { Button } from '$lib/components';
  import { FRAME_SIZE, canSpriteUrl, getBodyPreset, getEyePreset, type SodaCanChoice } from '../../lib/sodaCan';

  let {
    can = null,
    onCustomize = null,
  }: {
    can?: SodaCanChoice | null;
    onCustomize?: (() => void) | null;
  } = $props();

  const SCALE = 8;
  const CROUCH_MS = 180;
  const LEAP_MS = 320;

  let body = $derived(getBodyPreset(can?.body));
  let eyes = $derived(getEyePreset(can?.eyes));

  // Same rest -> crouch -> leap rhythm as the navbar cans, but hopping in
  // place so it stays centered on its little stage.
  let phase = $state<'rest' | 'crouch' | 'leap'>('rest');
  let frame = $derived(phase === 'crouch' ? 'hop' : 'idle') as 'hop' | 'idle';

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setTimeout>;
    const rest = () => {
      phase = 'rest';
      timer = setTimeout(crouch, 1500 + Math.random() * 2500);
    };
    const crouch = () => {
      phase = 'crouch';
      timer = setTimeout(leap, CROUCH_MS);
    };
    const leap = () => {
      phase = 'leap';
      timer = setTimeout(rest, LEAP_MS);
    };
    timer = setTimeout(crouch, 800);
    return () => clearTimeout(timer);
  });
</script>

<div class="profile-content-title">
  <img class="title-can" src={canSpriteUrl('idle', can)} width={FRAME_SIZE.idle.w * 2} height={FRAME_SIZE.idle.h * 2} alt="" />
  Soda-Kan
  {#if onCustomize}
    <Button variant="secondary" size="mini" icon={Pencil} class="customize-btn" onclick={onCustomize} title="Customize your Soda-Kan">Customize</Button>
  {/if}
</div>
<div class="profile-content-box soda-can-box">
  <div class="soda-can-stage" style="--body-light: {body.light};">
    <img
      class="soda-can-sprite"
      class:leaping={phase === 'leap'}
      src={canSpriteUrl(frame, can)}
      width={FRAME_SIZE[frame].w * SCALE}
      height={FRAME_SIZE[frame].h * SCALE}
      style="--leap-ms: {LEAP_MS}ms;"
      alt="{body.label} Soda-Kan with {eyes.label.toLowerCase()} eyes"
    />
  </div>
  <div class="soda-can-colors">
    <div class="color-row">
      <span class="swatch swatch-body" style="--d: {body.dark}; --m: {body.mid}; --l: {body.light};"></span>
      <span class="color-label">Can</span>
      <span class="color-value">{body.label}</span>
    </div>
    <div class="color-row">
      <span class="swatch swatch-eyes" style="--e: {eyes.eye}; --p: {eyes.pupil};"></span>
      <span class="color-label">Eyes</span>
      <span class="color-value">{eyes.label}</span>
    </div>
  </div>
</div>

<style>
  /* Title/box chrome mirrors ProfileViewer's own section styles. */
  .profile-content-title {
    display: flex;
    align-items: center;
    gap: 8px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    padding: 3px 6px 3px 10px;
    font-family: 'saira';
    font-weight: 800;
    font-size: 18px;
    color: var(--font-color);
    text-shadow:
      calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
      calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    position: relative;
  }

  .title-can {
    image-rendering: pixelated;
    margin-right: 2px;
  }

  .profile-content-title :global(.customize-btn) {
    margin-left: auto;
  }

  .profile-content-box {
    background: var(--page-color);
    padding: 15px;
    border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    margin-bottom: var(--gap);
    color: var(--font-color);
    position: relative;
    z-index: 1;
  }

  .soda-can-box {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* A dim stage lit faintly in the can's own color, with a floor line. */
  .soda-can-stage {
    height: 120px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 14px;
    background:
      radial-gradient(ellipse at 50% 85%, color-mix(in srgb, var(--body-light) 22%, transparent), transparent 65%),
      color-mix(in srgb, var(--page-color) 55%, black);
    border: 1px solid color-mix(in srgb, var(--page-color) 70%, white);
    box-shadow: inset 0 -14px 0 color-mix(in srgb, var(--page-color) 40%, black);
  }

  .soda-can-sprite {
    display: block;
    image-rendering: pixelated;
  }

  .soda-can-sprite.leaping {
    animation: soda-can-leap var(--leap-ms, 320ms) ease-out;
  }

  @keyframes soda-can-leap {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-32px);
    }
  }

  .soda-can-colors {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .color-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'saira';
  }

  .swatch {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    border: 1px solid color-mix(in srgb, var(--page-color) 40%, black);
  }

  /* The body's whole 3-shade ramp, the way it's shaded on the can. */
  .swatch-body {
    background: linear-gradient(
      to right,
      var(--d) 0 33.3%,
      var(--m) 33.3% 66.6%,
      var(--l) 66.6% 100%
    );
  }

  /* Two-toned eye, laid out sideways like the body ramp: darker shade, then
     the lighter top pixel. */
  .swatch-eyes {
    background: linear-gradient(to right, var(--p) 0 50%, var(--e) 50% 100%);
  }

  .color-label {
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.7;
    width: 36px;
  }

  .color-value {
    font-weight: 700;
    font-size: 14px;
  }

  @media (max-width: 768px) {
    .profile-content-title,
    .profile-content-box {
      border-left: none !important;
      border-right: none !important;
      width: 100vw !important;
      margin-left: calc(-50vw + 50%) !important;
      margin-right: calc(-50vw + 50%) !important;
      box-shadow: none !important;
    }

    .profile-content-title {
      padding-left: 1rem !important;
      padding-right: 1rem !important;
    }
  }
</style>
