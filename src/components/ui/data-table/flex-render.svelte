<script lang="ts" generics="TProps">
  import type { Snippet, ComponentType } from "svelte";

  type ContentValue<TProps> =
    | string
    | ComponentType<any>
    | Snippet<[TProps]>
    | ((props: TProps) => any);

  interface FlexRenderProps<TProps> {
    content?: ContentValue<TProps>;
    context: TProps;
  }

  let { content, context }: FlexRenderProps<TProps> = $props();

  function isComponentResult(value: unknown): value is { component: ComponentType<any>; props: Record<string, unknown> } {
    return typeof value === "object" && value !== null && "component" in value && "props" in value;
  }

  function isSnippetResult(value: unknown): value is { snippet: Snippet<[unknown]>; props: unknown } {
    return typeof value === "object" && value !== null && "snippet" in value && "props" in value;
  }
</script>

{#if content}
  {#if typeof content === "string"}
    {content}
  {:else if typeof content === "function"}
    {@const result = content(context)}
    {#if isComponentResult(result)}
      <result.component {...result.props} />
    {:else if isSnippetResult(result)}
      {@render result.snippet(result.props)}
    {:else if typeof result === "string"}
      {result}
    {:else if result?.render}
      {@html result.render()}
    {/if}
  {:else if typeof content === "object" && "length" in content}
    <!-- It's a snippet -->
    {@render (content as Snippet<[TProps]>)(context)}
  {/if}
{/if}
