<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from 'bits-ui';
	import { Check } from 'lucide-svelte';
	import { cn } from '$lib/utils.js';

	type $$Props = CheckboxPrimitive.Props;
	type $$Events = CheckboxPrimitive.Events;

	let className: $$Props['class'] = undefined;
	export let checked: $$Props['checked'] = undefined;
	export { className as class };
</script>

<CheckboxPrimitive.Root
	bind:checked
	class={cn(
		'peer box-content flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary text-primary ring-offset-background transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[disabled=true]:cursor-not-allowed data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[disabled=true]:opacity-50',
		className
	)}
	{...$$restProps}
	on:click
>
	{#snippet children({ checked: isChecked })}
		{#if isChecked}
			<Check class="h-3.5 w-3.5" />
		{/if}
	{/snippet}
</CheckboxPrimitive.Root>
