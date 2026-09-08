// Per-browser (not per-account) display preferences for the sprite viewer,
// persisted to localStorage rather than the user's Payload profile since it's
// a purely cosmetic client-side setting.

const PLAIN_BACKGROUND_KEY = 'sgxp-sprite-viewer-plain-background';

export function getPlainSpriteBackground(): boolean {
	if (typeof localStorage === 'undefined') return false;
	try {
		return localStorage.getItem(PLAIN_BACKGROUND_KEY) === 'true';
	} catch {
		return false;
	}
}

export function setPlainSpriteBackground(value: boolean): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(PLAIN_BACKGROUND_KEY, value ? 'true' : 'false');
	} catch {
		// Ignore (e.g. private browsing / storage disabled)
	}
}
