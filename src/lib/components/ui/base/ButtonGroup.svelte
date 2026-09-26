<script lang="ts">
  import type { Snippet } from 'svelte';

  // Buttons side by side as one control (e.g. a Cards/Table toggle): shared
  // borders and a single block shadow. Styles: .sgxp-btn-group in
  // src/styles/buttons.css.
  interface Props {
    /** What the group controls, for screen readers (e.g. "View as"). */
    label: string;
    class?: string;
    children?: Snippet;
  }

  let { label, class: className = '', children }: Props = $props();
</script>

<div class="sgxp-btn-group {className}" role="group" aria-label={label}>
  {@render children?.()}
</div>
