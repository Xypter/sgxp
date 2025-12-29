<script lang="ts">
  interface PageHeaderProps {
    title: string;
    description?: string;
    themed?: boolean;
    class?: string;
    children?: any;
  }

  let {
    title,
    description,
    themed = false,
    class: className,
    children
  }: PageHeaderProps = $props();
</script>

<header class="page-header {className || ''}">
  <div class="page-header-content">
    <h1 class="page-title {themed ? 'theme-title' : ''}">
      {title}
    </h1>
    {#if description}
      <p class="page-description {themed ? 'theme-description' : ''}">
        {description}
      </p>
    {/if}
  </div>
  {#if children}
    <div class="page-header-actions">
      {@render children?.()}
    </div>
  {/if}
</header>

<style>
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem 0;
    flex-wrap: wrap;
  }

  .page-header-content {
    flex: 1;
    min-width: 0;
  }

  .page-title {
    font-size: 1.875rem;
    font-weight: 800;
    line-height: 2.25rem;
    margin: 0;
  }

  .page-description {
    font-size: 0.875rem;
    line-height: 1.25rem;
    margin-top: 0.5rem;
    opacity: 0.8;
  }

  .page-header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  /* Themed styles are applied via classes */
  :global(.theme-title) {
    color: var(--font-color);
    font-family: 'saira', monospace;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
  }

  :global(.theme-description) {
    color: var(--font-color);
    font-family: 'saira', monospace;
  }
</style>
