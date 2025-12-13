<script>
  import { Toaster } from 'svelte-sonner';
</script>

<Toaster
  theme="dark"
  position="bottom-right"
  richColors={false}
  toastOptions={{
    unstyled: false,
    classes: {
      toast: 'sgxp-toast',
      title: 'sgxp-toast-title',
      description: 'sgxp-toast-description',
      error: 'sgxp-toast-error',
      success: 'sgxp-toast-success',
      warning: 'sgxp-toast-warning',
      info: 'sgxp-toast-info',
    },
    style: 'background: color-mix(in srgb, var(--page-color) 80%, black); color: var(--font-color); border: 1px solid var(--font-link-color);'
  }}
/>

<style>
  /* Ensure toaster is visible */
  :global([data-sonner-toaster]) {
    z-index: 9999 !important;
  }

  :global(.sgxp-toast) {
    background: color-mix(in srgb, var(--page-color) 80%, black) !important;
    color: var(--font-color) !important;
    border: 1px solid var(--font-link-color) !important;
    border-radius: 0 !important;
    box-shadow: var(--box-shadow);
    font-family: inherit;
    min-width: 300px;
  }

  :global(.sgxp-toast-title) {
    color: var(--font-color) !important;
    font-weight: 600;
  }

  :global(.sgxp-toast-description) {
    color: var(--font-color) !important;
    opacity: 0.9;
  }

  :global(.sgxp-toast-error) {
    border-color: var(--font-link-color) !important;
  }

  :global(.sgxp-toast-error .sgxp-toast-title) {
    color: var(--font-link-color) !important;
  }

  :global(.sgxp-toast-success) {
    border-color: #16a34a !important;
  }

  :global(.sgxp-toast-success .sgxp-toast-title) {
    color: #86efac !important;
  }

  :global(.sgxp-toast-warning) {
    border-color: #f59e0b !important;
  }

  :global(.sgxp-toast-warning .sgxp-toast-title) {
    color: #fcd34d !important;
  }

  :global(.sgxp-toast-info) {
    border-color: #3b82f6 !important;
  }

  :global(.sgxp-toast-info .sgxp-toast-title) {
    color: #93c5fd !important;
  }

  /* Close button styling */
  :global([data-sonner-toast] [data-close-button]) {
    background: transparent !important;
    border-color: var(--font-link-color) !important;
    color: var(--font-color) !important;
  }

  :global([data-sonner-toast] [data-close-button]:hover) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border-color: var(--font-link-color) !important;
  }

  /* Icon styling */
  :global([data-sonner-toast] [data-icon]) {
    margin-right: 8px;
  }
</style>
