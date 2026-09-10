export interface CardFrameColorOption {
  value: string;
  label: string;
  url: string;
  /** Small swatch thumbnail shown in the picker's 3x4 frame grid (sgxp_spritecardmini_NN.png). */
  swatchUrl: string;
  gradientTop: string; // .sprite-image background gradient stop, tied to frame color
  gradientBottom: string;
  /** % of the card box height this layer's image covers. Omit for a full-height (100%) layer. */
  heightPercent?: number;
}

export interface CardStripColorOption {
  value: string;
  label: string;
  url: string;
  /** Swatch thumbnail shown in the picker's strip stack - same asset as `url` for every real
   * color, but 'classic' has no rendering `url` (see below) so needs its own for display. */
  swatchUrl: string;
  /** Hover-glow color for this swatch in the picker (strips have no gradientTop/Bottom of their
   * own, unlike frames, so this is a plain sampled accent color from the strip art itself). */
  accentColor: string;
  /** % of the card box height this layer's image covers. Omit for a full-height (100%) layer. */
  heightPercent?: number;
}

// New preset frame/strip images are 117x180 and 117x13 respectively, stacked inside the
// same 117x192 card box the old single "classic" image filled entirely - see sprite_icon.css.
const FRAME_HEIGHT_PERCENT = (180 / 192) * 100; // 93.75%
const STRIP_HEIGHT_PERCENT = (13 / 192) * 100; // ~6.77%

