"""
Generates image atlases for rendering a pixel font as images instead of live text.

Why: Chrome on Windows anti-aliases text differently depending on how it's composited
(LCD vs grayscale, which flips during animations/hover), which visibly blurs pixel fonts.
Images aren't run through the text rasterizer, so they stay exactly as drawn. This is the
same idea as the sprite cards' charMap text, but generated straight from the font file.

Only works for true pixel fonts: every outline point on the font's pixel grid, no curves
(this script checks and refuses otherwise).

Outputs (into --out):
  <name>-fill.png     glyph shapes, white on transparent - used as a CSS mask, so the
                      letters take the theme's --font-color
  <name>-outline.png  glyphs dilated by 1px in all 8 directions (the old 8-way text-shadow),
                      baked in OUTLINE_COLOR - drawn as a plain background image
  <name>.json         per-character atlas offsets/advances
  --ts <path>         optionally, the same metrics as the TypeScript module PixelText reads,
                      pointing at <--url-base><name>-fill-v<N>.png / -outline-v<N>.png

Besides the font's own characters, the atlas gets DERIVED_GLYPHS: extra characters built by
transforming an existing glyph, so they share the font's exact stroke style (e.g. the nav
dropdown carets, which the font doesn't have, are its '>' turned on its side).

Usage (needs `pip install fonttools`), from the repo root:

  python scripts/generate-pixel-font-atlas.py src/styles/fonts/BN6FontTinyExt-fixed.ttf
      --size 16 --name nav-font --version 2 --out <dir> --ts src/lib/pixelFonts/navFont.ts

Upload the two PNGs to R2 as img/fonts/<name>-fill-v<N>.png and
img/fonts/<name>-outline-v<N>.png. They're served as immutable, so always bump --version
rather than overwriting an existing upload.

ORDER MATTERS: upload the PNGs *before* running with --ts (or before a dev server/deploy can
see the regenerated module). Cloudflare answers a not-yet-uploaded URL with a 404 that
browsers are told to cache for 4 hours (Cache-Control: max-age=14400), so any page load in
that gap leaves the browser without that atlas - e.g. letters missing - long after the
upload lands. To be safe, run once without --ts, upload, then run again with --ts.
"""
import argparse, json, struct, zlib, os
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen

OUTLINE_COLOR = (0x1D, 0x1D, 0x20)  # --bg-color, the outline every theme's nav text uses
FILL_COLOR = (255, 255, 255)        # mask only - the actual color comes from CSS
CHARS = [chr(c) for c in range(32, 127)]

# Extra characters made from an existing glyph: (new char, source char, transform, top row).
# The source glyph's ink is cropped, transformed, and placed with its first row at `top`
# (row 0 = top of the line box); the cell is exactly as wide as the result, so spacing
# around it is up to the CSS. 'rot_down' turns a right-pointing glyph to point down,
# 'rot_up' to point up.
DERIVED_GLYPHS = [
    ('▾', '>', 'rot_down', 7),  # ▾ nav dropdown caret, closed
    ('▴', '>', 'rot_up', 7),    # ▴ nav dropdown caret, open
]


def write_png(path, width, height, rgba_rows):
    raw = b''.join(b'\x00' + bytes(row) for row in rgba_rows)
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)))
        f.write(chunk(b'IDAT', zlib.compress(raw, 9)))
        f.write(chunk(b'IEND', b''))


def glyph_contours(glyph_set, name):
    pen = RecordingPen()
    glyph_set[name].draw(pen)
    contours, cur = [], []
    for op, args in pen.value:
        if op == 'moveTo':
            cur = [args[0]]
        elif op == 'lineTo':
            cur.append(args[0])
        elif op in ('closePath', 'endPath'):
            if cur:
                contours.append(cur)
            cur = []
        else:
            raise SystemExit(f'glyph {name!r} has curves ({op}) - not a pure pixel font')
    return contours


def winding(contours, x, y):
    """Nonzero winding number of point (x, y) - TrueType's fill rule."""
    wn = 0
    for pts in contours:
        for i in range(len(pts)):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % len(pts)]
            if y0 <= y < y1 and (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) > 0:
                wn += 1
            elif y1 <= y < y0 and (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) < 0:
                wn -= 1
    return wn


def crop(bmp):
    ys = [y for y, row in enumerate(bmp) if any(row)]
    xs = [x for x in range(len(bmp[0])) if any(row[x] for row in bmp)]
    return [row[xs[0]:xs[-1] + 1] for row in bmp[ys[0]:ys[-1] + 1]]


