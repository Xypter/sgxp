<script lang="ts">
  import { Input, Checkbox, Select } from '$lib/components';
  import type { MessageFilters } from '$lib/types/message';

  interface Props {
    filters: MessageFilters;
    onFiltersChange: (filters: MessageFilters) => void;
  }

  let { filters, onFiltersChange }: Props = $props();

  let searchTimeout: ReturnType<typeof setTimeout>;

  // Handle search input with debounce
  function handleSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      onFiltersChange({
        ...filters,
        search: value
      });
    }, 300);
  }

  function handleUnreadToggle(checked: boolean) {
    onFiltersChange({
      ...filters,
      unreadOnly: checked
    });
  }

  function handleTypeChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    onFiltersChange({
      ...filters,
      messageType: target.value as MessageFilters['messageType']
    });
  }

  function handleArchivedToggle(checked: boolean) {
    onFiltersChange({
      ...filters,
      archived: checked
    });
  }
</script>

<div class="message-filters">
  <div class="filter-row">
    <div class="filter-group">
      <Checkbox
        themed
        checked={filters.unreadOnly}
        onCheckedChange={handleUnreadToggle}
        label="Unread only"
      />
    </div>

    <div class="filter-group">
      <Select themed bind:value={filters.messageType} onchange={handleTypeChange}>
        <option value="all">All Types</option>
        <option value="announcement">Announcements</option>
        <option value="moderation">Moderation</option>
        <option value="private">Private</option>
      </Select>
    </div>

    <div class="filter-group search-group">
      <Input
        themed
        type="search"
        placeholder="Search by subject..."
        value={filters.search}
        oninput={handleSearchInput}
        class="search-input"
      />
    </div>

    <div class="filter-group">
      <Checkbox
        themed
        checked={filters.archived}
        onCheckedChange={handleArchivedToggle}
        label="Show archived"
      />
    </div>
  </div>
</div>

<style>
  .message-filters {
    background: color-mix(in srgb, var(--page-color) 60%, black);
    padding: 15px 20px;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    margin-bottom: var(--gap, 15px);
    border-radius: 4px;
  }

  .filter-row {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    align-items: center;
  }

  .search-group {
    flex: 1;
    min-width: 200px;
    max-width: 400px;
  }

  :global(.search-input) {
    width: 100%;
  }
</style>
