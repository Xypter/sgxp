<script lang="ts">
  import { Badge } from '$lib/components';

  interface Props {
    status: string;
  }

  let { status }: Props = $props();

  function getStatusColor(status: string): string {
    switch (status) {
      case 'approved': return '#22c55e';
      case 'pending': return '#f59e0b';
      case 'needs_revision':
      case 'revision': return '#ef4444';
      case 'rejected': return '#6b7280';
      default: return '#6b7280';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'needs_revision':
      case 'revision': return 'Needs Revision';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  }
</script>

<Badge themed color={getStatusColor(status)}>
  {getStatusLabel(status)}
</Badge>
