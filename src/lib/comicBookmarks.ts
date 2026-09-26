// Private comic bookmarks + reading progress (the CMS's `bookmarks`
// collection, which only ever returns the logged-in user's own rows).
// The fetch helpers are browser-only (they go through the site's
// /api/bookmarks proxy); bookmarkListQuery/toBookmarkListItems are shared with
// the /bookmarks page's server render.
//
// Only Smack Jeeves archive entries are bookmarkable so far; the collection is
// polymorphic, so in-house comics can reuse it with relationTo 'comics' (add a
// SOURCES entry below once they have a reader page to link to).

export interface ComicBookmark {
  id: number;
  /** The bookmarked `archive-entries` row's id (not its Smack Jeeves comicId). */
  entryId: number;
  lastPage: number | null;
  updatedAt: string;
}

/** One entry on the /bookmarks page, whatever it points at. */
export interface BookmarkListItem {
  id: number;
  entryId: number;
  source: string;
  sourceLabel: string;
  /** Where that source's comics are browsed. */
  sourceHome: string;
  title: string;
  author: string | null;
  lastPage: number | null;
  pageCount: number | null;
  /** Straight to the page last read, when there is one. */
  href: string;
  previewUrl: string | null;
  updatedAt: string;
  /** What the archive's comic card shows (see ArchiveComicCard). */
  comicId: number;
  category: string | null;
  rating: number | null;
  notes: string | null;
  pagesMetadata: number | null;
  percentSaved: number | null;
  bookmarkCount: number;
}

const RELATION = 'archive-entries';

/** Fired on window whenever this tab adds or removes a bookmark, so the
 *  views listing bookmarks (the archive's cards, /bookmarks) stay in step. */
export const BOOKMARKS_CHANGED = 'sgxp:bookmarks-changed';
export interface BookmarksChangedDetail {
  entryId: number;
  bookmark: ComicBookmark | null;
}

function announce(entryId: number, bookmark: ComicBookmark | null) {
  window.dispatchEvent(
    new CustomEvent<BookmarksChangedDetail>(BOOKMARKS_CHANGED, { detail: { entryId, bookmark } })
  );
}

function toBookmark(doc: any): ComicBookmark | null {
  const item = doc?.bookmarkedItem;
  if (!doc?.id || item?.relationTo !== RELATION) return null;
  const entryId = typeof item.value === 'object' ? item.value?.id : item.value;
  if (entryId === undefined || entryId === null) return null;
  return {
    id: doc.id,
    entryId: Number(entryId),
    lastPage: typeof doc.lastPage === 'number' ? doc.lastPage : null,
    updatedAt: doc.updatedAt,
  };
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api/bookmarks${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.errors?.[0]?.message || data.message || 'Bookmark request failed') as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return data;
}

function listQuery(extra: Record<string, string> = {}) {
  return new URLSearchParams({
    'where[bookmarkedItem.relationTo][equals]': RELATION,
    depth: '0',
    sort: '-updatedAt',
    limit: '1000',
    ...extra,
  });
}

/** All of the viewer's archive bookmarks, most recently read first. */
export async function fetchArchiveBookmarks(): Promise<ComicBookmark[]> {
  const data = await request(`?${listQuery()}`);
  return (data.docs ?? []).map(toBookmark).filter((b: ComicBookmark | null): b is ComicBookmark => !!b);
}

export async function fetchArchiveBookmark(entryId: number): Promise<ComicBookmark | null> {
  const data = await request(`?${listQuery({ 'where[bookmarkedItem.value][equals]': String(entryId), limit: '1' })}`);
  return toBookmark(data.docs?.[0]);
}

