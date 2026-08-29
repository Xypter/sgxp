<script lang="ts">
  import { Button, Checkbox } from '$lib/components';
  import { CheckCircle2 } from 'lucide-svelte';

  interface UserRef {
    id: number | string;
    username?: string;
    displayName?: string;
  }

  interface Props {
    status: 'unsorted' | 'ready-for-review' | 'ready-for-rating' | 'ready-to-upload' | 'uploaded' | 'excluded';
    isSpriteComic?: boolean;
    isGameRelated?: boolean;
    preparedBy?: UserRef | number | string | null;
    reviewedBy?: UserRef | number | string | null;
    currentUserId: number | string;
    canEdit: boolean;
    isAdmin: boolean;
    onMarkReady: () => void;
    onConfirm: () => void;
    onMarkReadyToUpload: () => void;
    onMarkUploaded: () => void;
  }

  let {
    status,
    isSpriteComic,
    isGameRelated,
    preparedBy,
    reviewedBy,
    currentUserId,
    canEdit,
    isAdmin,
    onMarkReady,
    onConfirm,
    onMarkReadyToUpload,
    onMarkUploaded,
  }: Props = $props();

  function nameOf(ref: UserRef | number | string | null | undefined): string {
    if (!ref) return 'someone';
    if (typeof ref === 'object') return ref.displayName || ref.username || `User #${ref.id}`;
    return `User #${ref}`;
  }

  function idOf(ref: UserRef | number | string | null | undefined): string {
    if (!ref) return '';
    if (typeof ref === 'object') return String(ref.id);
    return String(ref);
  }

  let isPreparer = $derived(idOf(preparedBy) === String(currentUserId));
  // Confirming review has two outcomes depending on the entry's flags - the
  // button makes clear up front which one this confirm will lead to.
  let willExclude = $derived(!isSpriteComic && !isGameRelated);
</script>

{#if status === 'unsorted'}
  {#if canEdit}
    <label class="mark-ready-label">
      <Checkbox checked={false} themed onCheckedChange={(checked) => checked && onMarkReady()} />
      <span>Ready for review</span>
    </label>
  {:else}
    <span class="review-badge review-badge--unsorted">Unsorted</span>
  {/if}
{:else if status === 'ready-for-review'}
  {#if canEdit && !isPreparer}
    <Button variant="outline" size="sm" onclick={onConfirm} themed class={willExclude ? 'exclude-btn' : 'confirm-review-btn'}>
      <CheckCircle2 size={14} />
      {willExclude ? 'Confirm Exclusion' : 'Confirm Review'}
    </Button>
  {:else}
    <span class="review-badge review-badge--pending">Awaiting review</span>
  {/if}
{:else if status === 'ready-for-rating'}
  {#if isAdmin}
    <Button variant="outline" size="sm" onclick={onMarkReadyToUpload} themed class="confirm-review-btn">
      <CheckCircle2 size={14} />
      Mark Ready to Upload
    </Button>
  {:else}
    <span class="review-badge review-badge--locked" title="Reviewed by {nameOf(reviewedBy)}">Ready for rating</span>
  {/if}
{:else if status === 'ready-to-upload'}
  {#if isAdmin}
    <Button variant="outline" size="sm" onclick={onMarkUploaded} themed class="confirm-review-btn">
      <CheckCircle2 size={14} />
      Mark Uploaded
    </Button>
  {:else}
    <span class="review-badge review-badge--locked">Ready to upload</span>
  {/if}
{:else if status === 'excluded'}
  <span class="review-badge review-badge--excluded" title="Prepared by {nameOf(preparedBy)}, reviewed by {nameOf(reviewedBy)}">
    Excluded
  </span>
{:else}
  <span class="review-badge review-badge--reviewed" title="Prepared by {nameOf(preparedBy)}, reviewed by {nameOf(reviewedBy)}">
    Uploaded
  </span>
{/if}

<style>
  .mark-ready-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'saira';
    font-size: 12px;
    font-weight: 700;
    color: var(--font-color);
    cursor: pointer;
    white-space: nowrap;
  }

  .review-badge {
    font-family: 'saira';
    font-size: 12px;
    font-weight: 700;
    padding: 3px 8px;
    display: inline-block;
    white-space: nowrap;
  }

  .review-badge--unsorted {
    color: var(--font-color);
    opacity: 0.6;
  }

  .review-badge--pending {
    color: #f59e0b;
  }

  .review-badge--locked {
    color: #8b5cf6;
  }

  .review-badge--reviewed {
    color: #22c55e;
  }

  .review-badge--excluded {
    color: #ef4444;
  }

  :global(.confirm-review-btn),
  :global(.exclude-btn) {
    font-size: 12px !important;
    padding: 4px 10px !important;
    height: auto !important;
    display: flex !important;
    align-items: center !important;
    gap: 4px !important;
    white-space: nowrap !important;
  }

  :global(.exclude-btn) {
    color: #ef4444 !important;
    border-color: #ef4444 !important;
  }
</style>
