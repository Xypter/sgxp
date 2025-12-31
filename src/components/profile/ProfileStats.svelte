<script lang="ts">
  import { Award, Image, MessageSquare, TrendingUp, Clock } from 'lucide-svelte';
  import { Progress } from '$lib/components';

  // Props
  let { user }: { user: any } = $props();

  // Prestige role progress state
  let roleProgress = $state<any>(null);
  let loadingProgress = $state(true);

  // Fetch role progress from API
  async function loadRoleProgress() {
    if (!user?.id) return;

    loadingProgress = true;
    try {
      const response = await fetch(`/api/proxy/users/${user.id}/role-progress`);
      if (response.ok) {
        roleProgress = await response.json();
      }
    } catch (err) {
      console.error('Error fetching role progress:', err);
    } finally {
      loadingProgress = false;
    }
  }

  // Calculate days ago for last online
  function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();

    // Reset time to midnight for accurate day comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = todayOnly.getTime() - dateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '(Today)';
    } else if (diffDays === 1) {
      return '(Yesterday)';
    } else {
      return `(${diffDays} days ago)`;
    }
  }

  // Calculate stats (some are mock data for now)
  const stats = $derived([
    {
      icon: Image,
      label: 'Sprites',
      value: user?.approvedSubmissions || 0,
      color: 'var(--font-link-color)'
    },
    {
      icon: MessageSquare,
      label: 'Comments',
      value: user?.commentCount || 0,
      color: '#6bafff'
    }
  ]);

  // Prestige info derived from API data with fallbacks to user object
  const prestigeInfo = $derived({
    role: roleProgress?.current?.name || user?.prestigeRole || 'Newcomer',
    color: roleProgress?.current?.color || user?.prestigeColor || '#888888',
    nextRole: roleProgress?.next?.name || null,
    progress: Number(roleProgress?.progressPercent) || 0,
    submissionsNeeded: roleProgress?.submissionsNeeded || 0,
    isPerfectChaos: (roleProgress?.current?.name || user?.prestigeRole) === 'Perfect Chaos'
  });

  // Load role progress on mount
  $effect(() => {
    loadRoleProgress();
  });
</script>

