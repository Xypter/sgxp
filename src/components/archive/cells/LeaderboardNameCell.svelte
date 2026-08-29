<script lang="ts">
  interface Props {
    id: number | string;
    name: string;
  }

  let { id, name }: Props = $props();
</script>

<a href="/profile?id={id}" class="name-link">{name}</a>

<style>
  .name-link {
    color: var(--font-color);
    font-weight: 600;
    text-decoration: none;
  }

  .name-link:hover {
    color: var(--font-link-color);
    text-decoration: underline;
  }
</style>
