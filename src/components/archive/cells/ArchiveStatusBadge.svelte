<script lang="ts">
  import { Badge } from '$lib/components';

  interface Props {
    status: string;
  }

  let { status }: Props = $props();

  function getStatusColor(status: string): string {
    switch (status) {
      case 'uploaded': return '#22c55e';
      case 'identified': return '#f59e0b';
      case 'unsorted': return '#6b7280';
      default: return '#6b7280';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'uploaded': return 'Uploaded';
      case 'identified': return 'Identified';
      case 'unsorted': return 'Unsorted';
      default: return status;
    }
  }
</script>

<Badge themed color={getStatusColor(status)}>
  {getStatusLabel(status)}
</Badge>
