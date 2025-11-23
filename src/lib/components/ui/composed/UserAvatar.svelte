<script lang="ts">
  import * as Avatar from '../base/Avatar.svelte';

  interface UserAvatarProps {
    src?: string | null;
    alt?: string;
    fallback?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    themed?: boolean;
    class?: string;
  }

  let {
    src,
    alt = 'User avatar',
    fallback,
    size = 'md',
    themed = false,
    class: className
  }: UserAvatarProps = $props();

  // Size mapping
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const sizeClass = sizeClasses[size];
  const themeClass = themed ? 'theme-avatar' : '';
  const combinedClass = `${sizeClass} ${themeClass} ${className || ''}`.trim();

  // Generate fallback initials from alt text
  const initials = $derived(
    fallback || alt.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  );
</script>

<Avatar.Root class={combinedClass}>
  {#if src}
    <Avatar.Image {src} {alt} />
  {/if}
  <Avatar.Fallback class={themed ? 'theme-avatar-fallback' : ''}>
    {initials}
  </Avatar.Fallback>
</Avatar.Root>
