// Scenery for each site theme, drawn by ThemeBackdrop.astro.
//
// Themes used to paint all of this as a stack of `background-image` layers on
// <body> (up to 35 for Sky Sanctuary), animated via `background-position`
// with `background-attachment: fixed`. That repaints the whole screen with
// every layer on the main thread every frame, and again on every scroll.
// Now each layer is its own fixed element looping with `transform`, which the
// compositor (GPU) runs without touching the main thread, and each layer is
// rasterized once instead of every frame.
//
// Speeds are the old animations' distance / 200s, so everything moves at the
// same pace as before - but each layer now loops over exactly one tile width,
// so the old visible jump when the 200s animation restarted is gone too.
//
// Layers are listed back to front. Sizes are the images' real pixel sizes
// (the loop distance depends on them) - update them if an image changes.

export interface BackdropLayer {
  src: string;
  w: number; // tile width, px
  h: number; // tile height, px
  anchor?: 'bottom' | 'top'; // edge `offset` measures from (default bottom)
  offset?: number; // px from that edge
  x?: number; // starting horizontal offset, px (the loop's phase; for 'none', its left edge)
  speed?: number; // px/s, + moves right, - moves left; omit for static
  drift?: number; // px risen over DRIFT_SECONDS (- sinks), then snaps back
  repeat?: 'x' | 'both' | 'none'; // default 'x'
  fall?: number; // repeat 'both' only: px/s the pattern falls (snow)
  pos?: string; // static repeat 'both' layers: CSS background-position
  flyby?: boolean; // a character sprite crossing the screen (animated GIF on a very wide, mostly empty tile)
}

export interface ThemeBackdrop {
  layers: BackdropLayer[];
  pixelated?: boolean;
  hideBelow?: number; // hide the scenery on viewports narrower than this (px)
}

export const DRIFT_SECONDS = 200;

const DDZ = 'https://cdn.sgxp.me/themes/ddz';
const HPZ = 'https://cdn.sgxp.me/themes/hpz';
const SSZ = 'https://cdn.sgxp.me/themes/ssz';

// Doomsday Zone's world strips + stars, shared with Space Colony ARK. The stars are
// ${DDZ}/stars1.gif and stars2.gif, two still full-screen layers, pre-merged into one
// image by scripts/generate-backdrop-sprites.mjs.
const stars = [
  { src: '/themes/prerendered/ddz-stars.png', w: 512, h: 1232, anchor: 'top', offset: 0 },
] satisfies BackdropLayer[];
const world = (speeds: number[]): BackdropLayer[] =>
  [
    { src: `${DDZ}/world1.png`, w: 512, h: 96, offset: 0 },
    { src: `${DDZ}/world2.png`, w: 512, h: 48, offset: 96 },
    { src: `${DDZ}/world3.png`, w: 512, h: 24, offset: 144 },
    { src: `${DDZ}/world4.png`, w: 512, h: 16, offset: 168 },
    { src: `${DDZ}/world5.png`, w: 512, h: 8, offset: 184 },
    { src: `${DDZ}/world6.png`, w: 512, h: 8, offset: 192 },
    { src: `${DDZ}/world7.png`, w: 512, h: 8, offset: 200 },
  ].map((l, i) => ({ ...l, speed: speeds[i] }));

// SSZ cloud bands: [image, offset, speed px/s]
const cloudBand = (anchor: 'bottom' | 'top', bands: [string, number, number][]): BackdropLayer[] =>
  bands.map(([img, offset, speed]) => ({ src: `${SSZ}/cloud_${img}.png`, w: 512, h: CLOUD_H[img], anchor, offset, speed }));
const CLOUD_H: Record<string, number> = {
  '01': 64, '02': 32, '03': 24, '04': 16, '05': 8, '06': 8, '07': 8, '08': 32, '09': 8, '10': 40,
  '11': 8, '12': 8, '13': 16, '14': 40, '15': 8, '16': 16, '17': 16, '18': 8, '19': 24, '20': 16,
  '22': 32, '23': 24, '24': 16, '25': 8, '26': 8, '27': 8, '28': 32, '29': 8, '30': 24,
};

