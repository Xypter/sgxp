<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Button as ShadcnButton } from '$components/ui/button';
  import type { ButtonProps as ShadcnButtonProps } from '$components/ui/button';

  // The site's button: the standard looks live in src/styles/buttons.css
  // (every variant and state on /dev/buttons). This wrapper only forwards
  // `ref` and children to the shadcn-svelte primitive.
  interface ButtonProps extends ShadcnButtonProps {
    children?: Snippet;
  }

  let { ref = $bindable(null), children, ...restProps }: ButtonProps = $props();
</script>

<ShadcnButton bind:ref {...restProps}>
  {@render children?.()}
</ShadcnButton>