def transform(ink, kind):
    rotated = [list(col) for col in zip(*ink)]  # transpose: '>' becomes a down-pointing 'v'
    if kind == 'rot_down':
        return rotated
    if kind == 'rot_up':
        return rotated[::-1]
    raise SystemExit(f'unknown transform {kind!r}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('font')
    ap.add_argument('--size', type=int, default=16, help='CSS font-size the atlas is drawn for')
    ap.add_argument('--name', default='nav-font')
    ap.add_argument('--out', default='.')
    ap.add_argument('--version', type=int, default=1, help='-vN suffix of the uploaded PNGs')
    ap.add_argument('--url-base', default='https://cdn.sgxp.me/img/fonts/')
    ap.add_argument('--ts', help='also write the TypeScript metrics module to this path')
    a = ap.parse_args()

    font = TTFont(a.font)
    upm = font['head'].unitsPerEm
    unit = upm / a.size  # font units per CSS pixel
    ascent = font['OS/2'].sTypoAscender
    descent = -font['OS/2'].sTypoDescender
    if ascent % unit or descent % unit:
        raise SystemExit('ascent/descent are not whole pixels at this size')
    asc_px, line_px = int(ascent / unit), int((ascent + descent) / unit)
    cmap, gs, hmtx = font.getBestCmap(), font.getGlyphSet(), font['hmtx']

    glyphs, bitmaps = {}, {}
    for ch in CHARS:
        name = cmap.get(ord(ch))
        if name is None:
            continue
        adv = hmtx[name][0]
        if adv % unit:
            raise SystemExit(f'advance of {ch!r} is not a whole pixel')
        contours = glyph_contours(gs, name)
        for pts in contours:
            for (x, y) in pts:
                if x % unit or y % unit:
                    raise SystemExit(f'{ch!r} has a point off the pixel grid - not a pure pixel font')
        w = int(adv / unit)
        # Sample each pixel at its center; row 0 is the top of the line box.
        bmp = [[winding(contours, (px + 0.5) * unit, (asc_px - py - 0.5) * unit) != 0
                for px in range(w)] for py in range(line_px)]
        bitmaps[ch], glyphs[ch] = bmp, {'w': w}

    for ch, src, kind, top in DERIVED_GLYPHS:
        ink = transform(crop(bitmaps[src]), kind)
        w = len(ink[0])
        bmp = [[False] * w for _ in range(line_px)]
        for y, row in enumerate(ink):
            bmp[top + y] = row
        bitmaps[ch], glyphs[ch] = bmp, {'w': w}

    # Fill atlas: cells of (advance x line height), packed left to right.
    fill_w = sum(g['w'] for g in glyphs.values())
    fill = [[0] * (fill_w * 4) for _ in range(line_px)]
    # Outline atlas: every cell padded 1px on each side for the dilation.
    out_w = sum(g['w'] + 2 for g in glyphs.values())
    outline = [[0] * (out_w * 4) for _ in range(line_px + 2)]
    fx = ox = 0
    for ch, g in glyphs.items():
        bmp, w = bitmaps[ch], g['w']
        g['fx'], g['ox'] = fx, ox
        for py in range(line_px):
            for px in range(w):
                if bmp[py][px]:
                    i = (fx + px) * 4
                    fill[py][i:i + 4] = [*FILL_COLOR, 255]
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            j = (ox + 1 + px + dx) * 4
                            outline[py + 1 + dy][j:j + 4] = [*OUTLINE_COLOR, 255]
        fx += w
        ox += w + 2

    os.makedirs(a.out, exist_ok=True)
    write_png(os.path.join(a.out, f'{a.name}-fill.png'), fill_w, line_px, fill)
    write_png(os.path.join(a.out, f'{a.name}-outline.png'), out_w, line_px + 2, outline)
    meta = {'size': a.size, 'ascent': asc_px, 'lineHeight': line_px, 'glyphs': glyphs}
    with open(os.path.join(a.out, f'{a.name}.json'), 'w') as f:
        json.dump(meta, f, separators=(',', ':'))
    if a.ts:
        write_ts(a, meta)
    print(f'{len(glyphs)} glyphs, fill atlas {fill_w}x{line_px}, outline atlas {out_w}x{line_px + 2}')


def write_ts(a, meta):
    export = ''.join(p.capitalize() if i else p for i, p in enumerate(a.name.split('-')))
    rows = '\n'.join(f"    {json.dumps(ch, ensure_ascii=False)}: {{ w: {g['w']}, fx: {g['fx']}, ox: {g['ox']} }},"
                     for ch, g in meta['glyphs'].items())
    url = lambda kind: f"{a.url_base}{a.name}-{kind}-v{a.version}.png"
    ts = f"""// Image atlas for rendering a pixel font as images - see PixelText.svelte for why.
// GENERATED by scripts/generate-pixel-font-atlas.py from {os.path.basename(a.font)}; don't
// edit by hand. Regenerate with that script (bumping --version), then upload the two PNGs
// to R2 at the URLs below (they're cached as immutable, so never overwrite an upload).
// Besides ASCII, includes the script's derived glyphs: '▾' / '▴' (nav dropdown carets).

export interface PixelGlyph {{
  /** advance width in px (also the fill cell width) */
  w: number;
  /** x offset of this glyph's cell in the fill atlas */
  fx: number;
  /** x offset of this glyph's cell in the outline atlas (cells are w + 2 wide) */
  ox: number;
}}

export interface PixelFont {{
  /** white-on-transparent glyph shapes, used as a CSS mask so text takes the current color */
  fillUrl: string;
  /** glyphs dilated 1px in all 8 directions, baked in #1D1D20 (the old text-shadow outline) */
  outlineUrl: string;
  /** CSS font-size the atlas was drawn for - it's only pixel-exact at this size */
  size: number;
  /** px from the top of the line box to the baseline */
  ascent: number;
  lineHeight: number;
  glyphs: Record<string, PixelGlyph>;
}}

export const {export}: PixelFont = {{
  fillUrl: '{url('fill')}',
  outlineUrl: '{url('outline')}',
  size: {meta['size']},
  ascent: {meta['ascent']},
  lineHeight: {meta['lineHeight']},
  glyphs: {{
{rows}
  }},
}};
"""
    with open(a.ts, 'w', encoding='utf-8', newline='') as f:
        f.write(ts)


if __name__ == '__main__':
    main()
