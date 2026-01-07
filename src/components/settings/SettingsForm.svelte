<script lang="ts">
  import { Button, Input, Label, Switch } from '$lib/components';
  import { Toaster } from '$lib/components';
  import { toast } from 'svelte-sonner';
  import { Settings, Lock, Save, Loader2, Eye, EyeOff, Shield } from 'lucide-svelte';

  // Props
  let {
    initialUser = null,
    initialError = null,
    authToken = null
  }: {
    initialUser?: any;
    initialError?: string | null;
    authToken?: string | null;
  } = $props();

  const API_BASE_URL = "https://cms.sgxp.me/api";

  // State
  let user = $state(initialUser);
  let error = $state(initialError);

  // Form states
  let newPassword = $state('');
  let confirmPassword = $state('');
  let hideLastOnline = $state(initialUser?.hideLastOnline || false);

  // UI states
  let savingPassword = $state(false);
  let savingPrivacy = $state(false);
  let showNewPassword = $state(false);
  let showConfirmPassword = $state(false);

  // Update password
  async function updatePassword() {
    // Validation
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    savingPassword = true;

    try {
      // Prepare headers with authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if token is available
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          password: newPassword
        })
      });

      if (response.ok) {
        toast.success('Password updated successfully!');
        // Clear password fields
        newPassword = '';
        confirmPassword = '';
      } else {
        const errorData = await response.json();
        // Payload CMS returns errors in an errors array
        const errorMessage = errorData.errors?.[0]?.message || errorData.message || 'Failed to update password';
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error('Error updating password:', err);
      toast.error('An error occurred. Please try again.');
    } finally {
      savingPassword = false;
    }
  }

  // Update privacy settings
  async function updatePrivacySettings() {
    savingPrivacy = true;

    try {
      // Prepare headers with authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if token is available
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          hideLastOnline
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        user = updatedUser.doc || updatedUser;
        toast.success('Privacy settings updated successfully!');
      } else {
        const errorData = await response.json();
        // Payload CMS returns errors in an errors array
        const errorMessage = errorData.errors?.[0]?.message || errorData.message || 'Failed to update privacy settings';
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error('Error updating privacy settings:', err);
      toast.error('An error occurred. Please try again.');
    } finally {
      savingPrivacy = false;
    }
  }

  // Handle keyboard submission
  function handlePasswordKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      updatePassword();
    }
  }
</script>

