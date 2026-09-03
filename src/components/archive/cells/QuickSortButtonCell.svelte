<script lang="ts">
  import { Images } from 'lucide-svelte';
  import { Button } from '$lib/components';

  interface Props {
    onClick: () => void;
  }

  let { onClick }: Props = $props();
</script>

<Button themed variant="ghost" size="icon" onclick={onClick} aria-label="View in Quick Sort" title="View in Quick Sort">
  <Images size={16} />
</Button>