<div class="profile-stats-section">
  <div class="profile-stats-title">
    <TrendingUp class="w-5 h-5 inline-block mr-2" />
    Stats
  </div>
  <div class="profile-stats-box">
    <!-- Prestige Level -->
    <div class="prestige-section">
      <div class="prestige-header">
        <Award class="w-5 h-5" style="color: {prestigeInfo.color}" />
        <span class="prestige-label">Prestige</span>
      </div>
      <div
        class="prestige-current"
        class:prestige-glow={prestigeInfo.isPerfectChaos}
        style="color: {prestigeInfo.color}"
      >
        {prestigeInfo.role}
      </div>
      {#if prestigeInfo.isPerfectChaos}
        <div class="prestige-progress-container prestige-progress-glow" style="--prestige-glow-color: {prestigeInfo.color}">
          <Progress themed value={100} max={100} color={prestigeInfo.color} />
          <div class="prestige-next prestige-complete">
            Maximum Prestige Achieved!
          </div>
        </div>
      {:else if prestigeInfo.nextRole}
        <div class="prestige-progress-container">
          <Progress themed value={prestigeInfo.progress} max={100} color={prestigeInfo.color} />
          <div class="prestige-next">
            Next: {prestigeInfo.nextRole}
            {#if prestigeInfo.submissionsNeeded > 0}
              ({prestigeInfo.submissionsNeeded} sprite{prestigeInfo.submissionsNeeded !== 1 ? 's' : ''} needed)
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <div class="stats-divider"></div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      {#each stats as stat}
        <div class="stat-item">
          <div class="stat-icon" style="color: {stat.color}">
            <stat.icon class="w-4 h-4" />
          </div>
          <div class="stat-details">
            <span class="stat-value">{stat.value}</span>
            <span class="stat-label">{stat.label}</span>
          </div>
        </div>
      {/each}
    </div>

    <div class="stats-divider"></div>

    <!-- Last Online -->
    <div class="activity-section">
      <div class="activity-header">
        <Clock class="w-4 h-4 inline-block mr-1" />
        Last Online
      </div>
      <div class="activity-value">
        {#if user?.hideLastOnline}
          <span class="activity-hidden">Hidden</span>
        {:else if user?.updatedAt}
          {new Date(user.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          <span class="activity-relative">{getRelativeTime(user.updatedAt)}</span>
        {:else}
          <span class="activity-placeholder">Unknown</span>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .profile-stats-section {
    margin-bottom: var(--gap);
  }

  .profile-stats-title {
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

  .profile-stats-box {
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

  /* Prestige Section */
  .prestige-section {
    padding-bottom: 12px;
  }

  .prestige-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .prestige-label {
    font-family: 'saira';
    font-weight: 600;
    font-size: 11px;
    color: var(--font-color);
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .prestige-current {
    font-family: 'saira';
    font-weight: 800;
    font-size: 18px;
    margin-bottom: 10px;
  }

  .prestige-progress-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .prestige-next {
    font-family: 'saira';
    font-size: 11px;
    color: var(--font-color);
    opacity: 0.6;
  }

  /* Stats Divider */
  .stats-divider {
    height: 1px;
    background: color-mix(in srgb, var(--page-color) 70%, white);
    margin: 12px 0;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    background: color-mix(in srgb, var(--page-color) 80%, black);
    border: 1px solid color-mix(in srgb, var(--page-color) 70%, white);
  }

  .stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: color-mix(in srgb, var(--page-color) 50%, black);
  }

  .stat-details {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-family: 'saira';
    font-weight: 800;
    font-size: 16px;
    color: var(--font-color);
    line-height: 1;
  }

  .stat-label {
    font-family: 'saira';
    font-weight: 600;
    font-size: 10px;
    color: var(--font-color);
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-top: 2px;
  }

  /* Activity Section */
  .activity-section {
    padding-top: 4px;
  }

  .activity-header {
    display: flex;
    align-items: center;
    font-family: 'saira';
    font-weight: 600;
    font-size: 11px;
    color: var(--font-color);
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .activity-value {
    font-family: 'saira';
    font-size: 13px;
    color: var(--font-color);
    padding: 8px 0;
  }

  .activity-relative {
    margin-left: 6px;
    opacity: 0.7;
    font-size: 12px;
  }

  .activity-hidden {
    opacity: 0.5;
    font-style: italic;
  }

  .activity-placeholder {
    opacity: 0.5;
    font-style: italic;
  }

  /* Perfect Chaos Glow Effects */
  .prestige-glow {
    animation: prestige-pulse 2s ease-in-out infinite;
    text-shadow:
      0 0 3px currentColor,
      0 0 8px currentColor;
  }

  .prestige-progress-glow :global(.theme-progress) {
    animation: progress-glow-pulse 2s ease-in-out infinite;
    box-shadow:
      0 0 5px var(--prestige-glow-color),
      0 0 12px var(--prestige-glow-color);
  }

  .prestige-progress-glow :global([data-slot="progress-indicator"]) {
    box-shadow:
      0 0 8px var(--prestige-glow-color),
      0 0 15px var(--prestige-glow-color);
  }

  .prestige-complete {
    font-weight: 700 !important;
    opacity: 1 !important;
    font-style: italic;
  }

  @keyframes prestige-pulse {
    0%, 100% {
      filter: brightness(1);
      text-shadow:
        0 0 3px currentColor,
        0 0 8px currentColor;
    }
    50% {
      filter: brightness(1.15);
      text-shadow:
        0 0 6px currentColor,
        0 0 12px currentColor;
    }
  }

  @keyframes progress-glow-pulse {
    0%, 100% {
      filter: brightness(1) drop-shadow(0 0 3px var(--prestige-glow-color));
    }
    50% {
      filter: brightness(1.1) drop-shadow(0 0 8px var(--prestige-glow-color));
    }
  }

  /* Responsive */
  @media (max-width: 900px) {
    .stats-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  @media (max-width: 600px) {
    .stats-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
