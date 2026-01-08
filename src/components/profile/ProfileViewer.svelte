<script lang="ts">
  import { Button, Badge } from '$lib/components';
  import { Pencil, Calendar, Shield, Award, MessageSquare, Image, Link as LinkIcon, ExternalLink, Heart } from 'lucide-svelte';
  import ProfileStats from './ProfileStats.svelte';
  import ProfileSprites from './ProfileSprites.svelte';
  import ProfileSocialLinks from './ProfileSocialLinks.svelte';
  import ProfileFavorites from './ProfileFavorites.svelte';
  import EditProfileModal from './EditProfileModal.svelte';

  // Props
  let {
    initialUser = null,
    initialError = null,
    userId = null,
    isOwnProfile = false
  }: {
    initialUser?: any;
    initialError?: string | null;
    userId?: number | null;
    isOwnProfile?: boolean;
  } = $props();

  // State
  let user = $state(initialUser);
  let loading = $state(!initialUser && !initialError);
  let error = $state(initialError);
  let editModalOpen = $state(false);

  const API_BASE_URL = "https://cms.sgxp.me/api";

  // Fetch user if not provided
  async function loadUser() {
    if (initialUser || initialError || !userId) return;

    loading = true;
    error = null;

    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}?depth=2`);
      if (response.ok) {
        user = await response.json();
      } else if (response.status === 404) {
        error = 'User not found';
      } else {
        error = 'Failed to load profile';
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      error = 'Failed to load profile';
    } finally {
      loading = false;
    }
  }

  // Format date
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Check if user should display role badge instead of prestige
  function shouldShowRoleBadge(role: string): boolean {
    return role === 'admin' || role === 'moderator';
  }

  // Get avatar URL
  function getAvatarUrl(profileUser: any): string | null {
    if (profileUser?.profilePicture?.url) {
      return profileUser.profilePicture.url;
    }
    return null;
  }

  // Get initials for avatar fallback
  function getInitials(profileUser: any): string {
    const name = profileUser?.displayName || profileUser?.username || 'U';
    return name.charAt(0).toUpperCase();
  }

  // Handle profile save
  async function handleProfileSave(updatedUserData: any) {
    console.log('[ProfileViewer] Received updated user data:', updatedUserData);

    // Handle both response formats: { doc: {...} } or direct user object
    const updatedUser = updatedUserData.doc || updatedUserData;

    // Update the local state
    user = updatedUser;

    console.log('[ProfileViewer] Updated local user state:', user);

    // Force page reload to ensure all caches are cleared and fresh data is loaded
    window.location.href = `/profile?id=${user.id}&refresh=1`;
  }

  $effect(() => {
    loadUser();
  });
</script>

<div class="profile-viewer">
  {#if loading}
    <div class="profile-content-title">Loading Profile...</div>
    <div class="profile-content-box">
      <div class="loading-state">
        <p>Loading profile details...</p>
      </div>
    </div>
  {:else if error}
    <div class="profile-content-title">Error</div>
    <div class="profile-content-box">
      <div class="error-state">
        <p>{error}</p>
      </div>
    </div>
  {:else if user}
    <!-- Profile Header Area -->
    <div class="profile-header-area">
      <!-- Avatar and Name (Above Header) -->
      <div class="profile-top-section">
        <div class="profile-avatar">
          {#if getAvatarUrl(user)}
            <img src={getAvatarUrl(user)} alt={user.displayName || user.username} />
          {:else}
            <div class="avatar-placeholder">{getInitials(user)}</div>
          {/if}
        </div>
        <div class="profile-identity">
          <h1 class="profile-name" title={user.displayName || user.username}>{user.displayName || user.username}</h1>
          {#if user.username}
            <p class="profile-username">@{user.username}</p>
          {/if}
        </div>
        {#if isOwnProfile}
          <button class="edit-profile-btn" onclick={() => editModalOpen = true}>
            <Pencil class="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        {/if}
      </div>

      <!-- Profile Header (Banner Section) -->
      <div class="profile-header">
        <div class="profile-header-banner">
          {#if user.headerImage?.url}
            <img src={user.headerImage.url} alt={user.headerImage.alt || 'Profile header'} class="banner-image" />
          {:else}
            <div class="banner-placeholder">
              <span class="banner-placeholder-text">No header image</span>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="profile-content-grid">
      <!-- Left Column: Info & Stats -->
      <div class="profile-left-column">
        <!-- User Info Section -->
        <div class="profile-content-title">
          <Shield class="w-5 h-5 inline-block mr-2" />
          User Info
        </div>
        <div class="profile-content-box profile-info-box">
          <div class="info-item">
            <span class="info-label">
              <Shield class="w-4 h-4" />
              Role
            </span>
            <div class="info-value">
              <Badge
                themed
                color={user.roleColor || '#888888'}
              >
                {user.role}
              </Badge>
            </div>
          </div>

          <div class="info-item">
            <span class="info-label">
              <Calendar class="w-4 h-4" />
              Joined
            </span>
            <span class="info-value">{formatDate(user.createdAt)}</span>
          </div>
        </div>

        <!-- Stats Section -->
        <ProfileStats {user} />

        <!-- Social Links Section -->
        <ProfileSocialLinks socialLinks={user.socialLinks} />
      </div>

      <!-- Right Column: About & Sprites -->
      <div class="profile-right-column">
        <!-- About Me Section -->
        <div class="profile-content-title">
          <MessageSquare class="w-5 h-5 inline-block mr-2" />
          About Me
        </div>
        <div class="profile-content-box profile-about-box">
          {#if user.bio}
            <p class="bio-text">{user.bio}</p>
          {:else}
            <p class="bio-empty">This user hasn't written a bio yet.</p>
          {/if}
        </div>

        <!-- User's Sprites Section -->
        <ProfileSprites userId={user.id} username={user.displayName || user.username} />

        <!-- Favorites Section -->
        <ProfileFavorites userId={user.id} username={user.displayName || user.username} />
      </div>
    </div>

    <!-- Edit Profile Modal -->
    {#if isOwnProfile}
      <EditProfileModal bind:open={editModalOpen} {user} onSave={handleProfileSave} />
    {/if}
  {:else}
    <div class="profile-content-title">Not Found</div>
    <div class="profile-content-box">
      <div class="not-found-state">
        <p>Profile not found.</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .profile-viewer {
    width: 100%;
  }

  /* Profile Header Area */
  .profile-header-area {
    position: relative;
    margin-bottom: var(--gap);
  }

  /* Top Section - Avatar and Name above header */
  .profile-top-section {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    padding: 0 0 0 20px;
    margin-bottom: -48px; /* Half of avatar height to create overlap */
    position: relative;
    z-index: 2;
  }

  .profile-avatar {
    width: 100px;
    height: 100px;
    flex-shrink: 0;
  }

  .profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: auto;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: calc(5px * var(--multiply-factor)) calc(5px * var(--multiply-factor)) 0 var(--bg-color);
  }

  .profile-avatar .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: color-mix(in srgb, var(--page-color) 50%, black);
    color: var(--font-color);
    font-family: 'saira';
    font-weight: 800;
    font-size: 48px;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: calc(5px * var(--multiply-factor)) calc(5px * var(--multiply-factor)) 0 var(--bg-color);
  }

  .profile-identity {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .profile-name {
    font-family: 'saira';
    font-weight: 800;
    font-size: 32px;
    color: var(--font-color);
    margin: -10px 0 -14px -12px;
    text-shadow:
      calc(2px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 2px var(--bg-color),
      calc(2px * var(--multiply-factor)) calc(2px * var(--multiply-factor)) 2px var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(2px * var(--multiply-factor)) 2px var(--bg-color),
      calc(-2px * var(--multiply-factor)) calc(2px * var(--multiply-factor)) 2px var(--bg-color),
      calc(-2px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 2px var(--bg-color),
      calc(-2px * var(--multiply-factor)) calc(-2px * var(--multiply-factor)) 2px var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(-2px * var(--multiply-factor)) 2px var(--bg-color),
      calc(2px * var(--multiply-factor)) calc(-2px * var(--multiply-factor)) 2px var(--bg-color);
    max-width: 400px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-username {
    font-family: 'saira';
    font-weight: 400;
    color: var(--font-color);
    margin: -3px 0 0px -13px;
    text-shadow:
      calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 1px var(--bg-color),
      calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 1px var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 1px var(--bg-color),
      calc(-1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 1px var(--bg-color),
      calc(-1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 1px var(--bg-color),
      calc(-1px * var(--multiply-factor)) calc(-1px * var(--multiply-factor)) 1px var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(-1px * var(--multiply-factor)) 1px var(--bg-color),
      calc(1px * var(--multiply-factor)) calc(-1px * var(--multiply-factor)) 1px var(--bg-color);
  }

  .edit-profile-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    font-family: 'saira';
    cursor: pointer;
    transition: all 0.2s ease;
    height: fit-content;

    font-size: 14px !important;
    padding: 8px 16px !important;
    font-weight: 700 !important;
    background: var(--page-color) !important;
    color: var(--font-color) !important;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 60%, white) !important;
    border-radius: 0px !important;
    box-shadow: var(--box-shadow) !important;
    transition: all 0.2s ease !important;
    cursor: url('/img/Sonic_Cursor.png'), pointer !important;
  }

  .edit-profile-btn:hover {
    border-color: var(--font-link-color) !important;
    cursor: url('/img/Sonic_Cursor_Spin.gif'), progress !important;
    background: color-mix(in srgb, var(--page-color) 90%, white) !important;
  }

  /* Profile Header (Banner Section) */
  .profile-header {
    display: flex;
    align-items: center;
    gap: 20px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    box-shadow: var(--box-shadow);
    position: relative;
    z-index: 1;
  }

  .profile-header-banner {
    width: 1202px;
    height: 150px;
    overflow: hidden;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
  }

  .banner-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: pixelated;
  }

  .banner-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--page-color) 50%, black);
    border: 1px dashed color-mix(in srgb, var(--page-color) 70%, white);
  }

  .banner-placeholder-text {
    font-family: 'saira';
    font-size: 12px;
    font-weight: 600;
    color: var(--font-color);
    opacity: 0.4;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  :global(.edit-profile-btn) {
    flex-shrink: 0;
  }

  /* Content Grid */
  .profile-content-grid {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: var(--gap);
  }

  .profile-left-column,
  .profile-right-column {
    display: flex;
    flex-direction: column;
  }

  /* Content Boxes - Following sprite viewer style */
  .profile-content-title {
    display: flex;
    align-items: center;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    padding: 3px 0px 3px 10px;
    font-family: 'saira';
    font-weight: 800;
    font-size: 18px;
    color: var(--font-color);
    text-shadow:
      calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
      calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    position: relative;
  }

  .profile-content-box {
    background: var(--page-color);
    padding: 15px;
    border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    margin-bottom: var(--gap);
    color: var(--font-color);
    position: relative;
    z-index: 1;
  }

  /* Info Box */
  .profile-info-box {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .info-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'saira';
    font-weight: 600;
    font-size: 11px;
    color: var(--font-color);
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-value {
    font-family: 'saira';
    font-weight: 700;
    font-size: 14px;
    color: var(--font-color);
    padding-left: 22px;
  }

  /* About Box */
  .profile-about-box {
    min-height: 40px;
  }

  .bio-text {
    font-family: 'saira';
    font-size: 14px;
    line-height: 1.6;
    color: var(--font-color);
    white-space: pre-wrap;
    margin: 0;
  }

  .bio-empty {
    font-family: 'saira';
    font-size: 14px;
    color: var(--font-color);
    opacity: 0.5;
    font-style: italic;
    margin: 0;
  }

  /* States */
  .loading-state,
  .error-state,
  .not-found-state {
    text-align: center;
    padding: 40px 20px;
    font-family: 'saira';
    font-size: 14px;
    color: var(--font-color);
  }

  .error-state {
    color: #ff4444;
  }

  /* Responsive */
  @media (max-width: 900px) {
    .profile-header {
      padding: 70px 20px 20px 20px;
    }

    .profile-header-banner {
      width: 100%;
    }

    .profile-content-grid {
      grid-template-columns: 1fr;
    }

    .profile-left-column {
      order: 2;
    }

    .profile-right-column {
      order: 1;
    }
  }

  @media (max-width: 768px) {
    .profile-top-section {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 15px;
      padding-left: 0;
    }

    .profile-avatar {
      width: 80px;
      height: 80px;
    }

    .profile-avatar .avatar-placeholder {
      font-size: 36px;
    }

    .profile-identity {
      flex: 1;
      width: 100%;
      min-width: 0;
    }

    .profile-name {
      font-size: 24px;
      max-width: 100%;
      margin: -10px 0 -14px 0px;
    }

    .profile-username {
      font-size: 16px;
      margin: -3px 0 0px 0px;
    }

    .edit-profile-btn {
      margin-left: 0;
      width: 100%;
      justify-content: center;
    }

    .profile-header {
      display: none;
    }

    /* Full width profile content boxes on mobile */
    .profile-content-title {
      border-left: none !important;
      border-right: none !important;
      width: 100vw !important;
      margin-left: calc(-50vw + 50%) !important;
      margin-right: calc(-50vw + 50%) !important;
      padding-left: 1rem !important;
      padding-right: 1rem !important;
      box-shadow: none !important;
    }

    .profile-content-box {
      border-left: none !important;
      border-right: none !important;
      width: 100vw !important;
      margin-left: calc(-50vw + 50%) !important;
      margin-right: calc(-50vw + 50%) !important;
      box-shadow: none !important;
    }
  }
</style>
