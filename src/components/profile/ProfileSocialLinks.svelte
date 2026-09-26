<script lang="ts">
  import { Link as LinkIcon, ExternalLink, Twitter, Facebook, Youtube, Instagram, Twitch } from 'lucide-svelte';
  import { Button } from '$lib/components';

  // Props
  let { socialLinks = [] }: { socialLinks?: any[] } = $props();

  // Get icon for platform
  function getPlatformIcon(platform: string) {
    const platformLower = platform?.toLowerCase() || '';

    // Supported platforms with Lucide icons
    if (platformLower.includes('twitter') || platformLower.includes('x')) return Twitter;
    if (platformLower.includes('facebook')) return Facebook;
    if (platformLower.includes('instagram')) return Instagram;
    if (platformLower.includes('youtube')) return Youtube;
    if (platformLower.includes('twitch')) return Twitch;

    // Platforms without Lucide icons - use LinkIcon for consistency
    if (platformLower.includes('discord')) return LinkIcon;
    if (platformLower.includes('deviantart')) return LinkIcon;
    if (platformLower.includes('bluesky') || platformLower.includes('bsky')) return LinkIcon;
    if (platformLower.includes('reddit')) return LinkIcon;
    if (platformLower.includes('steam')) return LinkIcon;

    return LinkIcon;
  }

  // Map platform values to display names
  function getPlatformDisplayName(platform: string): string {
    const displayNames: Record<string, string> = {
      discord: 'Discord',
      x: 'X (Twitter)',
      twitter: 'X (Twitter)',
      facebook: 'Facebook',
      instagram: 'Instagram',
      deviantart: 'DeviantArt',
      bluesky: 'Bluesky',
      youtube: 'YouTube',
      reddit: 'Reddit',
      twitch: 'Twitch',
      steam: 'Steam',
      website: 'Website',
      other: 'Other'
    };
    return displayNames[platform?.toLowerCase()] || platform;
  }

  // Get display name for URL
  function getDisplayName(link: any): string {
    if (link.platform) return getPlatformDisplayName(link.platform);
    try {
      const url = new URL(link.url);
      return url.hostname.replace('www.', '');
    } catch {
      return link.url;
    }
  }
</script>

<div class="profile-social-section">
  <div class="profile-social-title">
    <LinkIcon class="w-5 h-5 inline-block mr-2" />
    Social Links
  </div>
  <div class="profile-social-box">
    {#if socialLinks && socialLinks.length > 0}
      <div class="social-links-grid">
        {#each socialLinks as link}
          {@const Icon = getPlatformIcon(link.platform || link.url)}
          <Button
            variant="secondary"
            icon={Icon}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            class="social-link-item"
          >
            <span class="social-link-name">{getDisplayName(link)}</span>
            <ExternalLink />
          </Button>
        {/each}
      </div>
    {:else}
      <div class="no-links">
        <LinkIcon class="w-8 h-8 opacity-50" />
        <p>No social links added yet</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .profile-social-section {
    margin-bottom: var(--gap);
  }

  .profile-social-title {
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

  .profile-social-box {
    background: var(--page-color);
    padding: 15px;
    border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    color: var(--font-color);
    position: relative;
    z-index: 1;
  }

  .social-links-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Full-width rows: platform icon, name filling the row, external-link icon at the end. */
  .social-links-grid :global(.social-link-item) {
    width: 100%;
    justify-content: flex-start;
  }

  .social-link-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }

  .no-links {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    text-align: center;
    color: var(--font-color);
  }

  .no-links p {
    font-family: 'saira';
    font-size: 13px;
    opacity: 0.5;
    margin: 0;
  }

  @media (max-width: 768px) {
    .profile-social-title {
      border-left: none !important;
      border-right: none !important;
      width: 100vw !important;
      margin-left: calc(-50vw + 50%) !important;
      margin-right: calc(-50vw + 50%) !important;
      padding-left: 1rem !important;
      padding-right: 1rem !important;
      box-shadow: none !important;
    }

    .profile-social-box {
      border-left: none !important;
      border-right: none !important;
      width: 100vw !important;
      margin-left: calc(-50vw + 50%) !important;
      margin-right: calc(-50vw + 50%) !important;
      box-shadow: none !important;
    }
  }
</style>
