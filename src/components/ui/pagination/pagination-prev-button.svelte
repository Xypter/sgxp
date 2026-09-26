<script lang="ts">
	import { Pagination as PaginationPrimitive } from "bits-ui";
	import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
	import { sgxpButtonClass } from "@/components/ui/button/index.js";
	import { cn } from "@/lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: PaginationPrimitive.PrevButtonProps = $props();
</script>

{#snippet Fallback()}
	<ChevronLeftIcon />
{/snippet}

<!-- SGXP standard: an icon-only secondary arrow, labelled for screen readers. -->
<PaginationPrimitive.PrevButton
	bind:ref
	aria-label="Go to previous page"
	class={cn(sgxpButtonClass({ variant: "secondary", size: "icon" }), className)}
	children={children || Fallback}
	{...restProps}
/>