<div class="settings-form">
  {#if error}
    <div class="settings-content-title">Error</div>
    <div class="settings-content-box">
      <div class="error-state">
        <p>{error}</p>
      </div>
    </div>
  {:else if user}
    <!-- Page Header -->
    <div class="settings-header">
      <Settings class="w-6 h-6" />
      <h1>Account Settings</h1>
    </div>

    <!-- Password Section -->
    <div class="settings-content-title">
      <Lock class="w-5 h-5 inline-block mr-2" />
      Change Password
    </div>
    <div class="settings-content-box">
      <div class="settings-description">
        Update your password to keep your account secure. Password must be at least 8 characters.
      </div>

      <div class="form-group">
        <Label class="form-label">New Password</Label>
        <div class="password-input-wrapper">
          <Input
            id="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            bind:value={newPassword}
            placeholder="Enter your new password"
            class="settings-input"
          />
          <button
            type="button"
            class="password-toggle"
            onclick={() => showNewPassword = !showNewPassword}
          >
            {#if showNewPassword}
              <EyeOff class="w-4 h-4" />
            {:else}
              <Eye class="w-4 h-4" />
            {/if}
          </button>
        </div>
      </div>

      <div class="form-group">
        <Label class="form-label">Confirm New Password</Label>
        <div class="password-input-wrapper">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            bind:value={confirmPassword}
            placeholder="Confirm your new password"
            onkeydown={handlePasswordKeydown}
            class="settings-input"
          />
          <button
            type="button"
            class="password-toggle"
            onclick={() => showConfirmPassword = !showConfirmPassword}
          >
            {#if showConfirmPassword}
              <EyeOff class="w-4 h-4" />
            {:else}
              <Eye class="w-4 h-4" />
            {/if}
          </button>
        </div>
      </div>

      <div class="form-actions">
        <Button
          themed
          onclick={updatePassword}
          disabled={savingPassword}
        >
          {#if savingPassword}
            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
            Updating...
          {:else}
            <Lock class="w-4 h-4 mr-2" />
            Update Password
          {/if}
        </Button>
      </div>
    </div>

    <!-- Privacy Section -->
    <div class="settings-content-title">
      <Shield class="w-5 h-5 inline-block mr-2" />
      Privacy Settings
    </div>
    <div class="settings-content-box">
      <div class="settings-description">
        Control what information is visible on your public profile.
      </div>

      <div class="privacy-setting-item">
        <div class="privacy-setting-info">
          <div class="privacy-setting-label">Hide Last Online</div>
          <div class="privacy-setting-description">
            When enabled, other users won't be able to see when you were last online.
          </div>
        </div>
        <Switch bind:checked={hideLastOnline} themed />
      </div>

      <div class="form-actions">
        <Button
          themed
          onclick={updatePrivacySettings}
          disabled={savingPrivacy}
        >
          {#if savingPrivacy}
            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
            Saving...
          {:else}
            <Save class="w-4 h-4 mr-2" />
            Save Privacy Settings
          {/if}
        </Button>
      </div>
    </div>
  {:else}
    <div class="settings-content-title">Loading...</div>
    <div class="settings-content-box">
      <div class="loading-state">
        <p>Loading settings...</p>
      </div>
    </div>
  {/if}
</div>

<Toaster />

<style>
  .settings-form {
    width: 100%;
  }

  /* Header */
  .settings-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    color: var(--font-color);
  }

  .settings-header h1 {
    font-family: 'saira';
    font-weight: 800;
    font-size: 28px;
    margin: 0;
    text-shadow:
      calc(2px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
      calc(2px * var(--multiply-factor)) calc(2px * var(--multiply-factor)) 0 var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(2px * var(--multiply-factor)) 0 var(--bg-color);
  }

  /* Content Boxes */
  .settings-content-title {
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

  .settings-content-box {
    background: var(--page-color);
    padding: 20px;
    border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    margin-bottom: var(--gap);
    color: var(--font-color);
    position: relative;
    z-index: 1;
  }

  .settings-description {
    font-family: 'saira';
    font-size: 14px;
    color: var(--font-color);
    opacity: 0.8;
    margin-bottom: 20px;
    line-height: 1.5;
  }

  /* Form Groups */
  .form-group {
    margin-bottom: 20px;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .settings-form :global(.form-label) {
    display: block;
    font-family: 'saira' !important;
    font-weight: 700 !important;
    font-size: 12px !important;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--font-link-color) !important;
    margin-bottom: 8px !important;
  }

  :global(.settings-input) {
    flex: 1;
    background: color-mix(in srgb, var(--page-color) 80%, black) !important;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white) !important;
    border-radius: 0px !important;
    color: var(--font-color) !important;
    font-family: 'saira' !important;
    font-size: 14px !important;
    padding: 10px 12px !important;
  }

  :global(.settings-input:focus) {
    border-color: var(--font-link-color) !important;
    outline: none !important;
  }

  :global(.settings-input::placeholder) {
    color: var(--font-color) !important;
    opacity: 0.5 !important;
  }

  .password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .password-input-wrapper :global(.settings-input) {
    width: 100%;
    padding-right: 45px !important;
  }

  .password-toggle {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    color: var(--font-color);
    opacity: 0.6;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s ease;
  }

  .password-toggle:hover {
    opacity: 1;
  }

  .form-actions {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid color-mix(in srgb, var(--page-color) 70%, white);
  }

  :global(.save-btn) {
    flex-shrink: 0;
  }

  /* Privacy Settings */
  .privacy-setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    padding: 15px;
    background: color-mix(in srgb, var(--page-color) 90%, black);
    border: 1px solid color-mix(in srgb, var(--page-color) 70%, white);
    margin-bottom: 20px;
  }

  .privacy-setting-info {
    flex: 1;
  }

  .privacy-setting-label {
    font-family: 'saira';
    font-weight: 700;
    font-size: 14px;
    color: var(--font-color);
    margin-bottom: 4px;
  }

  .privacy-setting-description {
    font-family: 'saira';
    font-size: 12px;
    color: var(--font-color);
    opacity: 0.7;
    line-height: 1.4;
  }

  /* States */
  .loading-state,
  .error-state {
    text-align: center;
    padding: 40px 20px;
    font-family: 'saira';
    font-size: 14px;
    color: var(--font-color);
  }

  .error-state {
    color: #ff4444;
  }

  /* Spin animation */
  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Responsive */
  @media (max-width: 600px) {
    :global(.save-btn) {
      width: 100%;
      justify-content: center;
    }
  }
</style>
