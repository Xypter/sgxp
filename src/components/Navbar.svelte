<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils';
  
  // Corrected shadcn-svelte component imports
  import * as NavigationMenu from '../components/ui/navigation-menu/index.js';
  import * as DropdownMenu from '../components/ui/dropdown-menu/index.js';
  import * as Sheet from '../components/ui/sheet/index.js';
  import { Button } from '../components/ui/button/index.js';
  import PresenceCans from './PresenceCans.svelte';
  import PixelText from './PixelText.svelte';

  // Define types in module context
  type ThemeValue = 'ark' | 'snow' | 'cozy' | 'sbn' | 'style_v7' | 'hpz' | 'mfz' | 'ssz';

  interface User {
    id: string;
    email: string;
    name?: string;
    username?: string;
  }

  // Use $props() for Svelte 5 runes mode
  const { initialUser, baseURL, initialTheme }: { 
    initialUser: User | null; 
    baseURL: string; 
    initialTheme: ThemeValue;
  } = $props();

  // Svelte 5 runes for state management
  let selectedTheme = $state<ThemeValue>(initialTheme);
  let isMobileMenuOpen = $state(false);
  let user = $state<User | null>(initialUser);
  let isLoggedIn = $state<boolean>(!!initialUser);
  let isCheckingAuth = $state(true);
  let uploadCount = $state<number>(0);
  // let unreadMessageCount = $state<number>(0);

  // "dots" spinner from cli-spinners (https://github.com/sindresorhus/cli-spinners)
  const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const SPINNER_INTERVAL_MS = 80 / 3;
  let isPageLoading = $state(false);
  let spinnerFrameIndex = $state(0);
  let spinnerInterval: ReturnType<typeof setInterval> | null = null;

  function startPageLoadingSpinner(): void {
    isPageLoading = true;
    if (spinnerInterval) return;
    spinnerInterval = setInterval(() => {
      spinnerFrameIndex = (spinnerFrameIndex + 1) % SPINNER_FRAMES.length;
    }, SPINNER_INTERVAL_MS);
  }

  function stopPageLoadingSpinner(): void {
    isPageLoading = false;
    if (spinnerInterval) {
      clearInterval(spinnerInterval);
      spinnerInterval = null;
    }
  }

  // Mobile menu shows theme names as "First Letter Of Each Word" instead of
  // the all-caps labels used by the desktop dropdown - the labels themselves
  // stay uppercase (shared with desktop) so this only affects mobile display.
  function toTitleCase(label: string): string {
    return label.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Every nav icon (served from the R2 CDN). Dropdown contents - and so their <img>s -
  // aren't created until a menu opens, so without this the icons only started
  // fetching/decoding at that moment and visibly popped in after the menu had already
  // appeared. Preloading them all once (~8KB total) on mount means they're already
  // decoded in memory by the time any menu opens. Add new icons here too.
  const NAV_ICON_BASE = 'https://cdn.sgxp.me/img/nav_icons/';
  const NAV_ICON_FILES = [
    'archive', 'battlenetwork', 'christmas', 'community', 'doomsday', 'fireside',
    'guidelines', 'hiddenpalacezone', 'logout', 'mfz', 'news', 'oldsite', 'settings',
    'skysanctuaryzone', 'smackjeeves', 'spacecolonyark', 'sprites', 'upload', 'uploads',
  ].map((name) => `${NAV_ICON_BASE}nav_icon_${name}.png`)
    // Sonic head - the Login button and the Profile links (desktop + mobile).
    .concat('https://cdn.sgxp.me/img/sonic_login_icon.svg');
  // Kept referenced for the page's lifetime so the decoded images stay cached.
  const preloadedNavIcons: HTMLImageElement[] = [];

  function preloadNavIcons(): void {
    if (preloadedNavIcons.length) return;
    for (const src of NAV_ICON_FILES) {
      const img = new Image();
      img.src = src;
      img.decode().catch(() => {});
      preloadedNavIcons.push(img);
    }
  }

  // Constants that don't need to be reactive
  const themes: { value: ThemeValue; label: string; icon: string }[] = [
    { value: 'ark', label: 'SPACE COLONY ARK', icon: 'https://cdn.sgxp.me/img/nav_icons/nav_icon_spacecolonyark.png' },
    { value: 'snow', label: 'CHRISTMAS', icon: 'https://cdn.sgxp.me/img/nav_icons/nav_icon_christmas.png' },
    { value: 'cozy', label: 'FIRESIDE', icon: 'https://cdn.sgxp.me/img/nav_icons/nav_icon_fireside.png' },
    { value: 'sbn', label: 'BATTLE NETWORK', icon: 'https://cdn.sgxp.me/img/nav_icons/nav_icon_battlenetwork.png' },
    { value: 'style_v7', label: 'DOOMSDAY ZONE', icon: 'https://cdn.sgxp.me/img/nav_icons/nav_icon_doomsday.png' },
    { value: 'hpz', label: 'HIDDEN PALACE ZONE', icon: 'https://cdn.sgxp.me/img/nav_icons/nav_icon_hiddenpalacezone.png' },
    { value: 'mfz', label: 'MFZ', icon: 'https://cdn.sgxp.me/img/nav_icons/nav_icon_mfz.png' },
    { value: 'ssz', label: 'SKY SANCTUARY ZONE', icon: 'https://cdn.sgxp.me/img/nav_icons/nav_icon_skysanctuaryzone.png' }
  ];

  // Function to check authentication status
async function checkAuthStatus(): Promise<void> {
  try {
    const response = await fetch('/api/users/me', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (response.ok) {
      const userData = await response.json();
      user = userData;
      isLoggedIn = true;
      fetchUploadCount();
      // fetchUnreadMessageCount();
    } else {
      user = null;
      isLoggedIn = false;
      uploadCount = 0;
      // unreadMessageCount = 0;
    }
  } catch (error) {
    console.error('Error checking authentication status:', error);
    user = null;
    isLoggedIn = false;
    uploadCount = 0;
    // unreadMessageCount = 0;
  } finally {
    isCheckingAuth = false;
  }
}

  // Function to fetch user's upload count
  async function fetchUploadCount(): Promise<void> {
    if (!user?.id) return;

    try {
      const params = new URLSearchParams({
        'where[author][equals]': user.id.toString(),
        'limit': '0'
      });

      const response = await fetch(`/api/sprites?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        uploadCount = data.totalDocs || 0;
      }
    } catch (error) {
      console.error('Error fetching upload count:', error);
    }
  }

  // Function to fetch unread message count
  // async function fetchUnreadMessageCount(): Promise<void> {
  //   if (!user?.id) return;

  //   try {
  //     const response = await fetch('/api/messages/unread-count', {
  //       method: 'GET',
  //       credentials: 'include',
  //     });

  //     if (response.ok) {
  //       const data = await response.json();
  //       unreadMessageCount = data.unreadCount || 0;
  //     }
  //   } catch (error) {
  //     console.error('Error fetching unread message count:', error);
  //   }
  // }

  // Function to handle logout
  async function handleLogout(): Promise<void> {
  try {
    await fetch(`${baseURL}/api/users/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookies
    });

    user = null;
    isLoggedIn = false;

    window.dispatchEvent(new CustomEvent('userLogout'));
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout failed:', error);
    // Even if logout fails, redirect to login
    window.location.href = '/login';
  }
}

  // Get display name for user
  const getUserDisplayName = (currentUser: User): string => {
    if (currentUser.name) return currentUser.name;
    if (currentUser.username) return currentUser.username;
    if (currentUser.email) {
      const emailParts = currentUser.email.split('@');
      return emailParts[0] || 'User';
    }
    return 'User';
  };

  // The function to handle theme changes is now asynchronous.
  async function handleThemeChange(theme: ThemeValue): Promise<void> {
    selectedTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    updateWorldStarsClass(theme);

    // Set the cookie synchronously on the client too. If the user navigates
    // to another page right after picking a theme (a view-transition nav
    // fires a same-origin request immediately), that request must not race
    // the POST below - without this, it can go out before the server's
    // Set-Cookie is applied and the new page renders with the old theme.
    const secureAttr = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax${secureAttr}`;

    try {
      await fetch(`${baseURL}/api/set-theme`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          credentials: 'include', // Add this line
          body: JSON.stringify({ theme }),
      });
  } catch (error) {
      console.error('Error saving theme to cookie:', error);
  }
  }

  // Function from your original code
  const updateWorldStarsClass = (theme: ThemeValue): void => {
    const worldStarsDiv = document.querySelector('.world-stars');
    if (theme === "ark") {
      if (!worldStarsDiv) {
        const newWorldStarsDiv = document.createElement('div');
        newWorldStarsDiv.className = 'world-stars';
        document.body.prepend(newWorldStarsDiv);
      }
    } else if (worldStarsDiv) {
      worldStarsDiv.remove();
    }
  };

  onMount(() => {
  preloadNavIcons();
  let lastAuthCheck = Date.now();
  const AUTH_CHECK_DEBOUNCE_MS = 30000; // Only re-check auth every 30 seconds

  const handleVisibilityChange = (): void => {
    if (!document.hidden) {
      const now = Date.now();
      // Debounce: only check if 30+ seconds since last check
      if (now - lastAuthCheck >= AUTH_CHECK_DEBOUNCE_MS) {
        lastAuthCheck = now;
        checkAuthStatus();
        // if (user?.id) {
        //   fetchUnreadMessageCount();
        // }
      }
    }
  };

  const handleUserLogin = () => {
    lastAuthCheck = Date.now();
    checkAuthStatus(); // Re-check auth status when login event fires
  };

  const handleUserLogout = () => {
    user = null;
    isLoggedIn = false;
    uploadCount = 0;
    // unreadMessageCount = 0;
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('userLogin', handleUserLogin);
  window.addEventListener('userLogout', handleUserLogout);

  // Astro view-transition navigation lifecycle: show the spinner as soon as a
  // navigation is kicked off, hide it once the new page has swapped in.
  document.addEventListener('astro:before-preparation', startPageLoadingSpinner);
  document.addEventListener('astro:page-load', stopPageLoadingSpinner);

  // If a navigation gets interrupted (browser back/forward, or a reload
  // while a transition is in flight) the page can be restored from bfcache
  // with this component's JS state frozen mid-transition - isPageLoading
  // stuck true and the spinner sitting on whatever frame it was on, since
  // the whole JS context (and this onMount) never reran to reset it.
  // event.persisted is only true for an actual bfcache restore - never for
  // a normal fresh load or an Astro SPA-style navigation - so this can't
  // interfere with legitimate spinner runs.
  const handlePageShow = (e: PageTransitionEvent) => {
    if (e.persisted) stopPageLoadingSpinner();
  };
  window.addEventListener('pageshow', handlePageShow);

  // OPTIMIZATION: Skip initial check if SSR already provided user data
  if (initialUser) {
    isCheckingAuth = false;
    fetchUploadCount();
    // fetchUnreadMessageCount();
  } else {
    checkAuthStatus();
    lastAuthCheck = Date.now();
  }

  // Cleanup event listeners
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('userLogin', handleUserLogin);
    window.removeEventListener('userLogout', handleUserLogout);
    document.removeEventListener('astro:before-preparation', startPageLoadingSpinner);
    document.removeEventListener('astro:page-load', stopPageLoadingSpinner);
    window.removeEventListener('pageshow', handlePageShow);
    stopPageLoadingSpinner();
  };
});
</script>

<!-- Desktop navbar - hidden below 1200px, where it gets too crowded and
     overflows; the floating hamburger below takes over. Keep the 1200px in
     sync with the hamburger wrapper and the `nav` media query in <style>. -->
<nav
  class="sticky top-0 items-center justify-between border-b z-50"
  style="
    background-color: var(--page-color);
    border-bottom-color: color-mix(in srgb, var(--page-color) 80%, white);
    color: var(--font-color);
  "
>
  <div class="hidden min-[1200px]:flex items-center w-full">
    <div class="flex items-center ml-4">
      <div
        class="cursor-pointer transition-opacity duration-200 no-theme-styles"
        style="
          color: var(--font-color);
          font-family: logo;
          font-size: 14px;
          text-shadow: 
            -1px -1px 0 var(--bg-color),
            0px -1px 0 var(--bg-color),
            1px -1px 0 var(--bg-color),
            1px 0px 0 var(--bg-color),
            1px 1px 0 var(--bg-color),
            0px 1px 0 var(--bg-color),
            -1px 1px 0 var(--bg-color),
            -1px 0px 0 var(--bg-color);
        "
        onmouseenter={(e: MouseEvent) => {
          if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.textShadow = `
              1px 1px 0px rgb(251,227,6),
              2px 2px 0px rgb(238,127,14),
              3px 3px 0px rgb(37,89,164),
              4px 4px 0px rgb(233,62,44),
              5px 5px 0px rgb(251,227,6),
              6px 6px 0px rgb(238,127,14),
              7px 7px 0px rgb(37,89,164),
              8px 8px 0px rgb(233,62,44);
            `;
          }
        }}
        onmouseleave={(e: MouseEvent) => {
          if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.textShadow = `
              -1px -1px 0 var(--bg-color),
              0px -1px 0 var(--bg-color),
              1px -1px 0 var(--bg-color),
              1px 0px 0 var(--bg-color),
              1px 1px 0 var(--bg-color),
              0px 1px 0 var(--bg-color),
              -1px 1px 0 var(--bg-color),
              -1px 0px 0 var(--bg-color);
            `;
          }
        }}
        onclick={() => (window.location.href = '/')}
        role="button"
        tabindex="0"
        onkeydown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            window.location.href = '/';
          }
        }}
      >
        THE SGXP
      </div>

      <span
        class="no-theme-styles page-loading-spinner"
        class:page-loading-spinner--visible={isPageLoading}
        style="color: var(--font-color); margin-left: 12px;"
        role="status"
        aria-label="Loading"
        aria-hidden={!isPageLoading}
      >
        {SPINNER_FRAMES[spinnerFrameIndex]}
      </span>

      <NavigationMenu.Root viewport={false}>
        <NavigationMenu.List class="flex space-x-1">
          <NavigationMenu.Item>
            <NavigationMenu.Link
              class={cn(
                "group inline-flex h-12 w-max items-center justify-center rounded-md px-4 font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 no-theme-styles"
              )}
              style="
                color: var(--font-color);
                font-family: nav;
                font-size: 16px;
                padding-left: 12px;
                text-shadow:
                  -1px -1px 0 var(--bg-color),
                  0px -1px 0 var(--bg-color),
                  1px -1px 0 var(--bg-color),
                  1px 0px 0 var(--bg-color),
                  1px 1px 0 var(--bg-color),
                  0px 1px 0 var(--bg-color),
                  -1px 1px 0 var(--bg-color),
                  -1px 0px 0 var(--bg-color);
              "
              onmouseenter={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                }
              }}
              onmouseleave={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              href="/"
            >
              <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_news.png" alt="" class="nav-icon" style="position: relative; top: 1px;" />
              <span class="nav-top-label"><PixelText text="News" /></span>
            </NavigationMenu.Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <NavigationMenu.Link
              class={cn(
                "group inline-flex h-12 w-max items-center justify-center rounded-md px-4 font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 no-theme-styles"
              )}
              style="
                color: var(--font-color);
                font-family: nav;
                font-size: 16px;
                text-shadow:
                  -1px -1px 0 var(--bg-color),
                  0px -1px 0 var(--bg-color),
                  1px -1px 0 var(--bg-color),
                  1px 0px 0 var(--bg-color),
                  1px 1px 0 var(--bg-color),
                  0px 1px 0 var(--bg-color),
                  -1px 1px 0 var(--bg-color),
                  -1px 0px 0 var(--bg-color);
              "
              onmouseenter={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                }
              }}
              onmouseleave={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              href="/sprites"
            >
              <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_sprites.png" alt="" class="nav-icon" />
              <span class="nav-top-label"><PixelText text="Sprites" /></span>
            </NavigationMenu.Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <NavigationMenu.Trigger
              class={cn(
                "group inline-flex h-12 w-max items-center justify-center rounded-md px-4 font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 no-theme-styles bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent"
              )}
              style="
                color: var(--font-color);
                font-family: nav;
                font-size: 16px;
                text-shadow:
                  -1px -1px 0 var(--bg-color),
                  0px -1px 0 var(--bg-color),
                  1px -1px 0 var(--bg-color),
                  1px 0px 0 var(--bg-color),
                  1px 1px 0 var(--bg-color),
                  0px 1px 0 var(--bg-color),
                  -1px 1px 0 var(--bg-color),
                  -1px 0px 0 var(--bg-color);
              "
              onmouseenter={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                }
              }}
              onmouseleave={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_community.png" alt="" class="nav-icon" />
              <span class="nav-top-label"><PixelText text="Community" /></span>
              <span class="nav-caret" aria-hidden="true"><PixelText text="▾" /><PixelText text="▴" /></span>
            </NavigationMenu.Trigger>
            <NavigationMenu.Content
              class="no-theme-styles !p-0"
              style="
                width: 240px;
                background-color: var(--page-color);
                border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
                border-radius: 0;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                z-index: 50;
              "
            >
              <NavigationMenu.Link
                class="cursor-pointer focus:outline-none no-theme-styles"
                style="
                  background-color: color-mix(in srgb, var(--page-color) 99%, black);
                  border-radius: 0;
                  padding: 12px 18px;
                  color: var(--font-color);
                  font-family: nav;
                  font-size: 16px;
                  line-height: 22px;
                  text-shadow:
                    -1px -1px 0 var(--bg-color),
                    0px -1px 0 var(--bg-color),
                    1px -1px 0 var(--bg-color),
                    1px 0px 0 var(--bg-color),
                    1px 1px 0 var(--bg-color),
                    0px 1px 0 var(--bg-color),
                    -1px 1px 0 var(--bg-color),
                    -1px 0px 0 var(--bg-color);
                "
                onmouseenter={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                  }
                }}
                onmouseleave={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                href="/sprite-sheet-guidelines"
              >
                <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_guidelines.png" alt="" class="nav-icon" />
                <PixelText text="Sprite Sheet Guidelines" lineHeight={22} />
              </NavigationMenu.Link>
              <NavigationMenu.Link
                class="cursor-pointer focus:outline-none no-theme-styles"
                style="
                  background-color: color-mix(in srgb, var(--page-color) 99%, black);
                  border-radius: 0;
                  padding: 12px 18px;
                  color: var(--font-color);
                  font-family: nav;
                  font-size: 16px;
                  line-height: 22px;
                  text-shadow:
                    -1px -1px 0 var(--bg-color),
                    0px -1px 0 var(--bg-color),
                    1px -1px 0 var(--bg-color),
                    1px 0px 0 var(--bg-color),
                    1px 1px 0 var(--bg-color),
                    0px 1px 0 var(--bg-color),
                    -1px 1px 0 var(--bg-color),
                    -1px 0px 0 var(--bg-color);
                "
                onmouseenter={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                  }
                }}
                onmouseleave={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                href="/upload-guide"
              >
                <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_guidelines.png" alt="" class="nav-icon" />
                <PixelText text="Upload Guide" lineHeight={22} />
              </NavigationMenu.Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <NavigationMenu.Trigger
              class={cn(
                "group inline-flex h-12 w-max items-center justify-center rounded-md px-4 font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 no-theme-styles bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent"
              )}
              style="
                color: var(--font-color);
                font-family: nav;
                font-size: 16px;
                text-shadow:
                  -1px -1px 0 var(--bg-color),
                  0px -1px 0 var(--bg-color),
                  1px -1px 0 var(--bg-color),
                  1px 0px 0 var(--bg-color),
                  1px 1px 0 var(--bg-color),
                  0px 1px 0 var(--bg-color),
                  -1px 1px 0 var(--bg-color),
                  -1px 0px 0 var(--bg-color);
              "
              onmouseenter={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                }
              }}
              onmouseleave={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_archive.png" alt="" class="nav-icon" style="position: relative; top: 1px;" />
              <span class="nav-top-label"><PixelText text="Archive" /></span>
              <span class="nav-caret" aria-hidden="true"><PixelText text="▾" /><PixelText text="▴" /></span>
            </NavigationMenu.Trigger>
            <NavigationMenu.Content
              class="no-theme-styles !p-0"
              style="
                width: 220px;
                background-color: var(--page-color);
                border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
                border-radius: 0;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                z-index: 50;
              "
            >
              <NavigationMenu.Link
                class="cursor-pointer focus:outline-none no-theme-styles"
                style="
                  background-color: color-mix(in srgb, var(--page-color) 99%, black);
                  border-radius: 0;
                  padding: 12px 18px;
                  color: var(--font-color);
                  font-family: nav;
                  font-size: 16px;
                  line-height: 22px;
                  text-shadow:
                    -1px -1px 0 var(--bg-color),
                    0px -1px 0 var(--bg-color),
                    1px -1px 0 var(--bg-color),
                    1px 0px 0 var(--bg-color),
                    1px 1px 0 var(--bg-color),
                    0px 1px 0 var(--bg-color),
                    -1px 1px 0 var(--bg-color),
                    -1px 0px 0 var(--bg-color);
                "
                onmouseenter={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                  }
                }}
                onmouseleave={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                href="/smackjeeves"
              >
                <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_smackjeeves.png" alt="" class="nav-icon" />
                <PixelText text="Smack Jeeves" lineHeight={22} />
              </NavigationMenu.Link>
              <NavigationMenu.Link
                class="cursor-pointer focus:outline-none no-theme-styles"
                style="
                  background-color: color-mix(in srgb, var(--page-color) 99%, black);
                  border-radius: 0;
                  padding: 12px 18px;
                  color: var(--font-color);
                  font-family: nav;
                  font-size: 16px;
                  line-height: 22px;
                  text-shadow:
                    -1px -1px 0 var(--bg-color),
                    0px -1px 0 var(--bg-color),
                    1px -1px 0 var(--bg-color),
                    1px 0px 0 var(--bg-color),
                    1px 1px 0 var(--bg-color),
                    0px 1px 0 var(--bg-color),
                    -1px 1px 0 var(--bg-color),
                    -1px 0px 0 var(--bg-color);
                "
                onmouseenter={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                  }
                }}
                onmouseleave={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                href="/smackjeevesarchivetriage"
              >
                <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_smackjeeves.png" alt="" class="nav-icon" />
                <PixelText text="Archive Triage" lineHeight={22} />
              </NavigationMenu.Link>
              <NavigationMenu.Link
                class="cursor-pointer focus:outline-none no-theme-styles"
                style="
                  background-color: color-mix(in srgb, var(--page-color) 99%, black);
                  border-radius: 0;
                  padding: 12px 18px;
                  color: var(--font-color);
                  font-family: nav;
                  font-size: 16px;
                  line-height: 22px;
                  text-shadow:
                    -1px -1px 0 var(--bg-color),
                    0px -1px 0 var(--bg-color),
                    1px -1px 0 var(--bg-color),
                    1px 0px 0 var(--bg-color),
                    1px 1px 0 var(--bg-color),
                    0px 1px 0 var(--bg-color),
                    -1px 1px 0 var(--bg-color),
                    -1px 0px 0 var(--bg-color);
                "
                onmouseenter={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                  }
                }}
                onmouseleave={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                href="/smackjeevesarchivetriage/leaderboard"
              >
                <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_smackjeeves.png" alt="" class="nav-icon" />
                <PixelText text="Archive Leaderboard" lineHeight={22} />
              </NavigationMenu.Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <NavigationMenu.Link
              class={cn(
                "group inline-flex h-12 w-max items-center justify-center rounded-md px-4 font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 no-theme-styles"
              )}
              style="
                color: var(--font-color);
                font-family: nav;
                font-size: 16px;
                text-shadow:
                  -1px -1px 0 var(--bg-color),
                  0px -1px 0 var(--bg-color),
                  1px -1px 0 var(--bg-color),
                  1px 0px 0 var(--bg-color),
                  1px 1px 0 var(--bg-color),
                  0px 1px 0 var(--bg-color),
                  -1px 1px 0 var(--bg-color),
                  -1px 0px 0 var(--bg-color);
              "
              onmouseenter={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                }
              }}
              onmouseleave={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              href="http://old.sgxp.me"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_oldsite.png" alt="" class="nav-icon" />
              <span class="nav-top-label"><PixelText text="Old Site" /></span>
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>
    </div>

    <div class="flex-1 flex items-center overflow-x-hidden mx-2">
      <PresenceCans />
    </div>

    <NavigationMenu.Root viewport={false}>
      <NavigationMenu.List class="flex items-center gap-0">
        {#if isLoggedIn && user}
          <NavigationMenu.Item>
            <NavigationMenu.Trigger
              class={cn(
                "group inline-flex h-12 w-max items-center justify-center px-4 font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 no-theme-styles bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent"
              )}
              style="
                color: var(--font-color);
                font-family: nav;
                font-size: 16px;
                text-shadow:
                  -1px -1px 0 var(--bg-color),
                  0px -1px 0 var(--bg-color),
                  1px -1px 0 var(--bg-color),
                  1px 0px 0 var(--bg-color),
                  1px 1px 0 var(--bg-color),
                  0px 1px 0 var(--bg-color),
                  -1px 1px 0 var(--bg-color),
                  -1px 0px 0 var(--bg-color);
              "
              onmouseenter={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                }
              }}
              onmouseleave={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <img
                src="https://cdn.sgxp.me/img/sonic_login_icon.svg"
                alt="User"
                class=""
                style="
                  background-color: transparent;
                  padding-top: 4px;
                  margin-right: 8px;
                "
              />
              <span class="nav-top-label"><PixelText text={getUserDisplayName(user)} /></span>
              <span class="nav-caret" aria-hidden="true"><PixelText text="▾" /><PixelText text="▴" /></span>
            </NavigationMenu.Trigger>
            <NavigationMenu.Content
              class="no-theme-styles !p-0"
              style="
                width: 190px;
                left: auto;
                right: 0;
                background-color: var(--page-color);
                border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
                border-radius: 0;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                z-index: 50;
              "
            >
              <NavigationMenu.Link
                class="cursor-pointer focus:outline-none no-theme-styles"
                style="
                  background-color: color-mix(in srgb, var(--page-color) 99%, black);
                  border-radius: 0;
                  padding: 12px 18px;
                  color: var(--font-color);
                  font-family: nav;
                  font-size: 16px;
                  line-height: 22px;
                  text-shadow:
                    -1px -1px 0 var(--bg-color),
                    0px -1px 0 var(--bg-color),
                    1px -1px 0 var(--bg-color),
                    1px 0px 0 var(--bg-color),
                    1px 1px 0 var(--bg-color),
                    0px 1px 0 var(--bg-color),
                    -1px 1px 0 var(--bg-color),
                    -1px 0px 0 var(--bg-color);
                "
                onmouseenter={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                  }
                }}
                onmouseleave={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                href="/profile"
              >
                <img src="https://cdn.sgxp.me/img/sonic_login_icon.svg" alt="" class="nav-icon" style="width: 16px; height: 16px; position: relative; top: 3px;" />
                <PixelText text="Profile" lineHeight={22} />
              </NavigationMenu.Link>
              <NavigationMenu.Link
                class="cursor-pointer focus:outline-none no-theme-styles"
                style="
                  background-color: color-mix(in srgb, var(--page-color) 99%, black);
                  border-radius: 0;
                  padding: 12px 18px;
                  color: var(--font-color);
                  font-family: nav;
                  font-size: 16px;
                  line-height: 22px;
                  text-shadow:
                    -1px -1px 0 var(--bg-color),
                    0px -1px 0 var(--bg-color),
                    1px -1px 0 var(--bg-color),
                    1px 0px 0 var(--bg-color),
                    1px 1px 0 var(--bg-color),
                    0px 1px 0 var(--bg-color),
                    -1px 1px 0 var(--bg-color),
                    -1px 0px 0 var(--bg-color);
                "
                onmouseenter={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                  }
                }}
                onmouseleave={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                href="/profile/uploads"
              >
                <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_uploads.png" alt="" class="nav-icon" style="position: relative; top: 2px;" />
                <PixelText text={`Uploads (${uploadCount})`} lineHeight={22} />
              </NavigationMenu.Link>
              <NavigationMenu.Link
                class="cursor-pointer focus:outline-none no-theme-styles"
                style="
                  background-color: color-mix(in srgb, var(--page-color) 99%, black);
                  border-radius: 0;
                  padding: 12px 18px;
                  color: var(--font-color);
                  font-family: nav;
                  font-size: 16px;
                  line-height: 22px;
                  text-shadow:
                    -1px -1px 0 var(--bg-color),
                    0px -1px 0 var(--bg-color),
                    1px -1px 0 var(--bg-color),
                    1px 0px 0 var(--bg-color),
                    1px 1px 0 var(--bg-color),
                    0px 1px 0 var(--bg-color),
                    -1px 1px 0 var(--bg-color),
                    -1px 0px 0 var(--bg-color);
                "
                onmouseenter={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                  }
                }}
                onmouseleave={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                href="/settings"
              >
                <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_settings.png" alt="" class="nav-icon" style="position: relative; left: -3px; margin-right: 2px;" />
                <PixelText text="Settings" lineHeight={22} />
              </NavigationMenu.Link>
              <div style="border-top: 1px solid color-mix(in srgb, var(--page-color) 80%, white);"></div>
              <NavigationMenu.Link
                class="cursor-pointer focus:outline-none no-theme-styles"
                style="
                  background-color: color-mix(in srgb, var(--page-color) 99%, black);
                  border-radius: 0;
                  padding: 12px 18px;
                  color: var(--font-color);
                  font-family: nav;
                  font-size: 16px;
                  line-height: 22px;
                  text-shadow:
                    -1px -1px 0 var(--bg-color),
                    0px -1px 0 var(--bg-color),
                    1px -1px 0 var(--bg-color),
                    1px 0px 0 var(--bg-color),
                    1px 1px 0 var(--bg-color),
                    0px 1px 0 var(--bg-color),
                    -1px 1px 0 var(--bg-color),
                    -1px 0px 0 var(--bg-color);
                "
                onmouseenter={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                  }
                }}
                onmouseleave={(e: MouseEvent) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                onclick={handleLogout}
              >
                <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_logout.png" alt="" class="nav-icon" style="position: relative; top: -2px; left: -2px;" />
                <PixelText text="Logout" lineHeight={22} />
              </NavigationMenu.Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <Button
              variant="ghost"
              class={cn(
                "h-12 px-4 font-medium no-theme-styles ml-2"
              )}
              style="
                color: var(--font-color);
                background-color: transparent;
                font-family: nav;
                font-size: 16px;
                text-shadow:
                  -1px -1px 0 var(--bg-color),
                  0px -1px 0 var(--bg-color),
                  1px -1px 0 var(--bg-color),
                  1px 0px 0 var(--bg-color),
                  1px 1px 0 var(--bg-color),
                  0px 1px 0 var(--bg-color),
                  -1px 1px 0 var(--bg-color),
                  -1px 0px 0 var(--bg-color);
              "
              onmouseenter={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                }
              }}
              onmouseleave={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              href="/upload"
            >
              <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_upload.png" alt="" class="nav-icon" style="position: relative; top: -2px;" />
              <span class="nav-top-label"><PixelText text="Upload" /></span>
            </Button>
          </NavigationMenu.Item>
        {:else}
          <NavigationMenu.Item>
            <Button
              variant="ghost"
              class={cn(
                "h-12 px-4 font-medium no-theme-styles"
              )}
              style="
                color: var(--font-color);
                background-color: transparent;
                font-family: nav;
                font-size: 16px;
                text-shadow:
                  -1px -1px 0 var(--bg-color),
                  0px -1px 0 var(--bg-color),
                  1px -1px 0 var(--bg-color),
                  1px 0px 0 var(--bg-color),
                  1px 1px 0 var(--bg-color),
                  0px 1px 0 var(--bg-color),
                  -1px 1px 0 var(--bg-color),
                  -1px 0px 0 var(--bg-color);
              "
              onmouseenter={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                }
              }}
              onmouseleave={(e: MouseEvent) => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              href="/login"
            >
              <img
                src="https://cdn.sgxp.me/img/sonic_login_icon.svg"
                alt="Login"
                class=""
                style="
                  padding-top: 2px;
                "
              />
              <span class="nav-top-label"><PixelText text="Login" /></span>
            </Button>
          </NavigationMenu.Item>
        {/if}

        <!-- Theme picker: click-to-open rather than the menu's default hover-to-open -->
        <NavigationMenu.Item openOnHover={false}>
          <NavigationMenu.Trigger
            class={cn(
              "group inline-flex h-12 w-max items-center justify-center px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 no-theme-styles bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent"
            )}
            style="
              color: var(--font-color);
              background-color: transparent;
              border: none;
              font-family: nav;
              font-size: 16px;
              text-shadow:
                -1px -1px 0 var(--bg-color),
                0px -1px 0 var(--bg-color),
                1px -1px 0 var(--bg-color),
                1px 0px 0 var(--bg-color),
                1px 1px 0 var(--bg-color),
                0px 1px 0 var(--bg-color),
                -1px 1px 0 var(--bg-color),
                -1px 0px 0 var(--bg-color);
            "
            onmouseenter={(e: MouseEvent) => {
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
              }
            }}
            onmouseleave={(e: MouseEvent) => {
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <img
              src={themes.find(theme => theme.value === selectedTheme)?.icon || 'https://cdn.sgxp.me/img/nav_icons/nav_icon_doomsday.png'}
              alt=""
              class="nav-icon"
            />
            <span class="nav-top-label"><PixelText text={themes.find(theme => theme.value === selectedTheme)?.label || 'DOOMSDAY ZONE'} /></span>
            <span class="nav-caret" aria-hidden="true"><PixelText text="▾" /><PixelText text="▴" /></span>
          </NavigationMenu.Trigger>
          <NavigationMenu.Content
            class="no-theme-styles !p-0"
            style="
              width: 220px;
              left: auto;
              right: 0;
              background-color: var(--page-color);
              border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
              border-radius: 0;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              z-index: 50;
            "
          >
            {#each themes as theme (theme.value)}
              <NavigationMenu.Link
                onclick={() => handleThemeChange(theme.value)}
                class={cn(
                  "cursor-pointer focus:outline-none no-theme-styles",
                  selectedTheme === theme.value && "bg-black/30"
                )}
                style="
                  border-radius: 0;
                  padding: 12px 18px;
                  color: var(--font-color);
                  font-family: nav;
                  font-size: 16px;
                  line-height: 22px;
                  text-shadow:
                    -1px -1px 0 var(--bg-color),
                    0px -1px 0 var(--bg-color),
                    1px -1px 0 var(--bg-color),
                    1px 0px 0 var(--bg-color),
                    1px 1px 0 var(--bg-color),
                    0px 1px 0 var(--bg-color),
                    -1px 1px 0 var(--bg-color),
                    -1px 0px 0 var(--bg-color);
                "
                onmouseenter={(e: MouseEvent) => {
                  if (selectedTheme !== theme.value) {
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--page-color) 60%, black)';
                    }
                  }
                }}
                onmouseleave={(e: MouseEvent) => {
                  if (selectedTheme !== theme.value) {
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  } else {
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)';
                    }
                  }
                }}
              >
                <img src={theme.icon} alt="" class="nav-icon" />
                <PixelText text={theme.label} lineHeight={22} />
              </NavigationMenu.Link>
            {/each}
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>
  </div>

</nav>

<!-- Mobile: Floating hamburger button only - completely separate from navbar -->
<div class="min-[1200px]:hidden fixed top-3 right-3 z-50">
  <Sheet.Root bind:open={isMobileMenuOpen}>
    <Sheet.Trigger
      class="no-theme-styles p-2.5 rounded-lg shadow-lg"
      style="
        color: var(--font-color);
        background-color: var(--page-color);
        border: 1px solid rgba(255,255,255,0.2);
      "
    >
      <svg
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </Sheet.Trigger>
    <Sheet.Content
      side="right"
      portalProps={{ disabled: true }}
      class="no-theme-styles w-[280px] max-w-[80vw] p-0 overflow-hidden mobile-sheet-content"
      style="
        background-color: var(--page-color);
        border-left: 1px solid rgba(255,255,255,0.15);
      "
    >
      <!-- Header with close button -->
      <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color: rgba(255,255,255,0.15); background-color: color-mix(in srgb, var(--page-color) 80%, black);">
        <a
          href="/"
          class="no-theme-styles"
          style="
            color: var(--font-color);
            font-family: logo;
            font-size: 32px;
          "
          onclick={() => (isMobileMenuOpen = false)}
        >
         THE SGXP
        </a>
        <button
          class="no-theme-styles p-1.5 rounded-md transition-colors"
          style="
            color: var(--font-color);
            background-color: transparent;
            border: none;
          "
          onclick={() => (isMobileMenuOpen = false)}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Scrollable content -->
      <div class="overflow-y-auto" style="max-height: calc(100vh - 57px);">
        <div class="px-3">
          <!-- User section -->
          {#if isLoggedIn && user}
            <div class="pb-4 mb-4 border-b" style="border-color: rgba(255,255,255,0.1);">
              <div class="flex items-center gap-3 px-3 mb-2">
                <!-- Usernames have no spaces to wrap at, so a long/wide one (up to 20 chars) could
                     run past the menu's edge - truncate with an ellipsis instead; full name on long-press via title -->
                <span
                  title={getUserDisplayName(user)}
                  style="color: var(--font-color); font-family: saira; font-size: 20px; font-weight: 900; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                >
                  {getUserDisplayName(user)}
                </span>
              </div>
              <a
                href="/profile"
                class="mobile-nav-link"
                onclick={() => (isMobileMenuOpen = false)}
              >
                <img src="https://cdn.sgxp.me/img/sonic_login_icon.svg" alt="" class="nav-icon" style="width: 16px; height: 16px;" />
                <span style="position: relative; left: 3px;">Profile</span>
              </a>
              <a
                href="/profile/uploads"
                class="mobile-nav-link"
                onclick={() => (isMobileMenuOpen = false)}
              >
                <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_uploads.png" alt="" class="nav-icon" />
                <span style="position: relative; left: 2px;">Uploads ({uploadCount})</span>
              </a>
              <a
                href="/settings"
                class="mobile-nav-link"
                onclick={() => (isMobileMenuOpen = false)}
              >
                <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_settings.png" alt="" class="nav-icon" style="position: relative; left: -2px;" />
                <span style="position: relative; left: -2px;">Settings</span>
              </a>
              <button
                class="mobile-nav-link w-full text-left"
                style="border: none; background: transparent;"
                onclick={() => { isMobileMenuOpen = false; handleLogout(); }}
              >
                <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_logout.png" alt="" class="nav-icon" style="position: relative; top: -1px; left: -1px;" />
                Logout
              </button>
              <a
                href="/upload"
                class="mobile-nav-link-accent"
                onclick={() => (isMobileMenuOpen = false)}
              >
                <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_upload.png" alt="" class="nav-icon" style="position: relative; top: -2px; left: -1px;" />
                <span style="position: relative; left: 2px;">Upload Sprite</span>
              </a>
            </div>
          {:else}
            <div class="pb-4 mb-4 border-b" style="border-color: rgba(255,255,255,0.1);">
              <a
                href="/login"
                class="mobile-nav-link-accent"
                onclick={() => (isMobileMenuOpen = false)}
              >
                Login / Register
              </a>
            </div>
          {/if}

          <!-- Navigation -->
          <div class="mb-4">
            <div class="mobile-nav-section-title">Navigation</div>
            <a href="/" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}><img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_news.png" alt="" class="nav-icon" style="position: relative; top: -1px;" />News</a>
            <a href="/sprites" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}><img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_sprites.png" alt="" class="nav-icon" style="position: relative; top: -1px;" />Sprites</a>
          </div>

          <!-- Community -->
          <div class="mb-4">
            <div class="mobile-nav-section-title">Community</div>
            <a href="/sprite-sheet-guidelines" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}><img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_guidelines.png" alt="" class="nav-icon" style="position: relative; top: -1px;" />Sprite Sheet Guidelines</a>
            <a href="/upload-guide" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}><img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_guidelines.png" alt="" class="nav-icon" style="position: relative; top: -1px;" />Upload Guide</a>
          </div>

          <!-- Archive -->
          <div class="mb-4">
            <div class="mobile-nav-section-title">Archive</div>
            <a href="/smackjeeves" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}><img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_smackjeeves.png" alt="" class="nav-icon" />Smack Jeeves</a>
            <a href="/smackjeevesarchivetriage" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}><img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_smackjeeves.png" alt="" class="nav-icon" />Archive Triage</a>
            <a href="/smackjeevesarchivetriage/leaderboard" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}><img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_smackjeeves.png" alt="" class="nav-icon" />Archive Leaderboard</a>
            <a href="http://old.sgxp.me" target="_blank" rel="noopener noreferrer" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}>
              <img src="https://cdn.sgxp.me/img/nav_icons/nav_icon_oldsite.png" alt="" class="nav-icon" />
              Old Site
              <svg class="w-3 h-3 ml-1 inline-block opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <!-- Themes -->
          <div class="pt-4 border-t" style="border-color: rgba(255,255,255,0.1);">
            <div class="mobile-nav-section-title">Theme</div>
            <div>
              {#each themes as theme (theme.value)}
                <button
                  onclick={() => { handleThemeChange(theme.value); isMobileMenuOpen = false; }}
                  class="mobile-nav-link w-full text-left"
                  class:active={selectedTheme === theme.value}
                  style="border: none; background: transparent;"
                >
                  <img src={theme.icon} alt="" class="nav-icon" />
                  {toTitleCase(theme.label)}
                </button>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </Sheet.Content>
  </Sheet.Root>
</div>

<style>
  /* NavigationMenu.Link's base classes include `flex flex-col`, which stacks
     our icon above the label instead of beside it - force row direction. */
  :global([data-slot="navigation-menu-link"]) {
    flex-direction: row !important;
  }

  :global(.page-loading-spinner) {
    display: inline-block;
    /* Reserve a fixed box up front (own font, native/unscaled size) so
       toggling visibility never changes the layout around it. */
    width: 1em;
    text-align: center;
    font-family: monospace;
    visibility: hidden;
  }

  :global(.page-loading-spinner--visible) {
    visibility: visible;
  }

  /* Chrome (Windows) drops text in an animating/scaled layer from LCD to grayscale
     anti-aliasing, which visibly blurs this pixel font. The shared shadcn dropdown
     content opens/closes with a fade + zoom (zoom-in-95/zoom-out-95): pin the zoom to
     1 so it's a plain fade and the text is never rendered at a fractional scale. */
  :global([data-slot="navigation-menu-content"]) {
    --tw-enter-scale: 1 !important;
    --tw-exit-scale: 1 !important;
  }

  /* The shared link primitive has `transition-all`, which kept dropdown items animating
     (and blurred, per above) after hover/unhover. Their hover colors are set instantly by
     the onmouseenter/onmouseleave handlers anyway, so the transition added nothing. */
  :global([data-slot="navigation-menu-content"] [data-slot="navigation-menu-link"]) {
    transition: none !important;
  }

  /* Dropdown carets, drawn in the pixel font (derived from its '>' glyph - see
     scripts/generate-pixel-font-atlas.py) instead of the shared trigger's Lucide chevron.
     That chevron spun 180deg on open; a pixel caret can't rotate without being resampled
     (blurry mid-turn), so it swaps between the down and up glyphs on the trigger's
     data-state instead. */
  :global(nav [data-slot="navigation-menu-trigger"] > svg) {
    display: none;
  }

  :global(.nav-caret) {
    position: relative;
    top: 0; /* 1px above .nav-top-label's nudge - sits a pixel higher than the label baseline */
    margin-left: 6px;
    display: inline-flex;
  }

  :global(.nav-caret > .pixel-text:last-child),
  :global([data-state="open"] > .nav-caret > .pixel-text:first-child) {
    display: none;
  }

  :global([data-state="open"] > .nav-caret > .pixel-text:last-child) {
    display: inline-block;
  }

  /* Top-level nav labels: BN6FontTinyExt-fixed.ttf (see global.css) renders identically in
     Chrome and Firefox, but its balanced metrics center the text 1px higher than the old
     font did in these fixed-height (h-12) buttons. Each button centers its icon and its
     text separately, so this nudges only the text back down - the icons were already right. */
  :global(.nav-top-label) {
    position: relative;
    top: 1px;
    /* Size exactly to the PixelText box, so it's centered on a whole pixel - as a plain
       inline span its height came from the font's line-height and landed on a fractional
       y, which makes the label images resample (soften) on high-DPI screens. */
    display: inline-flex;
  }

  :global(.nav-icon) {
    display: inline-block;
    width: auto;
    height: auto;
    max-width: none;
    margin-right: 6px;
    vertical-align: middle;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  /* Ensure desktop navbar is completely hidden on mobile */
  nav {
    display: none !important;
  }

  @media (min-width: 1200px) {
    nav {
      display: flex !important;
    }
  }

  /* Hide the Sheet's built-in close button (absolute positioned X in top-right) */
  :global(.mobile-sheet-content > button:last-of-type),
  :global(.mobile-sheet-content > button[class*="absolute"]),
  :global(.mobile-sheet-content > button[class*="right-4"]) {
    display: none !important;
  }

  /* Mobile navigation styles - clean, modern look */
  :global(.mobile-nav-link) {
    display: block;
    padding: 8px 10px;
    border-radius: 6px;
    color: var(--font-color) !important;
    font-family: saira !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    transition: background-color 0.15s ease;
    cursor: pointer;
    text-shadow: none;
  }
  :global(.mobile-nav-link:hover),
  :global(.mobile-nav-link:active) {
    background-color: rgba(255,255,255,0.1) !important;
  }

  :global(.mobile-nav-link.active) {
    background-color: rgba(255,255,255,0.15) !important;
  }

  :global(.mobile-nav-link-accent) {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    border-radius: 6px;
    color: var(--font-color) !important;
    font-family: saira !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    background-color: rgba(255,255,255,0.1);
    transition: background-color 0.15s ease;
    margin-top: 8px;
  }
  :global(.mobile-nav-link-accent:hover),
  :global(.mobile-nav-link-accent:active) {
    background-color: rgba(255,255,255,0.15) !important;
  }

  :global(.mobile-nav-section-title) {
    padding: 0 10px 6px;
    color: var(--font-color);
    font-family: saira;
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.5;
  }
</style>