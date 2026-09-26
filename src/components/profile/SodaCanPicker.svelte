<script lang="ts">
  import { BODY_PRESETS, EYE_PRESETS, FRAME_SIZE, canSpriteUrl, getBodyPreset, getEyePreset } from '../../lib/sodaCan';

  let {
    body = $bindable('classic'),
    eyes = $bindable('classic'),
    disabled = false,
  }: {
    body?: string;
    eyes?: string;
    disabled?: boolean;
  } = $props();

  const SCALE = 8;
  let choice = $derived({ body, eyes });
</script>

<div class="soda-can-picker">
  <div class="picker-preview" style="--body-light: {getBodyPreset(body).light};">
    <img
      src={canSpriteUrl('idle', choice)}
      width={FRAME_SIZE.idle.w * SCALE}
      height={FRAME_SIZE.idle.h * SCALE}
      alt="Your Soda-Kan preview"
    />
  </div>

  <div class="picker-options">
    <div class="picker-group">
      <span class="picker-label">Can <strong>{getBodyPreset(body).label}</strong></span>
      <div class="swatches" role="radiogroup" aria-label="Can color">
        {#each BODY_PRESETS as preset (preset.id)}
          <button
            type="button"
            class="swatch swatch-body"
            class:selected={body === preset.id}
            style="--d: {preset.dark}; --m: {preset.mid}; --l: {preset.light};"
            role="radio"
            aria-checked={body === preset.id}
            title={preset.label}
            aria-label={preset.label}
            {disabled}
            onclick={() => (body = preset.id)}
          ></button>
        {/each}
      </div>
    </div>

    <div class="picker-group">
      <span class="picker-label">Eyes <strong>{getEyePreset(eyes).label}</strong></span>
      <div class="swatches" role="radiogroup" aria-label="Eye color">
        {#each EYE_PRESETS as preset (preset.id)}
          <button
            type="button"
            class="swatch swatch-eyes"
            class:selected={eyes === preset.id}
            style="--e: {preset.eye}; --p: {preset.pupil};"
            role="radio"
            aria-checked={eyes === preset.id}
            title={preset.label}
            aria-label={preset.label}
            {disabled}
            onclick={() => (eyes = preset.id)}
          ></button>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .soda-can-picker {
    display: flex;
    gap: 20px;
    align-items: center;
  }

  .picker-preview {
    width: 100px;
    height: 100px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(ellipse at 50% 60%, color-mix(in srgb, var(--body-light) 22%, transparent), transparent 70%),
      color-mix(in srgb, var(--page-color) 55%, black);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
  }

  .picker-preview img {
    image-rendering: pixelated;
  }

  .picker-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .picker-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .picker-label {
    font-family: 'saira';
    font-size: 12px;
    color: var(--font-color);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .picker-label strong {
    margin-left: 6px;
    text-transform: none;
    letter-spacing: 0;
    font-size: 14px;
  }

  .swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .swatch {
    width: 26px;
    height: 26px;
    padding: 0;
    border: 2px solid color-mix(in srgb, var(--page-color) 40%, black);
    cursor: url('/img/Sonic_Cursor.png'), pointer;
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

  .swatch:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--font-link-color) 60%, transparent);
  }

  .swatch.selected {
    border-color: var(--font-color);
    outline: 2px solid var(--font-link-color);
    outline-offset: 1px;
  }

  .swatch:disabled {
    opacity: 0.5;
    cursor: default;
  }

  @media (max-width: 768px) {
    .soda-can-picker {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
