<script lang="ts">
  import { Button, Checkbox } from '$lib/components';
  import { CheckCircle2 } from 'lucide-svelte';

  interface UserRef {
    id: number | string;
    username?: string;
    displayName?: string;
  }

  interface Props {
    reviewStage: 'unprepared' | 'prepared' | 'reviewed';
    preparedBy?: UserRef | number | string | null;
    reviewedBy?: UserRef | number | string | null;
    currentUserId: number | string;
    canEdit: boolean;
    onMarkReady: () => void;
    onConfirm: () => void;
  }

  let { reviewStage, preparedBy, reviewedBy, currentUserId, canEdit, onMarkReady, onConfirm }: Props = $props();

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
</script>

{#if reviewStage === 'unprepared'}
  {#if canEdit}
    <label class="mark-ready-label">
      <Checkbox checked={false} themed onCheckedChange={(checked) => checked && onMarkReady()} />
      <span>Ready for review</span>
    </label>
  {:else}
    <span class="review-badge review-badge--unprepared">Unprepared</span>
  {/if}
{:else if reviewStage === 'prepared'}
  {#if isPreparer}
    <span class="review-badge review-badge--prepared">Awaiting review</span>
  {:else}
    <Button variant="outline" size="sm" onclick={onConfirm} themed class="confirm-review-btn">
      <CheckCircle2 size={14} />
      Confirm Review
    </Button>
  {/if}
{:else}
  <span class="review-badge review-badge--reviewed" title="Prepared by {nameOf(preparedBy)}, reviewed by {nameOf(reviewedBy)}">
    Reviewed by {nameOf(reviewedBy)}
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

  .review-badge--unprepared {
    color: var(--font-color);
    opacity: 0.6;
  }

  .review-badge--prepared {
    color: #f59e0b;
  }

  .review-badge--reviewed {
    color: #22c55e;
  }

  :global(.confirm-review-btn) {
    font-size: 12px !important;
    padding: 4px 10px !important;
    height: auto !important;
    display: flex !important;
    align-items: center !important;
    gap: 4px !important;
    white-space: nowrap !important;
  }
</style>
