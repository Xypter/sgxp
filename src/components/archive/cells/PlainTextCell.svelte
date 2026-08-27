<script lang="ts">
  interface Props {
    value?: string;
    fallback?: string;
    class?: string;
  }

  let { value, fallback = '', class: className = '' }: Props = $props();
</script>

<span class={className} title={value || fallback}>{value || fallback}</span>
