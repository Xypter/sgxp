<script lang="ts" module>
	import { cn, type WithElementRef } from "@/lib/utils.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";
	import type { Component } from "svelte";

	export const buttonVariants = tv({
		base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
				destructive:
					"bg-destructive shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white",
				outline:
					"bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border",
				secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 px-4 py-2 has-[>svg]:px-3",
				sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
				lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
				icon: "size-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	// SGXP button standard (styles: src/styles/buttons.css, reference: /dev/buttons).
	// These variants skip shadcn's utility classes entirely; the stock shadcn
	// variants above stay as they were for buttons not yet migrated.
	export const SGXP_VARIANTS = ["primary", "secondary", "danger", "toggle", "tool", "subtle", "quiet"] as const;
	export type SgxpVariant = (typeof SGXP_VARIANTS)[number];
	export type SgxpSize = "default" | "mini" | "icon" | "icon-mini";

	// iOS Safari only applies :active (the standard's press effect) when some
	// touchstart listener exists; one empty passive listener covers the whole page.
	if (typeof document !== "undefined") {
		document.addEventListener("touchstart", () => {}, { passive: true });
	}

	export const isSgxpVariant = (variant: unknown): variant is SgxpVariant =>
		SGXP_VARIANTS.includes(variant as SgxpVariant);

	/** Class list for the standard look - also for things that must look like a
	 *  button without being <Button> (e.g. pagination links). */
	export function sgxpButtonClass({ variant = "primary", size = "default" }: { variant?: SgxpVariant; size?: string | null } = {}) {
		return cn(
			"sgxp-btn",
			`sgxp-btn--${variant}`,
			(size === "mini" || size === "icon-mini") && "sgxp-btn--mini",
			(size === "icon" || size === "icon-mini") && "sgxp-btn--icon"
		);
	}

	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"] | SgxpVariant;
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"] | SgxpSize;

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
			/** Leading icon (a lucide-svelte component). Primary buttons always get one. */
			icon?: Component;
			/** Disables the button and swaps the icon for the site spinner. */
			loading?: boolean;
		};
</script>

<script lang="ts">
	import Spinner from "../../Spinner.svelte";

	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		icon: Icon,
		loading = false,
		children,
		...restProps
	}: ButtonProps = $props();

	const classes = $derived(
		isSgxpVariant(variant)
			? cn(sgxpButtonClass({ variant, size }), className)
			: cn(buttonVariants({ variant, size: size as VariantProps<typeof buttonVariants>["size"] }), className)
	);
	const isDisabled = $derived(disabled || loading);
</script>

{#snippet content()}
	{#if loading}
		<Spinner size={16} label={null} fit class="sgxp-btn-spinner" />
	{:else if Icon}
		<Icon aria-hidden="true" />
	{/if}
	{@render children?.()}
{/snippet}

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={classes}
		href={isDisabled ? undefined : href}
		aria-disabled={isDisabled}
		aria-busy={loading || undefined}
		role={isDisabled ? "link" : undefined}
		tabindex={isDisabled ? -1 : undefined}
		{...restProps}
	>
		{@render content()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={classes}
		{type}
		disabled={isDisabled}
		aria-busy={loading || undefined}
		{...restProps}
	>
		{@render content()}
	</button>
{/if}
