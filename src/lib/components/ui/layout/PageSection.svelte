<script lang="ts">
  interface PageSectionProps {
    title?: string;
    themed?: boolean;
    class?: string;
    children?: any;
  }

  let {
    title,
    themed = false,
    class: className,
    children
  }: PageSectionProps = $props();
</script>

<section class="page-section {className || ''}">
  {#if title}
    <h2 class="section-title {themed ? 'theme-card-title' : ''}">
      {title}
    </h2>
  {/if}
  <div class="section-content">
    {@render children?.()}
  </div>
</section>

<style>
  .page-section {
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 2rem;
    margin-bottom: 1rem;
  }

  .section-content {
    /* Content styling can be customized by the parent */
  }
</style>
