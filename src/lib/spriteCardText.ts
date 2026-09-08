import { charMap, altNumberMap } from './charMap';

// Extracted from SpriteBrowser.svelte so the same bitmap-font "sprite text" rendering
// can be reused by SpriteCard.svelte for the "More By This Artist" recommendations.

export interface SpriteTextItem {
	key: string;
	style?: string;
	isNewline?: boolean;
}

function createCharacterSprite(char: string, characterMap: any, isAltNumberMap: boolean, index: number): SpriteTextItem | null {
	if (characterMap[char]) {
		const charData = characterMap[char];
		const width = charData.width;
		const height = charData.height;
		const offsetX = charData.offsetX || 0;
		const offsetY = charData.offsetY || 0;
		const marginRight = isAltNumberMap ? '0px' : '1px';

		return {
			key: `${char}-${index}`,
			style: `display: inline-block; width: ${width}px; height: ${height}px; background-image: url('https://cdn.sgxp.me/media/general/35/DFC6vib-1766650806712.png');
 background-size: 400px 14px; background-position: ${charData.x}px ${charData.y}px; margin-left: ${offsetX}px; margin-right: ${marginRight}; margin-top: ${offsetY}px;`
		};
	}
	return null;
}

export function textToSprite(text: string | null | undefined): SpriteTextItem[] {
	if (!text || typeof text !== 'string') {
		return [];
	}
	const characters = text.toUpperCase().split('');
	return characters
		.map((char, index) => createCharacterSprite(char, charMap, false, index))
		.filter((item): item is SpriteTextItem => item !== null);
}

export function count(number: number): string {
	if (number <= 9) {
		return '0000' + number;
	} else if (number > 9 && number <= 99) {
		return '000' + number;
	} else if (number > 99 && number <= 999) {
		return '00' + number;
	} else if (number > 999 && number <= 9999) {
		return '0' + number;
	} else {
		return number.toString();
	}
}

export function formattedNumberToAltSprite(numString: string | null | undefined): SpriteTextItem[] {
	if (!numString || typeof numString !== 'string') {
		return [];
	}
	const digits = numString.split('');
	return digits
		.map((digit, index) => createCharacterSprite(digit, altNumberMap, true, index))
		.filter((item): item is SpriteTextItem => item !== null);
}

export function textToSpriteWithWrapping(
	text: string | null | undefined,
	characterMap: any,
	maxWidth: number | null = null,
	maxLines: number | null = null
): SpriteTextItem[] {
	if (!text || typeof text !== 'string') {
		return [];
	}
	const input = text.toString().toUpperCase();
	const isAltNumberMap = characterMap === altNumberMap;
	if (!maxWidth) {
		const characters = input.split('');
		return characters
			.map((char, index) => createCharacterSprite(char, characterMap, isAltNumberMap, index))
			.filter((item): item is SpriteTextItem => item !== null);
	}

	const words = input.split(' ');
	let currentLineWidth = 0;
	let currentLine = 0;
	let elements: SpriteTextItem[] = [];
	let charIndex = 0;
	for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
		const word = words[wordIndex];
		let wordWidth = 0;
		for (let i = 0; i < word.length; i++) {
			const char = word[i];
			if (characterMap[char]) {
				wordWidth += characterMap[char].width;
				if (!isAltNumberMap && i < word.length - 1) {
					wordWidth += 1;
				}
			} else {
				wordWidth += 4;
				if (i < word.length - 1) {
					wordWidth += 1;
				}
			}
		}

		let spaceWidth = 0;
		if (currentLineWidth > 0) {
			spaceWidth = characterMap[' '] ? characterMap[' '].width : 3;
			if (!isAltNumberMap) {
				spaceWidth += 1;
			}
		}

		if (currentLineWidth > 0 && currentLineWidth + spaceWidth + wordWidth > maxWidth) {
			currentLine++;
			if (maxLines && currentLine >= maxLines) {
				const ellipsis = '...';
				for (let i = 0; i < ellipsis.length; i++) {
					const char = ellipsis[i];
					const sprite = createCharacterSprite(char, characterMap, isAltNumberMap, charIndex++);
					if (sprite) elements.push(sprite);
				}
				break;
			}
			elements.push({
				key: `newline-${currentLine}`,
				isNewline: true
			});
			currentLineWidth = 0;
		}

		if (currentLineWidth > 0) {
			const spaceSprite = createCharacterSprite(' ', characterMap, isAltNumberMap, charIndex++);
			if (spaceSprite) elements.push(spaceSprite);
			currentLineWidth += spaceWidth;
		}

		for (let i = 0; i < word.length; i++) {
			const char = word[i];
			const sprite = createCharacterSprite(char, characterMap, isAltNumberMap, charIndex++);
			if (sprite) elements.push(sprite);
			if (characterMap[char]) {
				currentLineWidth += characterMap[char].width;
				if (!isAltNumberMap && i < word.length - 1) {
					currentLineWidth += 1;
				}
			} else {
				currentLineWidth += 4;
				if (i < word.length - 1) {
					currentLineWidth += 1;
				}
			}
		}
	}

	return elements;
}

export function formatBytes(bytes: number, decimals: number = 2): string {
	if (!+bytes) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export { charMap };
