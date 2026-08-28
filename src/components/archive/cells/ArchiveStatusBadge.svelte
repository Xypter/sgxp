<script lang="ts">
  import { Badge } from '$lib/components';

  interface Props {
    status: string;
  }

  let { status }: Props = $props();

  function getStatusColor(status: string): string {
    switch (status) {
      case 'uploaded': return '#22c55e';
      case 'ready-to-upload': return '#8b5cf6';
      case 'ready-for-rating': return '#3b82f6';
      case 'ready-for-review': return '#f59e0b';
      case 'unsorted': return '#6b7280';
      default: return '#6b7280';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'uploaded': return 'Uploaded';
      case 'ready-to-upload': return 'Ready to Upload';
      case 'ready-for-rating': return 'Ready for Rating';
      case 'ready-for-review': return 'Ready for Review';
      case 'unsorted': return 'Unsorted';
      default: return status;
    }
  }
</script>

<Badge themed color={getStatusColor(status)}>
  {getStatusLabel(status)}
</Badge>
