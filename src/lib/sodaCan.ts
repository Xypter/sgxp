// Soda-Kan: the little can mascots in the navbar's live "who's online" bar,
// and the user-customizable palette they're drawn with.
//
// The sprites are tiny (5x8 idle, 7x6 hop), so instead of shipping a PNG per
// color combination they're stored here as pixel grids of palette *slots*
// and rendered on demand to an SVG data URL. Any palette works without new
// image files, on the server (profile SSR) and in the browser alike.
//
// Users store preset *ids* (Users.sodaCan.body / .eyes in the CMS), never raw
// colors. The CMS only checks the id format, so presets can be added here
// with a site deploy alone - unknown ids fall back to the classic look.

export type CanFrame = 'idle' | 'hop';

// Slots: 1-4 rim metal (fixed), d/m/l body dark/mid/light, e eye, p pupil.
const FRAMES: Record<CanFrame, string[]> = {
  idle: [
    '12324',
    'ddmld',
    'dmele',
    'dmplp',
    'dmmlm',
    'ddmlm',
    'ddmld',
    '11421',
  ],
  hop: [
    '.12324.',
    'ddmeled',
    'dmmplpm',
    'ddmmmld',
    'dddmldd',
    '.11421.',
  ],
};

export const FRAME_SIZE: Record<CanFrame, { w: number; h: number }> = {
  idle: { w: 5, h: 8 },
  hop: { w: 7, h: 6 },
};

const RIM = { '1': '#6c6c6c', '2': '#d8d8fc', '3': '#fcfcfc', '4': '#b4b4d8' };

export interface BodyPreset {
  id: string;
  label: string;
  dark: string;
  mid: string;
  light: string;
}

export interface EyePreset {
  id: string;
  label: string;
  eye: string;
  pupil: string;
}

// Hand-picked 3-step ramps - deriving shades from a single picked color tends
// to look muddy at this size. Each ramp is hue-shifted, not just darkened and
// lightened: the mid is the color itself, the shadow rotates toward blue or
// purple and the highlight toward yellow, pink or cyan (e.g. yellow shades
// into amber rather than olive). Classic keeps the original sprite's colors.
export const BODY_PRESETS: BodyPreset[] = [
  { id: 'classic', label: 'Classic Blue', dark: '#242490', mid: '#2448d8', light: '#6c6cfc' },
  { id: 'red', label: 'Red', dark: '#7a1438', mid: '#d82828', light: '#fc8460' },
  { id: 'orange', label: 'Orange', dark: '#8c2010', mid: '#dc6c00', light: '#fcc044' },
  { id: 'yellow', label: 'Yellow', dark: '#9c5c0c', mid: '#d8b400', light: '#fcf07c' },
  { id: 'lime', label: 'Lime', dark: '#146c3c', mid: '#6cc000', light: '#d8f45c' },
  { id: 'green', label: 'Green', dark: '#0c5a48', mid: '#20a040', light: '#9ce858' },
  { id: 'teal', label: 'Teal', dark: '#0c4868', mid: '#0098a8', light: '#5cf0d0' },
  { id: 'purple', label: 'Purple', dark: '#281c78', mid: '#7c3cd8', light: '#dc8cfc' },
  { id: 'pink', label: 'Pink', dark: '#701a64', mid: '#d8409c', light: '#fc9cc0' },
  { id: 'brown', label: 'Brown', dark: '#3c1820', mid: '#7c4820', light: '#d09c58' },
  { id: 'black', label: 'Black', dark: '#10102a', mid: '#34344a', light: '#646c84' },
  { id: 'white', label: 'White', dark: '#7c7ca8', mid: '#c4c8e0', light: '#fcfcf4' },
];

// Two-toned eyes, like the original artist's black-and-green can: 'eye' is
// the lighter top pixel, 'pupil' the darker one under it, hue-shifted the
// same way as the body ramps (darker toward blue/purple). Classic keeps the
// original sprite's grey-over-black.
export const EYE_PRESETS: EyePreset[] = [
  { id: 'classic', label: 'Classic', eye: '#6c6c90', pupil: '#000000' },
  { id: 'red', label: 'Red', eye: '#fc5040', pupil: '#841040' },
  { id: 'orange', label: 'Orange', eye: '#fca030', pupil: '#983808' },
  { id: 'yellow', label: 'Yellow', eye: '#fcf048', pupil: '#a0700c' },
  { id: 'green', label: 'Green', eye: '#48fc48', pupil: '#10804a' },
  { id: 'cyan', label: 'Cyan', eye: '#50f0fc', pupil: '#146c9a' },
  { id: 'blue', label: 'Blue', eye: '#58a0fc', pupil: '#2330a0' },
  { id: 'purple', label: 'Purple', eye: '#c07cfc', pupil: '#4c268c' },
  { id: 'pink', label: 'Pink', eye: '#fc80d8', pupil: '#8c2670' },
  { id: 'white', label: 'White', eye: '#fcfcfc', pupil: '#9090bc' },
  { id: 'dark', label: 'Dark', eye: '#484858', pupil: '#08080c' },
];

export const DEFAULT_BODY = BODY_PRESETS[0];
export const DEFAULT_EYES = EYE_PRESETS[0];

/** A user's stored choice, as it comes from the CMS (either may be missing). */
export interface SodaCanChoice {
  body?: string | null;
  eyes?: string | null;
}

export function getBodyPreset(id: string | null | undefined): BodyPreset {
  return BODY_PRESETS.find((p) => p.id === id) ?? DEFAULT_BODY;
}

export function getEyePreset(id: string | null | undefined): EyePreset {
  return EYE_PRESETS.find((p) => p.id === id) ?? DEFAULT_EYES;
}

/** Reduces whatever the CMS returned to known preset ids (or null = default look). */
export function normalizeCanChoice(raw: any): { body: string; eyes: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = getBodyPreset(raw.body).id;
  const eyes = getEyePreset(raw.eyes).id;
  if (body === DEFAULT_BODY.id && eyes === DEFAULT_EYES.id) return null;
  return { body, eyes };
}

const spriteCache = new Map<string, string>();

/**
 * Data URL for one frame of a can in the given colors, at native size (1 unit
 * per sprite pixel) - scale it up with width/height plus
 * `image-rendering: pixelated`. Memoized, so it's cheap to call every render.
 */
export function canSpriteUrl(frame: CanFrame, choice?: SodaCanChoice | null): string {
  const body = getBodyPreset(choice?.body);
  const eyes = getEyePreset(choice?.eyes);
  const key = `${frame}|${body.id}|${eyes.id}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;

  const colors: Record<string, string> = {
    ...RIM,
    d: body.dark,
    m: body.mid,
    l: body.light,
    e: eyes.eye,
    p: eyes.pupil,
  };

  // One path per color, each pixel run as a 1-high rectangle.
  const paths = new Map<string, string>();
  FRAMES[frame].forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const slot = row[x];
      let run = 1;
      while (row[x + run] === slot) run++;
      if (slot !== '.') {
        const color = colors[slot];
        paths.set(color, (paths.get(color) ?? '') + `M${x} ${y}h${run}v1h-${run}z`);
      }
      x += run;
    }
  });

  const { w, h } = FRAME_SIZE[frame];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">` +
    [...paths].map(([color, d]) => `<path fill="${color}" d="${d}"/>`).join('') +
    `</svg>`;
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  spriteCache.set(key, url);
  return url;
}