// How each bookmarkable collection shows up on the /bookmarks page.
const SOURCES: Record<string, { label: string; home: string; fields: string[]; toItem: (doc: any) => Omit<BookmarkListItem, 'id' | 'entryId' | 'source' | 'sourceLabel' | 'sourceHome' | 'lastPage' | 'updatedAt'> | null }> = {
  'archive-entries': {
    label: 'Smack Jeeves Archive',
    home: '/smackjeeves',
    fields: [
      'comicId', 'title', 'author', 'pagesFolder', 'link', 'status',
      'category', 'rating', 'notes', 'pagesMetadata', 'percentSaved', 'bookmarkCount',
    ],
    toItem: (entry) => {
      // Only what's actually in the public archive (a comic could be pulled).
      if (!entry?.comicId || entry.status !== 'uploaded') return null;
      return {
        title: entry.title || '(untitled)',
        author: entry.author || null,
        pageCount: entry.pagesFolder ?? null,
        href: entry.link || `/jeevespage?comic_id=${entry.comicId}`,
        previewUrl: `/api/smackjeeves-preview/${entry.comicId}`,
        comicId: entry.comicId,
        category: entry.category ?? null,
        rating: entry.rating ?? null,
        notes: entry.notes ?? null,
        pagesMetadata: entry.pagesMetadata ?? null,
        percentSaved: entry.percentSaved ?? null,
        bookmarkCount: entry.bookmarkCount ?? 0,
      };
    },
  },
};

/** Query for every bookmark with enough of its item to list it, most recently
 *  read first. */
export function bookmarkListQuery(): URLSearchParams {
  const params = new URLSearchParams({ depth: '1', sort: '-updatedAt', limit: '500' });
  // Only the fields the list shows - not whole archive rows (or the viewer's
  // own user doc, which `user` would otherwise populate).
  params.set('populate[users][id]', 'true');
  for (const [collection, source] of Object.entries(SOURCES)) {
    for (const field of source.fields) params.set(`populate[${collection}][${field}]`, 'true');
  }
  return params;
}

/** Turns bookmarkListQuery()'s docs into list entries, dropping anything that
 *  can't be shown (an unknown source, or an item no longer public). */
export function toBookmarkListItems(docs: any[]): BookmarkListItem[] {
  return docs.flatMap((doc: any): BookmarkListItem[] => {
    const relation = doc.bookmarkedItem?.relationTo;
    const source = SOURCES[relation];
    const value = doc.bookmarkedItem?.value;
    const item = source && typeof value === 'object' ? source.toItem(value) : null;
    if (!item) return [];
    const lastPage = typeof doc.lastPage === 'number' && doc.lastPage > 0 ? doc.lastPage : null;
    // The Smack Jeeves reader opens the page in the URL hash.
    const href = lastPage && relation === RELATION && item.href.startsWith('/jeevespage') ? `${item.href}#${lastPage}` : item.href;
    return [{
      ...item,
      href,
      id: doc.id,
      entryId: Number(value.id),
      source: relation,
      sourceLabel: source.label,
      sourceHome: source.home,
      lastPage,
      updatedAt: doc.updatedAt,
    }];
  });
}

export async function fetchBookmarkList(): Promise<BookmarkListItem[]> {
  const data = await request(`?${bookmarkListQuery()}`);
  return toBookmarkListItems(data.docs ?? []);
}

export async function addArchiveBookmark(entryId: number, lastPage?: number | null): Promise<ComicBookmark> {
  let bookmark: ComicBookmark | null = null;
  try {
    const data = await request('', {
      method: 'POST',
      body: JSON.stringify({
        bookmarkedItem: { relationTo: RELATION, value: entryId },
        ...(lastPage ? { lastPage } : {}),
      }),
    });
    bookmark = toBookmark(data.doc);
  } catch (err) {
    // Already bookmarked (e.g. from another tab) - that's the state we wanted.
    if ((err as { status?: number }).status !== 409) throw err;
    bookmark = await fetchArchiveBookmark(entryId);
  }
  if (!bookmark) throw new Error('Bookmark request failed');
  announce(entryId, bookmark);
  return bookmark;
}

export async function removeBookmark(bookmark: { id: number; entryId: number }): Promise<void> {
  await request(`/${bookmark.id}`, { method: 'DELETE' });
  announce(bookmark.entryId, null);
}

export async function saveBookmarkProgress(id: number, lastPage: number): Promise<void> {
  // keepalive: the last page turn is often right before leaving the page.
  await request(`/${id}`, { method: 'PATCH', body: JSON.stringify({ lastPage }), keepalive: true });
}