export const THEME_BACKDROPS: Record<string, ThemeBackdrop> = {
  // Doomsday Zone
  style_v7: {
    pixelated: true,
    hideBelow: 800,
    layers: [
      ...stars,
      ...world([22.5, 20, 17.5, 15, 12.5, 10, 7.5]),
      { src: `${DDZ}/rocks1.png`, w: 700, h: 200, offset: 50, speed: -20, drift: -150 },
      { src: `${DDZ}/rocks2.png`, w: 384, h: 250, offset: 50, speed: -25, drift: -100 },
      { src: `${DDZ}/eggmanboss.gif`, w: 6000, h: 159, offset: 50, x: -2000, speed: 410, flyby: true },
      { src: `${DDZ}/supersonic.gif`, w: 6000, h: 34, offset: 100, x: -2200, speed: 411, flyby: true },
      { src: `${DDZ}/rocks3.png`, w: 500, h: 200, offset: 50, speed: -35, drift: -50 },
      { src: `${DDZ}/rocks4.png`, w: 500, h: 200, offset: 0, speed: -30, drift: 50 },
      { src: `${DDZ}/rocks5.png`, w: 400, h: 300, offset: 0, speed: -25, drift: 50 },
    ],
  },

  // Space Colony ARK
  ark: {
    pixelated: true,
    hideBelow: 800,
    layers: [
      ...stars,
      ...world([25, 20, 15, 12.5, 10, 7.5, 5]),
      { src: '/themes/ark/interior.png', w: 2042, h: 1200, offset: 0 },
      { src: '/themes/ark/sonic.png', w: 52, h: 82, offset: 74, x: 46, repeat: 'none' },
    ],
  },

  // Christmas
  snow: {
    layers: [
      { src: 'https://cdn.sgxp.me/themes/snow/Snowy-BG.gif', w: 2048, h: 1024, repeat: 'both', pos: 'left 0 bottom 0' },
      { src: 'https://cdn.sgxp.me/themes/snow/snow_pattern.gif', w: 256, h: 256, repeat: 'both', x: 200, speed: -11, fall: 30.5 },
      { src: 'https://cdn.sgxp.me/themes/snow/snow_pattern.gif', w: 256, h: 256, repeat: 'both', speed: -25, fall: 35 },
    ],
  },

  // Fireside
  cozy: {
    layers: [{ src: 'https://cdn.sgxp.me/themes/cozy/rs11_s21_n-art-comfy-star-5x.gif', w: 1100, h: 900, repeat: 'both', pos: '0 0' }],
  },

  // Battle Network
  sbn: {
    pixelated: true,
    layers: [{ src: 'https://cdn.sgxp.me/themes/sbn/bg_tiles2.png', w: 200, h: 200, repeat: 'both', pos: 'left 0 bottom 0' }],
  },

  // Hidden Palace Zone
  hpz: {
    layers: [
      { src: `${HPZ}/wall_10.png`, w: 4000, h: 160, anchor: 'top', offset: 0, x: -1500, speed: -2.5 },
      { src: `${HPZ}/wall_09.png`, w: 512, h: 8, offset: 352, speed: -2.5 },
      { src: `${HPZ}/wall_08.png`, w: 512, h: 4, offset: 348, speed: -3.75 },
      { src: `${HPZ}/wall_07.png`, w: 512, h: 4, offset: 344, speed: -5 },
      { src: `${HPZ}/wall_06.png`, w: 512, h: 8, offset: 336, speed: -6.25 },
      { src: `${HPZ}/wall_05.png`, w: 512, h: 8, offset: 328, speed: -7.5 },
      { src: `${HPZ}/wall_04.png`, w: 512, h: 17, offset: 311, speed: -8.75 },
      { src: `${HPZ}/wall_03.png`, w: 512, h: 8, offset: 303, speed: -10 },
      { src: `${HPZ}/wall_02.png`, w: 512, h: 47, offset: 256, speed: -11.25 },
      { src: `${HPZ}/wall_01.png`, w: 1536, h: 256, offset: 100, speed: -12.5 },
      { src: `${HPZ}/floor_01.png`, w: 256, h: 400, offset: -300, speed: -17.5 },
      { src: `${HPZ}/sonic_run.gif`, w: 12000, h: 36, offset: 100, x: -3000, speed: 450, flyby: true },
      { src: `${HPZ}/boss.gif`, w: 12000, h: 228, offset: 120, x: -3500, speed: 450, drift: -20, flyby: true },
    ],
  },

  // MFZ
  mfz: {
    layers: [{ src: 'https://cdn.sgxp.me/themes/mfz/bg_02.png', w: 246, h: 246, repeat: 'both', pos: '0 0' }],
  },

  // Sky Sanctuary Zone
  ssz: {
    layers: [
      ...cloudBand('top', [
        ['30', 200, 1.25], ['29', 192, 2.5], ['28', 160, 3.75], ['27', 152, 5], ['26', 144, 7.5],
        ['25', 136, 10], ['24', 120, 12.5], ['23', 96, 30], ['22', 64, 40], ['01', 0, 50],
      ]),
      ...cloudBand('bottom', [
        ['20', 384, 2.5], ['19', 360, 5], ['18', 352, 1], ['17', 336, -1], ['16', 320, 4],
        ['15', 312, -2.5], ['14', 272, 3], ['13', 256, -4], ['12', 248, 4.5], ['11', 240, -5],
        ['10', 200, 1.25], ['09', 192, 2.5], ['08', 160, 3.75], ['07', 152, 5], ['06', 144, 7.5],
        ['05', 136, 10], ['04', 120, 12.5], ['03', 96, 30], ['02', 64, 40], ['01', 0, 50],
      ]),
      { src: `${SSZ}/deathegg.png`, w: 12000, h: 104, offset: 500, x: -100, speed: 5.5, drift: -200 },
      { src: `${SSZ}/mecha_01.gif`, w: 12000, h: 71, offset: 250, speed: -400, flyby: true },
      { src: `${SSZ}/mecha_02.gif`, w: 12000, h: 35, offset: 500, x: -7500, speed: 400, flyby: true },
      { src: `${SSZ}/tornado_01.gif`, w: 12000, h: 100, offset: 250, x: 1000, speed: -400, flyby: true },
      { src: `${SSZ}/tornado_02.gif`, w: 12000, h: 49, offset: 500, x: -7000, speed: 400, flyby: true },
    ],
  },
};
