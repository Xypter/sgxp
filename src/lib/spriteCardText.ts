import { charMap, altNumberMap, type CharacterMap } from './charMap';

// The sprite cards' bitmap-font "sprite text" (card number, title, author, game, size,
// date, file size), shared by every card grid: SpriteBrowser, SpriteCard ("More By This
// Artist"), and the profile page's ProfileSprites/ProfileFavorites.
//
// Each character is an empty <span> showing its cell of the glyph atlas. The spans only
// carry a class (`sg-<code point>` for charMap, `sn-<code point>` for altNumberMap); the
// cell sizes and atlas offsets live once in a stylesheet generated from charMap by
// glyphStylesheet(), served as /sprite-glyphs.css. (They used to be ~250-character inline
// styles on every one of the ~7,500 spans on /sprites - most of the page's HTML, and slow
// to parse and style.) The text is built as an HTML string and rendered with {@html}, so
// it comes with the server-rendered page, and hydrating a card doesn't mean hydrating
// ~100 spans one by one.

const ATLAS_URL = 'https://cdn.sgxp.me/media/general/35/DFC6vib-1766650806712.png';
const ATLAS_SIZE = '400px 14px';

const classPrefix = (characterMap: CharacterMap) => (characterMap === altNumberMap ? 'sn' : 'sg');

// Only characters in the map produce markup - which is what makes the {@html} output safe
// for any text: nothing from the input ever reaches the HTML except as a known class name.
function glyph(char: string, characterMap: CharacterMap): string {
	if (!characterMap[char]) return '';
	const prefix = classPrefix(characterMap);
	return `<span class="${prefix} ${prefix}-${char.codePointAt(0)}"></span>`;
}

const NEWLINE = '<div class="sprite-newline"></div>';

export function textToSprite(text: string | null | undefined, characterMap: CharacterMap = charMap): string {
	if (!text || typeof text !== 'string') return '';
	let html = '';
	for (const char of text.toUpperCase()) html += glyph(char, characterMap);
	return html;
}

export function formattedNumberToAltSprite(numString: string | null | undefined): string {
	if (!numString || typeof numString !== 'string') return '';
	return textToSprite(numString, altNumberMap);
}

// Width in atlas pixels, including the 1px gap between charMap letters (altNumberMap has none).
function wordWidth(word: string, characterMap: CharacterMap, gap: number): number {
	let width = 0;
	for (let i = 0; i < word.length; i++) {
		width += characterMap[word[i]]?.width ?? 4; // unknown characters count as 4px
		if (i < word.length - 1) width += characterMap[word[i]] ? gap : 1;
	}
	return width;
}

// Word-wraps to maxWidth pixels, ending with "..." if the text needs more than maxLines.
export function textToSpriteWithWrapping(
	text: string | null | undefined,
	characterMap: CharacterMap,
	maxWidth: number | null = null,
	maxLines: number | null = null
): string {
	if (!text || typeof text !== 'string') return '';
	if (!maxWidth) return textToSprite(text, characterMap);

	const gap = characterMap === altNumberMap ? 0 : 1;
	let html = '';
	let lineWidth = 0;
	let line = 0;
	for (const word of text.toUpperCase().split(' ')) {
		const width = wordWidth(word, characterMap, gap);
		const spaceWidth = lineWidth > 0 ? (characterMap[' ']?.width ?? 3) + gap : 0;

		if (lineWidth > 0 && lineWidth + spaceWidth + width > maxWidth) {
			line++;
			if (maxLines && line >= maxLines) {
				html += textToSprite('...', characterMap);
				break;
			}
			html += NEWLINE;
			lineWidth = 0;
		}
		if (lineWidth > 0) {
			html += glyph(' ', characterMap);
			lineWidth += spaceWidth;
		}
		html += textToSprite(word, characterMap);
		lineWidth += width;
	}
	return html;
}

export function count(number: number): string {
	return String(number).padStart(5, '0');
}

export function formatBytes(bytes: number, decimals: number = 2): string {
	if (!+bytes) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export interface SpriteCardText {
	number: string;
	title: string;
	author: string;
	gameName: string;
	dimensions: string;
	createdDate: string;
	fileSize: string;
}

// Built once: toLocaleDateString() constructs a new formatter on every call, which was
// most of the grid's hydration time (~330ms of it at 6x CPU throttling, for 73 cards
// formatted twice - server UTC, then local once mounted).
const DATE_OPTIONS: Intl.DateTimeFormatOptions = { year: '2-digit', month: '2-digit', day: '2-digit' };
let localDateFormat: Intl.DateTimeFormat | undefined;
let utcDateFormat: Intl.DateTimeFormat | undefined;

// All of a card's text fields as glyph HTML. The upload date is shown in the viewer's
// own timezone, which the server can't know - server renders pass localDate: false to
// get UTC, and components switch to local once mounted (only dates near midnight differ).
export function spriteCardText(sprite: any, { localDate = true }: { localDate?: boolean } = {}): SpriteCardText {
	const format = localDate
		? (localDateFormat ??= new Intl.DateTimeFormat('en-US', DATE_OPTIONS))
		: (utcDateFormat ??= new Intl.DateTimeFormat('en-US', { ...DATE_OPTIONS, timeZone: 'UTC' }));
	const date = sprite.createdAt ? format.format(new Date(sprite.createdAt)) : '';
	return {
		number: formattedNumberToAltSprite(count(sprite.id)),
		title: textToSpriteWithWrapping(sprite.title || '', charMap, 100, 2),
		author: textToSprite(sprite.author?.displayName || sprite.author?.username || ''),
		gameName: textToSpriteWithWrapping(sprite.section?.name || '', charMap, 150, 1),
		dimensions: textToSprite(sprite.image?.width && sprite.image?.height ? `${sprite.image.width} X ${sprite.image.height}` : ''),
		createdDate: textToSprite(date),
		fileSize: textToSprite(sprite.image?.filesize ? formatBytes(sprite.image.filesize) : '0 Bytes'),
	};
}

// The stylesheet for the glyph classes above (served by src/pages/sprite-glyphs.css.ts).
export function glyphStylesheet(): string {
	const rules = [
		`.sg,.sn{display:inline-block;background-image:url('${ATLAS_URL}');background-size:${ATLAS_SIZE}}`,
		'.sg{margin-right:1px}',
		'.sn{margin-right:0}',
		'.sprite-newline{display:block;width:100%}',
	];
	for (const characterMap of [charMap, altNumberMap]) {
		const prefix = classPrefix(characterMap);
		for (const [char, g] of Object.entries(characterMap)) {
			let rule = `width:${g.width}px;height:${g.height}px;background-position:${g.x}px ${g.y}px`;
			if (g.offsetX) rule += `;margin-left:${g.offsetX}px`;
			if (g.offsetY) rule += `;margin-top:${g.offsetY}px`;
			rules.push(`.${prefix}-${char.codePointAt(0)}{${rule}}`);
		}
	}
	return rules.join('\n') + '\n';
}

export { charMap };
