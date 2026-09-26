<script lang="ts">
	import { Pagination as PaginationPrimitive } from "bits-ui";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import { sgxpButtonClass } from "@/components/ui/button/index.js";
	import { cn } from "@/lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: PaginationPrimitive.NextButtonProps = $props();
</script>

{#snippet Fallback()}
	<ChevronRightIcon />
{/snippet}

<!-- SGXP standard: an icon-only secondary arrow, labelled for screen readers. -->
<PaginationPrimitive.NextButton
	bind:ref
	aria-label="Go to next page"
	class={cn(sgxpButtonClass({ variant: "secondary", size: "icon" }), className)}
	children={children || Fallback}
	{...restProps}
/>
