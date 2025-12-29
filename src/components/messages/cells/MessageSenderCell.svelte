<script lang="ts">
  interface User {
    id: string;
    name?: string;
    username?: string;
    email?: string;
    profilePicture?: {
      url: string;
    };
  }

  interface Props {
    sender: User;
  }

  let { sender }: Props = $props();

  // Get display name with fallback logic
  function getDisplayName(user: User): string {
    if (user.name) return user.name;
    if (user.username) return user.username;
    if (user.email) return user.email.split('@')[0];
    return 'User';
  }

  // Get initials for avatar placeholder
  function getInitials(user: User): string {
    const name = getDisplayName(user);
    return name.charAt(0).toUpperCase();
  }
</script>

<div class="sender-cell">
  {#if sender.profilePicture?.url}
    <img
      src={sender.profilePicture.url}
      alt={getDisplayName(sender)}
      class="sender-avatar"
    />
  {:else}
    <div class="avatar-placeholder">
      {getInitials(sender)}
    </div>
  {/if}
  <span class="sender-name">{getDisplayName(sender)}</span>
</div>

<style>
  .sender-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .sender-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid color-mix(in srgb, var(--page-color) 80%, white);
  }

  .avatar-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: 2px solid color-mix(in srgb, var(--page-color) 80%, white);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'saira', sans-serif;
    font-weight: 600;
    font-size: 14px;
    color: var(--font-color);
  }

  .sender-name {
    color: var(--font-color);
    font-weight: 500;
    font-size: 14px;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
