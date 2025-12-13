<script lang="ts">
  import { Link as LinkIcon, ExternalLink, Twitter, Facebook, Youtube, Instagram, Twitch } from 'lucide-svelte';

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

  // Get display name for URL
  function getDisplayName(link: any): string {
    if (link.platform) return link.platform;
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
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            class="social-link-item"
          >
            <div class="social-link-icon">
              <Icon class="w-4 h-4" />
            </div>
            <span class="social-link-name">{getDisplayName(link)}</span>
            <ExternalLink class="w-3 h-3 social-link-external" />
          </a>
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
    gap: 8px;
  }

  .social-link-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: color-mix(in srgb, var(--page-color) 80%, black);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .social-link-item:hover {
    border-color: var(--font-link-color);
    background: color-mix(in srgb, var(--page-color) 70%, black);
  }

  .social-link-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: color-mix(in srgb, var(--page-color) 50%, black);
    color: var(--font-link-color);
  }

  .social-link-name {
    flex: 1;
    font-family: 'saira';
    font-weight: 600;
    font-size: 13px;
    color: var(--font-color);
  }

  .social-link-external {
    color: var(--font-color);
    opacity: 0.4;
    transition: opacity 0.2s ease;
  }

  .social-link-item:hover .social-link-external {
    opacity: 0.8;
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
</style>