export const CARD_FRAME_COLORS: CardFrameColorOption[] = [
  {
    value: 'classic',
    label: 'Classic',
    url: 'https://cdn.sgxp.me/media/general/35/sprite_icon_image-1766650692338.png',
    swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecardmini_12-1789066017315.png',
    gradientTop: '#002705',
    gradientBottom: '#12a740',
  },
  { value: 'red', label: 'Red', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecard_01-1789021521322.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecardmini_01-1789066010521.png', gradientTop: '#40110a', gradientBottom: '#ff492b', heightPercent: FRAME_HEIGHT_PERCENT },
  { value: 'violet', label: 'Violet', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecard_02-1789021522563.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecardmini_02-1789066011274.png', gradientTop: '#1d0f36', gradientBottom: '#8142ee', heightPercent: FRAME_HEIGHT_PERCENT },
  { value: 'taupe', label: 'Taupe', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecard_03-1789021523717.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecardmini_03-1789066011862.png', gradientTop: '#222120', gradientBottom: '#97908e', heightPercent: FRAME_HEIGHT_PERCENT },
  { value: 'sage', label: 'Sage', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecard_04-1789021524935.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecardmini_04-1789066012444.png', gradientTop: '#2f302c', gradientBottom: '#d0d4bf', heightPercent: FRAME_HEIGHT_PERCENT },
  { value: 'blue', label: 'Blue', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecard_05-1789021526172.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecardmini_05-1789066012976.png', gradientTop: '#13133c', gradientBottom: '#5454ff', heightPercent: FRAME_HEIGHT_PERCENT },
  { value: 'green', label: 'Green', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecard_06-1789021527402.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecardmini_06-1789066013556.png', gradientTop: '#041b08', gradientBottom: '#127622', heightPercent: FRAME_HEIGHT_PERCENT },
  { value: 'orange', label: 'Orange', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecard_07-1789021528650.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecardmini_07-1789066014370.png', gradientTop: '#36260e', gradientBottom: '#eea73e', heightPercent: FRAME_HEIGHT_PERCENT },
  { value: 'gold', label: 'Gold', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecard_08-1789021529821.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecardmini_08-1789066014898.png', gradientTop: '#372e03', gradientBottom: '#f1ca0b', heightPercent: FRAME_HEIGHT_PERCENT },
  { value: 'purple', label: 'Purple', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecard_09-1789021530988.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecardmini_09-1789066015476.png', gradientTop: '#1e0036', gradientBottom: '#8300ee', heightPercent: FRAME_HEIGHT_PERCENT },
  { value: 'teal', label: 'Teal', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecard_10-1789021532176.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecardmini_10-1789066016053.png', gradientTop: '#092e21', gradientBottom: '#28c991', heightPercent: FRAME_HEIGHT_PERCENT },
  { value: 'crimson', label: 'Crimson', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecard_11-1789021533358.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritecardmini_11-1789066016682.png', gradientTop: '#2d0812', gradientBottom: '#c7214d', heightPercent: FRAME_HEIGHT_PERCENT },
  // 'charcoal' (sgxp_spritecard_12) was dropped - redundant with 'classic', which is already charcoal-colored.
];

// The strip images are NOT numbered to match the same colors as the frame images (e.g.
// sgxp_spritestrip_01 is blue, not red like sgxp_spritecard_01) - verified by eye against
// each file. This is its own independent 12-color palette, not a parallel set to the frame's.
export const CARD_STRIP_COLORS: CardStripColorOption[] = [
  // '' url = no strip layer; classic is already blue, so a separate 'Blue' strip option would be
  // redundant - but it still needs a swatchUrl to display in the picker stack, so it reuses the
  // blue strip art (sgxp_spritestrip_01) purely as its thumbnail.
  { value: 'classic', label: 'Classic', url: '', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_01-1789021522048.png', accentColor: '#2a5fff' },
  { value: 'red', label: 'Red', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_02-1789021523154.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_02-1789021523154.png', accentColor: '#cc2a1a', heightPercent: STRIP_HEIGHT_PERCENT },
  { value: 'orange', label: 'Orange', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_03-1789021524346.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_03-1789021524346.png', accentColor: '#d68a2e', heightPercent: STRIP_HEIGHT_PERCENT },
  { value: 'green', label: 'Green', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_04-1789021525574.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_04-1789021525574.png', accentColor: '#33a832', heightPercent: STRIP_HEIGHT_PERCENT },
  { value: 'violet', label: 'Violet', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_05-1789021526854.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_05-1789021526854.png', accentColor: '#7d3fd9', heightPercent: STRIP_HEIGHT_PERCENT },
  { value: 'magenta', label: 'Magenta', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_06-1789021528080.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_06-1789021528080.png', accentColor: '#d94fc0', heightPercent: STRIP_HEIGHT_PERCENT },
  { value: 'silver', label: 'Silver', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_07-1789021529214.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_07-1789021529214.png', accentColor: '#b8bec4', heightPercent: STRIP_HEIGHT_PERCENT },
  { value: 'charcoal', label: 'Charcoal', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_08-1789021530407.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_08-1789021530407.png', accentColor: '#3a4152', heightPercent: STRIP_HEIGHT_PERCENT },
  { value: 'brown', label: 'Brown', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_09-1789021531621.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_09-1789021531621.png', accentColor: '#b5652f', heightPercent: STRIP_HEIGHT_PERCENT },
  { value: 'teal', label: 'Teal', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_10-1789021532789.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_10-1789021532789.png', accentColor: '#2bbfa0', heightPercent: STRIP_HEIGHT_PERCENT },
  { value: 'cyan', label: 'Cyan', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_11-1789021533945.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_11-1789021533945.png', accentColor: '#3bc7e0', heightPercent: STRIP_HEIGHT_PERCENT },
  { value: 'emerald', label: 'Emerald', url: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_12-1789021535168.png', swatchUrl: 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_12-1789021535168.png', accentColor: '#2ecc71', heightPercent: STRIP_HEIGHT_PERCENT },
];

// Cropped directly from the bottom 13px of the classic frame image (see CARD_FRAME_COLORS
// above) - used only as a rendering fallback below, when the strip is left at 'classic' but
// paired with a non-classic frame, whose shorter image leaves that bottom strip of the card
// blank. This is NOT a selectable strip option (frame/strip stay fully independent - picking a
// frame color never changes what strip color is selected), it's always the same fixed classic
// bar so pairing "Strip: Classic" with any frame color renders identically no matter which.
const CLASSIC_STRIP_FALLBACK_URL = 'https://cdn.sgxp.me/media/35/general/sgxp_spritestrip_classic-1789027550904.png';

let cardImagesPreloaded = false;

/**
 * Warms the browser's image cache for every frame/strip preset so cycling through the picker
 * doesn't pop-in/flicker on an image's first appearance (they're CSS background-images, which
 * the browser otherwise only fetches the first time that exact color is actually shown).
 * Safe to call repeatedly/from multiple components - only does the work once per page load.
 */
export function ensureCardImagesPreloaded() {
  if (cardImagesPreloaded || typeof window === 'undefined') return;
  cardImagesPreloaded = true;

  const urls = [
    ...CARD_FRAME_COLORS.map(c => c.url),
    ...CARD_FRAME_COLORS.map(c => c.swatchUrl),
    ...CARD_STRIP_COLORS.map(c => c.url),
    ...CARD_STRIP_COLORS.map(c => c.swatchUrl),
    CLASSIC_STRIP_FALLBACK_URL,
  ].filter(Boolean);

  for (const url of urls) {
    const img = new Image();
    img.src = url;
  }
}

export interface GradientOverride {
  top: string;
  bottom: string;
}

/**
 * `gradientOverrides` comes from the CMS-editable "Card Color Presets" global
 * (see src/lib/cardColorGradients.svelte.ts) and takes priority over the
 * gradientTop/gradientBottom baked into CARD_FRAME_COLORS above, which are just the
 * fallback used until that global has loaded (or if a preset's row is missing/invalid).
 */
export function getCardColorUrls(
  cardColor?: string | null,
  stripColor?: string | null,
  gradientOverrides?: Record<string, GradientOverride>
) {
  const frame = CARD_FRAME_COLORS.find(c => c.value === (cardColor || 'classic')) ?? CARD_FRAME_COLORS[0];
  const strip = CARD_STRIP_COLORS.find(c => c.value === (stripColor || 'classic')) ?? CARD_STRIP_COLORS[0];
  const override = gradientOverrides?.[frame.value];

  // Rendering-only fallback - doesn't change which strip is "selected", just fills what would
  // otherwise be a blank gap at the bottom of a non-classic frame. See CLASSIC_STRIP_FALLBACK_URL.
  const stripUrl = !strip.url && frame.value !== 'classic' ? CLASSIC_STRIP_FALLBACK_URL : strip.url;

  return {
    frameUrl: frame.url,
    stripUrl,
    frameHeightPercent: frame.heightPercent ?? 100,
    stripHeightPercent: strip.heightPercent ?? STRIP_HEIGHT_PERCENT,
    gradientTop: override?.top ?? frame.gradientTop,
    gradientBottom: override?.bottom ?? frame.gradientBottom,
  };
}
