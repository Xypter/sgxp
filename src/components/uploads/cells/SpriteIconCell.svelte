<script lang="ts">
  interface Props {
    iconUrl?: string;
    title: string;
  }

  let { iconUrl, title }: Props = $props();
</script>

<div class="sprite-icon-cell">
  {#if iconUrl}
    <img src={iconUrl} alt={title} class="sprite-icon" />
  {:else}
    <div class="icon-placeholder">?</div>
  {/if}
</div>

<style>
  .sprite-icon-cell {
    width: 50%;
  }

  .sprite-icon {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: auto;
  }

  .icon-placeholder {
    width: 100%;
    height: 100%;
    background: color-mix(in srgb, var(--page-color) 50%, black);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--font-color);
    font-size: 16px;
    font-weight: bold;
  }
</style>
