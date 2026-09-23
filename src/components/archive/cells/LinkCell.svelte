<script lang="ts">
  interface Props {
    href?: string;
    label?: string;
    // Prepended to `href`. Defaults to the production site (the triage table
    // links out to the live page); pass '' for a same-site relative link.
    origin?: string;
  }

  let { href, label = 'View', origin = 'https://sgxp.me' }: Props = $props();
</script>

{#if href}
  <a href="{origin}{href}" target="_blank" rel="noopener noreferrer" class="entry-link">{label}</a>
{/if}
