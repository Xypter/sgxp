import DOMPurify from 'dompurify';

// Shared data helpers for the Smack Jeeves comic reader (/jeevespage).

export const CDN_BASE = 'https://cdn.sgxp.me/smackjeeves_archive';

export interface ArchiveComment {
  nickname?: string;
  imgPath?: string;
  commentText?: string;
  time: string;
}

export interface ArchiveChapter {
  articleTitle?: string;
  authorComment?: string;
  distributedDate?: string;
  pagesPath?: string[];
  comments?: ArchiveComment[];
}

export interface ArchiveAuthor {
  name?: string;
  imgPath?: string;
}

export interface ComicMetadata {
  title?: string;
  description?: string;
  genres?: string[];
  isCompleted?: boolean;
  authors?: ArchiveAuthor[];
  chapters: ArchiveChapter[];
}

/** The comic's row in the `archive-entries` collection (rating, notes, ...). */
export interface ArchiveEntryInfo {
  category?: string | null;
  rating?: number | null;
  notes?: string | null;
  pagesFolder?: number | null;
  pagesMetadata?: number | null;
  percentSaved?: number | null;
}

export async function loadArchiveEntry(comicId: string): Promise<ArchiveEntryInfo | null> {
  const params = new URLSearchParams({ 'where[comicId][equals]': comicId, limit: '1', depth: '0' });
  for (const field of ['category', 'rating', 'notes', 'pagesFolder', 'pagesMetadata', 'percentSaved']) {
    params.set(`select[${field}]`, 'true');
  }
  try {
    const response = await fetch(`/api/archive-entries?${params}`);
    if (!response.ok) return null;
    return (await response.json()).docs?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function loadComicMetadata(comicId: string): Promise<ComicMetadata> {
  const response = await fetch(`${CDN_BASE}/smackjeeves-${comicId}/${comicId}/metadata.js`);
  if (!response.ok) throw new Error(`metadata ${response.status}`);
  // The file is `let metadata = {...}` wrapping plain JSON - parse it as
  // JSON rather than evaluating it, so nothing from the CDN ever executes.
  const text = await response.text();
  const match = text.match(/let\s+metadata\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) throw new Error('Could not parse metadata format');
  const metadata = JSON.parse(match[1]) as ComicMetadata;
  metadata.chapters ??= [];
  for (const chapter of metadata.chapters) {
    chapter.comments?.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }
  return metadata;
}

/** Every chapter holds exactly one page image (checked across the archive). */
export function chapterImageUrl(comicId: string, chapter: ArchiveChapter | undefined): string | null {
  const path = chapter?.pagesPath?.[0];
  return path ? `${CDN_BASE}/smackjeeves-${comicId}/${comicId}/${path}` : null;
}

export function archiveAssetUrl(imgPath: string): string {
  return `${CDN_BASE}/${imgPath}`;
}

export function formatCommentTime(isoString: string): string {
  const date = new Date(isoString);
  const pad = (num: number) => num.toString().padStart(2, '0');
  const hours = date.getHours() % 12 || 12;
  const ampm = date.getHours() >= 12 ? 'pm' : 'am';
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${date.getFullYear()}, ${hours}:${pad(date.getMinutes())}${ampm}`;
}

// A handful of scraped pages carry placeholder dates (1990-01-01, 1990-12-31,
// ...) - a single stray page in an otherwise 2007-2011 comic, which would make
// it look like it ran for 20 years. Nothing real predates the site (every
// other page and comment in the archive is 2004+), so anything before this
// counts as an unknown date. Kept well before 2004 so genuinely early pages
// are never second-guessed.
const EARLIEST_REAL_DATE = Date.UTC(2000, 0, 1);

/** The timestamp for a scraped date, or null if it's missing or a placeholder. */
export function archiveTime(isoString: string | undefined | null): number | null {
  if (!isoString) return null;
  const t = Date.parse(isoString);
  return Number.isFinite(t) && t >= EARLIEST_REAL_DATE ? t : null;
}

export function formatDate(isoString: string | undefined): string {
  const t = archiveTime(isoString);
  return t === null
    ? 'Unknown'
    : new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Scraped descriptions/comments are author-written HTML: mostly <b>/<i>/links,
// but the archive also holds <iframe>s and <script>s, so only a small
// formatting allowlist survives.
const ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'br', 'p', 'a', 'img',
  'ul', 'ol', 'li', 'blockquote', 'center', 'h1', 'h2', 'h3', 'h4', 'span', 'div',
];

let hookInstalled = false;

/** Browser-only (DOMPurify needs a DOM); the reader renders client-side. */
export function sanitizeArchiveHtml(text: string | undefined | null): string {
  if (!text) return '';
  if (!hookInstalled) {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
      } else if (node.tagName === 'IMG') {
        node.setAttribute('loading', 'lazy');
        node.setAttribute('referrerpolicy', 'no-referrer');
      }
    });
    hookInstalled = true;
  }
  return DOMPurify.sanitize(text.replace(/\r\n|\n|\r/g, '<br>'), {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
  });
}
