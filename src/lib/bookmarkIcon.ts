// Pixel-art bookmark ribbon for the navbar's Bookmarks menu item, drawn in the
// same style as the other nav icons (white outer outline, black inner outline,
// shaded fill - see public/img/nav_icons/). Built as an SVG data URL, like the
// presence cans (sodaCan.ts), so there's no extra image to upload to R2.

const PALETTE: Record<string, string> = {
  A: '#ffffff',
  B: '#000000',
  H: '#f47d61', // highlight (same red as the uploads icon's accent)
  R: '#dd4a3f',
  D: '#a3302f', // shadow
};

const GRID = [
  '.AAAAAAAAAAAA.',
  'ABBBBBBBBBBBBA',
  'ABHHHHHHHHHDBA',
  'ABHRRRRRRRRDBA',
  'ABHRRRRRRRRDBA',
  'ABHRRRRRRRRDBA',
  'ABHRRRRRRRRDBA',
  'ABHRRRRRRRRDBA',
  'ABHRRRRRRRRDBA',
  'ABHRRRRRRRRDBA',
  'ABHRRRRRRRRDBA',
  'ABHRRRRRRRRDBA',
  'ABHRRRRRRRRDBA',
  'ABHRRRBBRRRDBA',
  'ABHRRBAABRRDBA',
  'ABHRBA..ABRDBA',
  'ABHBA....ABDBA',
  'ABBA......ABBA',
  '.AA........AA.',
];

export const BOOKMARK_ICON_WIDTH = GRID[0].length;
export const BOOKMARK_ICON_HEIGHT = GRID.length;

function toDataUrl(): string {
  let rects = '';
  GRID.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = PALETTE[row[x]];
      if (color) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
    }
  });
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BOOKMARK_ICON_WIDTH}" height="${BOOKMARK_ICON_HEIGHT}" ` +
    `viewBox="0 0 ${BOOKMARK_ICON_WIDTH} ${BOOKMARK_ICON_HEIGHT}" shape-rendering="crispEdges">${rects}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const BOOKMARK_ICON_URL = toDataUrl();
