<script lang="ts">
  import { Badge } from '$lib/components';

  interface Props {
    messageType: 'announcement' | 'moderation' | 'private';
  }

  let { messageType }: Props = $props();

  function getTypeColor(type: string): string {
    switch (type) {
      case 'announcement': return '#ffd93d'; // Yellow
      case 'moderation': return '#ff6b6b';   // Red
      case 'private': return 'var(--font-link-color)'; // Blue
      default: return '#6b7280';
    }
  }

  function getTypeLabel(type: string): string {
    switch (type) {
      case 'announcement': return 'Announcement';
      case 'moderation': return 'Moderation';
      case 'private': return 'Private';
      default: return type;
    }
  }
</script>

<Badge themed color={getTypeColor(messageType)}>
  {getTypeLabel(messageType)}
</Badge>
