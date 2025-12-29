<script lang="ts">
  import { formatDate } from '$lib/spriteUtils';

  interface Props {
    date: string | Date;
  }

  let { date }: Props = $props();
</script>

<span class="date-cell">
  {formatDate(date)}
</span>

<style>
  .date-cell {
    color: var(--font-color);
    opacity: 0.7;
    font-size: 13px;
    white-space: nowrap;
  }
</style>
