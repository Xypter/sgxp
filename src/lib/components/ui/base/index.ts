// Base themed components - wrappers around shadcn-svelte with theme integration

// Simple components (single exports)
export { default as Button } from './Button.svelte';
export { default as Input } from './Input.svelte';
export { default as Label } from './Label.svelte';
export { default as Badge } from './Badge.svelte';
export { default as Textarea } from './Textarea.svelte';

// Compound components (namespace exports from shadcn-svelte directly)
export * as Card from '$components/ui/card';
export * as Avatar from '$components/ui/avatar';
