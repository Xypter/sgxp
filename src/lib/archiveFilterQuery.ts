// Shared between ArchiveTriageTable.svelte (the main table's query builder)
// and ArchiveQuickSort.svelte (which needs to walk that exact same filtered
// list) - keeping this in one place means a filter added to one always
// applies to the other automatically, instead of two hand-synced copies
// silently drifting apart.

export const BLANK_FILTER_VALUE = '__blank__';

export interface ArchiveFilterState {
  statusFilter?: string;
  searchTerm?: string;
  categoryFilterValues?: string[];
  spriteComicFilterValues?: string[];
  gameRelatedFilterValues?: string[];
  preparerFilterValues?: string[];
  reviewerFilterValues?: string[];
}

// Category/Preparer/Reviewer filters all need to express "one of these
// values OR never set" - a plain [in] can't express the blank half, so
// when both a real selection and the (Blank) sentinel are present this
// emits a nested [or] instead. Returns the next clauseIndex to use.
function addFilterClauseWithBlank(
  params: URLSearchParams,
  clauseIndex: number,
  field: string,
  selected: string[]
): number {
  if (selected.length === 0) return clauseIndex;
  const ids = selected.filter((v) => v !== BLANK_FILTER_VALUE);
  const hasBlank = selected.includes(BLANK_FILTER_VALUE);
  if (ids.length > 0 && hasBlank) {
    params.set(`where[and][${clauseIndex}][or][0][${field}][in]`, ids.join(','));
    params.set(`where[and][${clauseIndex}][or][1][${field}][exists]`, 'false');
  } else if (ids.length > 0) {
    params.set(`where[and][${clauseIndex}][${field}][in]`, ids.join(','));
  } else {
    params.set(`where[and][${clauseIndex}][${field}][exists]`, 'false');
  }
  return clauseIndex + 1;
}

// Mutates `params` in place, adding one `where[and][n]` clause per active
// filter. Caller is responsible for limit/page/depth/sort.
export function applyArchiveFilters(params: URLSearchParams, filters: ArchiveFilterState): void {
  let clauseIndex = 0;
  if (filters.statusFilter) {
    params.set(`where[and][${clauseIndex}][status][equals]`, filters.statusFilter);
    clauseIndex++;
  }
  if (filters.searchTerm?.trim()) {
    params.set(`where[and][${clauseIndex}][or][0][title][contains]`, filters.searchTerm.trim());
    params.set(`where[and][${clauseIndex}][or][1][author][contains]`, filters.searchTerm.trim());
    clauseIndex++;
  }
  clauseIndex = addFilterClauseWithBlank(params, clauseIndex, 'category', filters.categoryFilterValues ?? []);
  // Selecting both Yes and No is equivalent to no filter - skip the clause
  // entirely rather than sending a no-op [in] filter.
  if (filters.spriteComicFilterValues && filters.spriteComicFilterValues.length === 1) {
    params.set(`where[and][${clauseIndex}][isSpriteComic][equals]`, filters.spriteComicFilterValues[0]);
    clauseIndex++;
  }
  if (filters.gameRelatedFilterValues && filters.gameRelatedFilterValues.length === 1) {
    params.set(`where[and][${clauseIndex}][isGameRelated][equals]`, filters.gameRelatedFilterValues[0]);
    clauseIndex++;
  }
  clauseIndex = addFilterClauseWithBlank(params, clauseIndex, 'preparedBy', filters.preparerFilterValues ?? []);
  clauseIndex = addFilterClauseWithBlank(params, clauseIndex, 'reviewedBy', filters.reviewerFilterValues ?? []);
}
