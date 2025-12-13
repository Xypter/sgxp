// Base themed components - wrappers around shadcn-svelte with theme integration

// Simple components (single exports)
export { default as Button } from './Button.svelte';
export { default as Input } from './Input.svelte';
export { default as Label } from './Label.svelte';
export { default as Badge } from './Badge.svelte';
export { default as Textarea } from './Textarea.svelte';
export { default as Select } from './Select.svelte';
export { default as Combobox } from './Combobox.svelte';
export { default as Switch } from './Switch.svelte';
export { default as Progress } from './Progress.svelte';

// Compound components (namespace exports with theme support)
export * as Card from './Card.svelte';
export * as Avatar from './Avatar.svelte';
export * as Pagination from './Pagination.svelte';
