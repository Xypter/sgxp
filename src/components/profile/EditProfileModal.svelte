<script lang="ts">
  import { Button, Input, Label, Textarea, Select } from '$lib/components';
  import { X, Upload, Loader2, Plus, Trash2 } from 'lucide-svelte';
  import { fade, scale } from 'svelte/transition';

  // Props
  let {
    open = $bindable(false),
    user,
    onSave = async () => {}
  }: {
    open: boolean;
    user: any;
    onSave?: (data: any) => Promise<void>;
  } = $props();

  // Form state
  let displayName = $state(user?.displayName || user?.username || '');
  let bio = $state(user?.bio || '');
  let profilePictureFile = $state<File | null>(null);
  let profilePicturePreview = $state<string | null>(user?.profilePicture?.url || null);
  let deleteProfilePicture = $state(false);
  let bannerFile = $state<File | null>(null);
  let bannerPreview = $state<string | null>(user?.headerImage?.url || null);
  let deleteBanner = $state(false);
  let socialLinks = $state<Array<{ id: string; platform: string; username: string }>>(
    user?.socialLinks?.map((link: any, idx: number) => ({
      id: `${Date.now()}-${idx}`,
      platform: link.platform || '',
      username: extractUsername(link.url || '', link.platform || '')
    })) || []
  );
  let saving = $state(false);
  let error = $state<string | null>(null);

  // Use Astro API endpoints (not direct Payload CMS URLs)
  // These endpoints proxy to Payload CMS with proper authentication
  const API_BASE_URL = "/api";

  // Supported platforms (matching CMS enum values and backend URL structure)
  const platforms = [
    { value: 'discord', label: 'Discord' },
    { value: 'x', label: 'X (Twitter)' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'deviantart', label: 'DeviantArt' },
    { value: 'bluesky', label: 'Bluesky' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'reddit', label: 'Reddit' },
    { value: 'twitch', label: 'Twitch' },
    { value: 'steam', label: 'Steam' },
    { value: 'website', label: 'Website' },
    { value: 'other', label: 'Other' }
  ];

  // Extract username from URL
  function extractUsername(url: string, platform: string): string {
    if (!url) return '';

    // For website/other platforms, return the full URL
    if (platform === 'website' || platform === 'other') {
      return url;
    }

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      // Handle different platform URL patterns
      if (platform === 'youtube') {
        // YouTube uses @username format
        const match = path.match(/\/@?([\w.-]+)/);
        return match ? match[1] : '';
      } else if (platform === 'discord') {
        // Discord invite links: discord.gg/CODE
        const parts = path.split('/').filter(Boolean);
        return parts[parts.length - 1] || '';
      } else {
        // Most platforms: platform.com/username
        const parts = path.split('/').filter(Boolean);
        return parts[0] || '';
      }
    } catch {
      // If URL parsing fails, assume it's already a username
      return url;
    }
  }

  // Handle profile picture file selection
  function handleProfilePictureChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      // Profile picture can be JPEG, PNG, or GIF
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        error = 'Profile picture must be JPEG, PNG, or GIF format';
        return;
      }
      if (file.size > 100 * 1024) {
        error = 'Profile picture must be less than 100KB';
        return;
      }

      profilePictureFile = file;
      profilePicturePreview = URL.createObjectURL(file);
      error = null;
    }
  }

  // Handle banner file selection
  function handleBannerChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      // Banner must be PNG or GIF only, exactly 1200x150px
      if (!['image/png', 'image/gif'].includes(file.type)) {
        error = 'Banner must be PNG or GIF format';
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        error = 'Banner image must be less than 1MB';
        return;
      }

      // Validate dimensions
      const img = new Image();
      img.onload = () => {
        if (img.width !== 1200 || img.height !== 150) {
          error = 'Banner must be exactly 1200x150px';
          bannerFile = null;
          bannerPreview = user?.headerImage?.url || null;
        } else {
          bannerFile = file;
          bannerPreview = URL.createObjectURL(file);
          error = null;
        }
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        error = 'Failed to load image';
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    }
  }

  // Trigger file input click for profile picture
  function triggerProfilePictureUpload() {
    const input = document.getElementById('profile-picture-upload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  // Delete profile picture
  function handleDeleteProfilePicture() {
    deleteProfilePicture = true;
    profilePictureFile = null;
    profilePicturePreview = null;
  }

  // Trigger file input click for banner
  function triggerBannerUpload() {
    const input = document.getElementById('banner-upload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  // Delete banner
  function handleDeleteBanner() {
    deleteBanner = true;
    bannerFile = null;
    bannerPreview = null;
  }

  // Add social link
  function addSocialLink() {
    socialLinks = [...socialLinks, { id: `${Date.now()}-new`, platform: 'x', username: '' }];
  }

  // Remove social link
  function removeSocialLink(id: string) {
    socialLinks = socialLinks.filter(link => link.id !== id);
  }

  // Handle save
  async function handleSave() {
    saving = true;
    error = null;

    try {
      let profilePictureId = user.profilePicture?.id || null;
      let headerImageId = user.headerImage?.id || null;

      // Step 1a: Upload profile picture if selected via Astro API endpoint
      if (profilePictureFile) {
        const ppFormData = new FormData();
        ppFormData.append('file', profilePictureFile);

        const ppResponse = await fetch(`${API_BASE_URL}/media/upload`, {
          method: 'POST',
          body: ppFormData,
          credentials: 'include'
        });

        if (!ppResponse.ok) {
          const errorData = await ppResponse.json();
          console.error('Profile picture upload failed:', {
            status: ppResponse.status,
            statusText: ppResponse.statusText,
            errorData
          });

          if (ppResponse.status === 403) {
            throw new Error('Permission denied. Your account may not have access to upload images.');
          } else {
            throw new Error(errorData.message || errorData.errors?.[0]?.message || 'Failed to upload profile picture');
          }
        }

        const ppData = await ppResponse.json();
        profilePictureId = ppData.doc.id;
      }

      // Step 1b: Upload banner image if selected via Astro API endpoint
      if (bannerFile) {
        const imageFormData = new FormData();
        imageFormData.append('file', bannerFile);

        const imageResponse = await fetch(`${API_BASE_URL}/media/upload`, {
          method: 'POST',
          body: imageFormData,
          credentials: 'include'
        });

        if (!imageResponse.ok) {
          const errorData = await imageResponse.json();
          console.error('Banner upload failed:', {
            status: imageResponse.status,
            statusText: imageResponse.statusText,
            errorData
          });

          if (imageResponse.status === 403) {
            throw new Error('Permission denied. Your account may not have access to upload images.');
          } else {
            throw new Error(errorData.message || errorData.errors?.[0]?.message || 'Failed to upload banner image');
          }
        }

        const imageData = await imageResponse.json();
        headerImageId = imageData.doc.id;
      }

      // Step 2: Prepare social links - send usernames only (backend builds URLs)
      const socialLinksData = socialLinks
        .filter(link => link.username.trim())
        .map(link => {
          const username = link.username.trim();

          return {
            platform: link.platform,
            url: username  // Backend expects just the username, not full URL
          };
        });

      // Step 3: Update user profile via Astro API endpoint
      const updateData: any = {
        displayName: displayName.trim() || user?.username,
        bio: bio,
        // Always send socialLinks, even if empty (to allow deletion)
        socialLinks: socialLinksData
      };

      // Handle profile picture - delete if requested, otherwise update if uploaded
      if (deleteProfilePicture) {
        updateData.profilePicture = null;
      } else if (profilePictureId) {
        updateData.profilePicture = profilePictureId;
      }

      // Handle banner - delete if requested, otherwise update if uploaded
      if (deleteBanner) {
        updateData.headerImage = null;
      } else if (headerImageId) {
        updateData.headerImage = headerImageId;
      }

      console.log('[EditProfile] Sending update data:', updateData);

      // Use /api/users/update which proxies to Payload CMS /api/users/{id}
      const response = await fetch(`${API_BASE_URL}/users/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData),
        credentials: 'include'
      });

      console.log('[EditProfile] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Profile update failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });

        // Provide more specific error messages
        if (response.status === 403) {
          throw new Error('Permission denied. Your account may not have access to update profile fields. Please contact an administrator.');
        } else if (response.status === 401) {
          throw new Error('Please log in to update your profile.');
        } else {
          throw new Error(errorData.message || errorData.errors?.[0]?.message || 'Failed to update profile');
        }
      }

      const updatedUser = await response.json();
      await onSave(updatedUser);
      open = false;
    } catch (err: any) {
      console.error('Error saving profile:', err);
      error = err.message || 'Failed to save profile';
    } finally {
      saving = false;
    }
  }

  // Check if platform needs full URL
  function needsFullUrl(platform: string): boolean {
    return platform === 'website' || platform === 'other';
  }

  // Close modal
  function closeModal() {
    if (!saving) {
      open = false;
    }
  }
</script>

{#if open}
  <div class="modal-overlay" onclick={closeModal} onkeydown={(e) => e.key === 'Escape' && closeModal()} role="button" tabindex="0" transition:fade={{ duration: 200 }}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1" transition:scale={{ duration: 200, start: 0.95 }}>
      <!-- Modal Header -->
      <div class="modal-header">
        <h2 class="modal-title">Edit Profile</h2>
        <Button variant="ghost" size="icon" onclick={closeModal} disabled={saving} class="modal-close-btn">
          <X class="w-5 h-5" />
        </Button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        {#if error}
          <div class="error-message">
            {error}
          </div>
        {/if}

        <!-- Display Name Section -->
        <div class="form-section">
          <h3 class="section-title">Display Name</h3>
          <Input
            bind:value={displayName}
            placeholder="Enter your display name"
            disabled={saving}
            class="display-name-input"
            maxlength={50}
          />
          <p class="upload-hint">This name will be shown on your profile and posts</p>
        </div>

        <!-- Profile Picture Section -->
        <div class="form-section">
          <h3 class="section-title">Profile Picture</h3>
          <div class="profile-picture-upload-area">
            <div class="profile-picture-preview-container">
              {#if profilePicturePreview}
                <img src={profilePicturePreview} alt="Profile preview" class="profile-picture-preview" />
              {:else}
                <div class="profile-picture-placeholder">
                  <Upload class="w-6 h-6 opacity-50" />
                </div>
              {/if}
            </div>
            <div class="profile-picture-controls">
              <input
                id="profile-picture-upload"
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onchange={handleProfilePictureChange}
                disabled={saving}
                class="file-input"
              />
              <div class="button-group">
                <Button themed disabled={saving} onclick={triggerProfilePictureUpload}>
                  <Upload class="w-4 h-4 mr-2" />
                  {profilePicturePreview ? 'Change Picture' : 'Upload Picture'}
                </Button>
                {#if profilePicturePreview}
                  <Button variant="ghost" disabled={saving} onclick={handleDeleteProfilePicture} class="delete-image-btn">
                    <Trash2 class="w-4 h-4 mr-2" />
                    Delete Picture
                  </Button>
                {/if}
              </div>
              <p class="upload-hint">Required: JPEG, PNG, or GIF, max 100KB</p>
            </div>
          </div>
        </div>

        <!-- Banner Image Section -->
        <div class="form-section banner-section">
          <h3 class="section-title">Banner Image</h3>
          <div class="banner-upload-area">
            {#if bannerPreview}
              <div class="banner-preview">
                <img src={bannerPreview} alt="Banner preview" />
              </div>
            {:else}
              <div class="banner-placeholder">
                <Upload class="w-8 h-8 opacity-50" />
                <p>No banner image</p>
              </div>
            {/if}
            <input
              id="banner-upload"
              type="file"
              accept="image/png,image/gif"
              onchange={handleBannerChange}
              disabled={saving}
              class="file-input"
            />
            <div class="button-group">
              <Button themed disabled={saving} onclick={triggerBannerUpload}>
                <Upload class="w-4 h-4 mr-2" />
                {bannerPreview ? 'Change Banner' : 'Upload Banner'}
              </Button>
              {#if bannerPreview}
                <Button variant="ghost" disabled={saving} onclick={handleDeleteBanner} class="delete-image-btn">
                  <Trash2 class="w-4 h-4 mr-2" />
                  Delete Banner
                </Button>
              {/if}
            </div>
            <p class="upload-hint">Required: PNG or GIF, exactly 1200x150px, max 1MB</p>
          </div>
        </div>

        <!-- About Me Section -->
        <div class="form-section">
          <h3 class="section-title">About Me</h3>
          <Textarea
            bind:value={bio}
            placeholder="Write something about yourself..."
            rows={4}
            disabled={saving}
            class="bio-textarea"
          />
          <p class="char-count">{bio.length} / 500</p>
        </div>

        <!-- Social Links Section -->
        <div class="form-section">
          <div class="section-header">
            <h3 class="section-title">Social Links</h3>
            <Button themed size="sm" onclick={addSocialLink} disabled={saving}>
              <Plus class="w-4 h-4 mr-1" />
              Add Link
            </Button>
          </div>

          {#if socialLinks.length > 0}
            <div class="social-links-list">
              {#each socialLinks as link (link.id)}
                <div class="social-link-row">
                  <div class="social-link-fields">
                    <div class="field-group">
                      <Label>Platform</Label>
                      <Select
                        bind:value={link.platform}
                        options={platforms}
                        themed
                      />
                    </div>
                    <div class="field-group flex-1">
                      <Label>
                        {needsFullUrl(link.platform) ? 'URL' : 'Username'}
                      </Label>
                      <Input
                        id="username-{link.id}"
                        bind:value={link.username}
                        placeholder={needsFullUrl(link.platform) ? 'https://example.com' : 'Enter username'}
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onclick={() => removeSocialLink(link.id)}
                    disabled={saving}
                    title="Remove link"
                    class="remove-link-btn-themed"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              {/each}
            </div>
          {:else}
            <div class="no-social-links">
              <p>No social links added. Click "Add Link" to get started.</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <Button variant="ghost" onclick={closeModal} disabled={saving}>
          Cancel
        </Button>
        <Button themed onclick={handleSave} disabled={saving}>
          {#if saving}
            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
            Saving...
          {:else}
            Save Changes
          {/if}
        </Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  }

  .modal-content {
    background: var(--page-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    max-width: 1280px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 20px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
  }

  .modal-title {
    font-family: 'saira';
    font-weight: 800;
    font-size: 20px;
    color: var(--font-color);
    margin: 0;
    text-shadow:
      calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
      calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
  }

  :global(.modal-close-btn) {
    padding: 4px !important;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .error-message {
    background: #ff444420;
    border: 1px solid #ff4444;
    color: #ff4444;
    padding: 10px 15px;
    border-radius: 4px;
    font-family: 'saira';
    font-size: 14px;
    margin-bottom: 20px;
  }

  .form-section {
    margin-bottom: 30px;
  }

  .form-section:last-child {
    margin-bottom: 0;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;
  }

  .section-title {
    font-family: 'saira';
    font-weight: 700;
    font-size: 16px;
    color: var(--font-color);
    margin: 0 0 15px 0;
  }

  .section-header .section-title {
    margin: 0;
  }

  /* Banner Upload */
  .banner-upload-area {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .banner-preview {
    width: 1200px;
    height: 150px;
    overflow: hidden;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
  }

  .banner-preview img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .banner-placeholder {
    width: 1200px;
    height: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: color-mix(in srgb, var(--page-color) 50%, black);
    border: 1px dashed color-mix(in srgb, var(--page-color) 70%, white);
    color: var(--font-color);
  }

  .banner-placeholder p {
    font-family: 'saira';
    font-size: 12px;
    opacity: 0.5;
    margin: 0;
  }

  .file-input {
    display: none;
  }

  .upload-hint {
    font-family: 'saira';
    font-size: 11px;
    color: var(--font-color);
    opacity: 0.6;
    margin: 5px 0 0 0;
  }

  /* Profile Picture */
  .profile-picture-upload-area {
    display: flex;
    gap: 20px;
    align-items: center;
  }

  .profile-picture-preview-container {
    flex-shrink: 0;
  }

  .profile-picture-preview {
    width: 100px;
    height: 100px;
    object-fit: contain;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    image-rendering: auto;
  }

  .profile-picture-placeholder {
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--page-color) 50%, black);
    border: 1px dashed color-mix(in srgb, var(--page-color) 70%, white);
    color: var(--font-color);
  }

  .profile-picture-controls {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .button-group {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  :global(.delete-image-btn) {
    color: #ff4444 !important;
  }

  :global(.delete-image-btn:hover) {
    color: #ff6666 !important;
    background: rgba(255, 68, 68, 0.1) !important;
  }

  /* Bio */
  .char-count {
    font-family: 'saira';
    font-size: 11px;
    color: var(--font-color);
    opacity: 0.6;
    margin: 5px 0 0 0;
    text-align: right;
  }

  /* Social Links */
  .social-links-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .social-link-row {
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }

  .social-link-fields {
    flex: 1;
    display: flex;
    gap: 10px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .flex-1 {
    flex: 1;
  }

  :global(.remove-link-btn-themed) {
    color: #ff4444 !important;
    align-self: flex-end;
  }

  :global(.remove-link-btn-themed:hover) {
    color: #ff6666 !important;
  }

  .no-social-links {
    padding: 20px;
    text-align: center;
    background: color-mix(in srgb, var(--page-color) 80%, black);
    border: 1px dashed color-mix(in srgb, var(--page-color) 70%, white);
  }

  .no-social-links p {
    font-family: 'saira';
    font-size: 13px;
    color: var(--font-color);
    opacity: 0.5;
    margin: 0;
  }

  /* Modal Footer */
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 15px 20px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border-top: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0;
    }

    .modal-content {
      max-height: 100vh;
      height: 100vh;
      max-width: 100%;
      border: none !important;
      box-shadow: none !important;
    }

    .modal-header {
      border-left: none !important;
      border-right: none !important;
    }

    .modal-body {
      padding: 15px;
    }

    .profile-picture-upload-area {
      flex-direction: column;
      align-items: flex-start;
    }

    .banner-section {
      display: none !important;
    }

    .social-link-fields {
      flex-direction: column;
      width: 100%;
    }

    .field-group {
      width: 100%;
    }

    .field-group :global(select),
    .field-group :global(input) {
      width: 100% !important;
    }

    /* Full width form elements */
    .form-section {
      width: 100%;
    }

    .button-group {
      flex-direction: column;
      width: 100%;
    }

    .button-group :global(button) {
      width: 100%;
    }
  }

  /* Spin animation */
  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
