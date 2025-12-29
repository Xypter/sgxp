import {
  type RowData,
  type TableOptions,
  type TableOptionsResolved,
  type TableState,
  createTable,
} from "@tanstack/table-core";

export function createSvelteTable<TData extends RowData>(
  options: TableOptions<TData>
) {
  const resolvedOptions: TableOptionsResolved<TData> = {
    state: {},
    onStateChange: () => {},
    renderFallbackValue: null,
    ...options,
  };

  const table = createTable(resolvedOptions);

  let state = $state<TableState>(table.initialState);

  function updateOptions(newOptions: TableOptions<TData>) {
    table.setOptions((prev) => ({
      ...prev,
      ...newOptions,
      state: {
        ...state,
        ...newOptions.state,
      },
      onStateChange: (updater) => {
        if (typeof updater === "function") {
          state = updater(state);
        } else {
          state = updater;
        }
        newOptions.onStateChange?.(updater);
      },
    }));
  }

  // Initialize with options
  updateOptions(options);

  // Create a reactive effect to update options when they change
  $effect(() => {
    updateOptions(options);
  });

  return table;
}
