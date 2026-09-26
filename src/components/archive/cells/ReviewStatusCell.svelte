<script lang="ts">
  import { Button, Checkbox } from '$lib/components';
  import { CheckCircle2, CircleX } from 'lucide-svelte';

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
    // Renders the "unsorted" state as a real Button matching Confirm
    // Review/Confirm Exclusion's look, instead of the default checkbox +
    // label - used on the mobile card so the button stack at the bottom
    // reads as one consistent set of buttons.
    unsortedAsButton?: boolean;
    // Suppresses the read-only status badge (e.g. "Awaiting review",
    // "Unsorted") when there's no actionable button to show - used on the
    // mobile card, which already shows the entry's status via
    // ArchiveStatusBadge earlier in the card, so repeating it here as a
    // second badge is redundant. Buttons still render as normal.
    hideBadge?: boolean;
    /** Mini in table rows; the phone cards use the full size. */
    size?: 'default' | 'mini';
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
    unsortedAsButton = false,
    hideBadge = false,
    size = 'mini',
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
    {#if unsortedAsButton}
      <Button variant="secondary" {size} icon={CheckCircle2} onclick={onMarkReady} class="confirm-review-btn">Ready for Review</Button>
    {:else}
      <label class="mark-ready-label">
        <Checkbox checked={false} themed onCheckedChange={(checked) => checked && onMarkReady()} />
        <span>Ready for review</span>
      </label>
    {/if}
  {:else if !hideBadge}
    <span class="review-badge review-badge--unsorted">Unsorted</span>
  {/if}
{:else if status === 'ready-for-review'}
  {#if canEdit && !isPreparer}
    {#if willExclude}
      <Button variant="danger" {size} icon={CircleX} onclick={onConfirm} class="confirm-review-btn">Confirm Exclusion</Button>
    {:else}
      <Button variant="secondary" {size} icon={CheckCircle2} onclick={onConfirm} class="confirm-review-btn">Confirm Review</Button>
    {/if}
  {:else if !hideBadge}
    <span class="review-badge review-badge--pending">Awaiting review</span>
  {/if}
{:else if status === 'ready-for-rating'}
  {#if isAdmin}
    <Button variant="secondary" {size} icon={CheckCircle2} onclick={onMarkReadyToUpload} class="confirm-review-btn">Mark Ready to Upload</Button>
  {:else if !hideBadge}
    <span class="review-badge review-badge--locked" title="Reviewed by {nameOf(reviewedBy)}">Ready for rating</span>
  {/if}
{:else if status === 'ready-to-upload'}
  {#if isAdmin}
    <Button variant="secondary" {size} icon={CheckCircle2} onclick={onMarkUploaded} class="confirm-review-btn">Mark Uploaded</Button>
  {:else if !hideBadge}
    <span class="review-badge review-badge--locked">Ready to upload</span>
  {/if}
{:else if status === 'excluded'}
  {#if !hideBadge}
    <span class="review-badge review-badge--excluded" title="Prepared by {nameOf(preparedBy)}, reviewed by {nameOf(reviewedBy)}">
      Excluded
    </span>
  {/if}
{:else if !hideBadge}
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

</style>
