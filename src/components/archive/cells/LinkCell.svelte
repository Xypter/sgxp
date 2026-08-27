<script lang="ts">
  interface Props {
    href?: string;
    label?: string;
  }

  let { href, label = 'View' }: Props = $props();
</script>

{#if href}
  <a href="https://sgxp.me{href}" target="_blank" rel="noopener noreferrer" class="entry-link">{label}</a>
{/if}
