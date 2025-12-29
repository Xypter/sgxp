import { createRawSnippet, type Snippet } from "svelte";
import type { ComponentType } from "svelte";
import type { CellContext, HeaderContext } from "@tanstack/table-core";

export { createSvelteTable } from "./create-svelte-table.svelte.js";

// FlexRender component for rendering cell/header content
export { default as FlexRender } from "./flex-render.svelte";

// Re-export table-core utilities
export {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/table-core";

// Helper to render a Svelte component in a cell
export function renderComponent<TData, TValue, TProps extends Record<string, unknown>>(
  component: ComponentType<TProps>,
  props: TProps
) {
  return { component, props };
}

// Helper to render a snippet in a cell
export function renderSnippet<TProps extends unknown[]>(
  snippet: ReturnType<typeof createRawSnippet<TProps>>,
  props: TProps[0]
) {
  return { snippet, props };
}
