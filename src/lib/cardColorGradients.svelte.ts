import type { GradientOverride } from './cardColors';

// Shared across every component that imports this module (Svelte 5 cross-module $state) -
// the fetch only ever fires once per page load no matter how many SpriteCard/CardColorPicker
// instances ask for it.
let overrides = $state<Record<string, GradientOverride>>({});
let started = false;

export function ensureGradientOverridesLoaded() {
  if (started) return;
  started = true;

  fetch(`${import.meta.env.PUBLIC_PAYLOAD_URL}/api/globals/card-color-presets?depth=0`)
    .then(res => (res.ok ? res.json() : null))
    .then((data: { presets?: Array<{ value?: string; gradientTop?: string; gradientBottom?: string }> } | null) => {
      if (!data?.presets) return;
      const map: Record<string, GradientOverride> = {};
      for (const preset of data.presets) {
        if (preset.value && preset.gradientTop && preset.gradientBottom) {
          map[preset.value] = { top: preset.gradientTop, bottom: preset.gradientBottom };
        }
      }
      overrides = map;
    })
    .catch(() => {
      // Keep the hardcoded fallback gradients from cardColors.ts on failure.
    });
}

export function getGradientOverrides(): Record<string, GradientOverride> {
  return overrides;
}
