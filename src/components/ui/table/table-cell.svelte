<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn, type WithElementRef } from "@/lib/utils.js";

  interface TableCellProps extends WithElementRef<HTMLAttributes<HTMLTableCellElement>> {
    colspan?: number;
  }

  let {
    ref = $bindable(null),
    class: className,
    colspan,
    children,
    ...restProps
  }: TableCellProps = $props();
</script>

<td
  bind:this={ref}
  data-slot="table-cell"
  colspan={colspan}
  class={cn(
    "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</td>
