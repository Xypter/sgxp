<script lang="ts">
	import { Pagination as PaginationPrimitive } from "bits-ui";
	import { cn } from "@/lib/utils.js";
	import { type Props, sgxpButtonClass } from "@/components/ui/button/index.js";

	let {
		ref = $bindable(null),
		class: className,
		isActive,
		page,
		children,
		...restProps
	}: PaginationPrimitive.PageProps &
		Props & {
			isActive: boolean;
		} = $props();
</script>

{#snippet Fallback()}
	{page.value}
{/snippet}

<!-- SGXP standard: secondary page buttons; aria-current fills the current page
     with the accent (src/styles/buttons.css). -->
<PaginationPrimitive.Page
	bind:ref
	{page}
	aria-current={isActive ? "page" : undefined}
	data-slot="pagination-link"
	data-active={isActive}
	class={cn(sgxpButtonClass({ variant: "secondary", size: "icon" }), className)}
	children={children || Fallback}
	{...restProps}
/>
