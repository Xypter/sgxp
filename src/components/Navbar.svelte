<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils';
  
  // Corrected shadcn-svelte component imports
  import * as NavigationMenu from '../components/ui/navigation-menu/index.js';
  import * as DropdownMenu from '../components/ui/dropdown-menu/index.js';
  import * as Sheet from '../components/ui/sheet/index.js';
  import { Button } from '../components/ui/button/index.js';

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

  // Constants that don't need to be reactive
  const themes: { value: ThemeValue; label: string }[] = [
    { value: 'ark', label: 'SPACE COLONY ARK' },
    { value: 'snow', label: 'CHRISTMAS' },
    { value: 'cozy', label: 'FIRESIDE' },
    { value: 'sbn', label: 'BATTLE NETWORK' },
    { value: 'style_v7', label: 'DOOMSDAY ZONE' },
    { value: 'hpz', label: 'HIDDEN PALACE ZONE' },
    { value: 'mfz', label: 'MFZ' },
    { value: 'ssz', label: 'SKY SANCTUARY ZONE' }
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
  };
});
</script>

<!-- Desktop navbar - completely hidden on mobile -->
<nav
  class="sticky top-0 items-center justify-between border-b z-50"
  style="
    background-color: var(--page-color);
    border-bottom-color: color-mix(in srgb, var(--page-color) 80%, white);
    color: var(--font-color);
  "
>
  <div class="hidden md:flex items-center justify-between w-full">
    <div class="flex items-center ml-4 space-x-4">
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

      <NavigationMenu.Root>
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
              News
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
              Sprites
            </NavigationMenu.Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                class={cn(
                  "group inline-flex h-12 w-max items-center justify-center rounded-md px-4 font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 no-theme-styles"
                )}
                style="
                  padding-bottom: 1px;
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
                Community
              </DropdownMenu.Trigger>
              <DropdownMenu.Content
                class="no-theme-styles w-[200px]"
                align="start"
                alignOffset={0}
                sideOffset={8}
                avoidCollisions={true}
                style="
                  background-color: var(--page-color);
                  border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                  z-index: 50;
                "
              >
                <DropdownMenu.Item
                  class="cursor-pointer focus:outline-none no-theme-styles"
                  style="
                    background-color: color-mix(in srgb, var(--page-color) 99%, black);
                    padding-bottom: 10px;
                    color: var(--font-color);
                    font-family: nav;
                    font-size: 16px;
                    line-height: 12px;
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
                  onclick={() => (window.location.href = '/sprite-sheet-guidelines')}
                >
                  Sprite Sheet Guidelines
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  class="cursor-pointer focus:outline-none no-theme-styles"
                  style="
                    background-color: color-mix(in srgb, var(--page-color) 99%, black);
                    padding-bottom: 10px;
                    color: var(--font-color);
                    font-family: nav;
                    font-size: 16px;
                    line-height: 12px;
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
                  onclick={() => (window.location.href = '/upload-guide')}
                >
                  Upload Guide
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </NavigationMenu.Item>

          <NavigationMenu.Item>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                class={cn(
                  "group inline-flex h-12 w-max items-center justify-center rounded-md px-4 font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 no-theme-styles"
                )}
                style="
                  padding-bottom: 1px;
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
                Archive
              </DropdownMenu.Trigger>
              <DropdownMenu.Content
                class="no-theme-styles w-[150px]"
                align="start"
                alignOffset={0}
                sideOffset={8}
                avoidCollisions={true}
                style="
                  background-color: var(--page-color);
                  border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                  z-index: 50;
                "
              >
                <DropdownMenu.Item
                  class="cursor-pointer focus:outline-none no-theme-styles"
                  style="
                    background-color: color-mix(in srgb, var(--page-color) 99%, black);
                    padding-bottom: 10px;
                    color: var(--font-color);
                    font-family: nav;
                    font-size: 16px;
                    line-height: 12px;
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
                  onclick={() => (window.location.href = '/smackjeeves')}
                >
                  Smack Jeeves
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
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
              Old Site
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>
    </div>

    <div class="flex items-center">
      {#if isLoggedIn && user}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            class={cn(
              "group inline-flex h-12 w-max items-center justify-center px-4 font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 no-theme-styles"
            )}
            style="
              padding-bottom: 2px;
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
              src="https://cdn.sgxp.me/img/sonic_login_icon.svg"
              alt="User"
              class=""
              style="
                background-color: transparent;
                padding-top: 4px;
                margin-right: 8px;
              "
            />
            {getUserDisplayName(user)}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            class="no-theme-styles w-[150px]"
            align="end"
            sideOffset={8}
            avoidCollisions={true}
            style="
              background-color: var(--page-color);
              border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              z-index: 50;
            "
          >
            <DropdownMenu.Item
              class="cursor-pointer focus:outline-none no-theme-styles"
              style="
                padding-bottom: 10px;
                color: var(--font-color);
                font-family: nav;
                font-size: 16px;
                line-height: 12px;
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
              onclick={() => (window.location.href = '/profile')}
            >
              Profile
            </DropdownMenu.Item>
            <DropdownMenu.Item
              class="cursor-pointer focus:outline-none no-theme-styles"
              style="
                padding-bottom: 10px;
                color: var(--font-color);
                font-family: nav;
                font-size: 16px;
                line-height: 12px;
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
              onclick={() => (window.location.href = '/profile/uploads')}
            >
              Uploads ({uploadCount})
            </DropdownMenu.Item>
            <!-- Temporarily commented out for debugging -->
            <!-- <DropdownMenu.Item
              class="cursor-pointer focus:outline-none no-theme-styles"
              style="
                padding-bottom: 10px;
                color: var(--font-color);
                font-family: nav;
                font-size: 16px;
                line-height: 12px;
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
              onclick={() => (window.location.href = '/messages')}
            >
              Messages {#if unreadMessageCount > 0}({unreadMessageCount}){/if}
            </DropdownMenu.Item> -->
            <DropdownMenu.Item
              class="cursor-pointer focus:outline-none no-theme-styles"
              style="
                padding-bottom: 10px;
                color: var(--font-color);
                font-family: nav;
                font-size: 16px;
                line-height: 12px;
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
              onclick={() => (window.location.href = '/settings')}
            >
              Settings
            </DropdownMenu.Item>
            <DropdownMenu.Separator style="border-color: color-mix(in srgb, var(--page-color) 80%, white);" />
            <DropdownMenu.Item
              class="cursor-pointer focus:outline-none no-theme-styles"
              style="
                padding-bottom: 10px;
                color: var(--font-color);
                font-family: nav;
                font-size: 16px;
                line-height: 12px;
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
              Logout
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
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
          onclick={() => {
            window.location.href = '/upload';
          }}
        >
          Upload
        </Button>
      {:else}
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
          onclick={() => {
            window.location.href = '/login';
          }}
        >
          <img
            src="https://cdn.sgxp.me/img/sonic_login_icon.svg"
            alt="Login"
            class=""
            style="
              padding-top: 2px;
            "
          />
          Login
        </Button>
      {/if}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class={cn(
            "group inline-flex h-12 w-max items-center justify-center px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 no-theme-styles"
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
          {themes.find(theme => theme.value === selectedTheme)?.label || 'DOOMSDAY ZONE'}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          class="no-theme-styles w-[150px]"
          align="end"
          alignOffset={8}
          sideOffset={8}
          avoidCollisions={true}
          style="
            background-color: var(--page-color);
            border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            z-index: 50;
          "
        >
          {#each themes as theme (theme.value)}
            <DropdownMenu.Item
              onclick={() => handleThemeChange(theme.value)}
              class={cn(
                "cursor-pointer focus:outline-none no-theme-styles",
                selectedTheme === theme.value && "bg-black/30"
              )}
              style="
                padding-bottom: 10px;
                color: var(--font-color);
                font-family: nav;
                font-size: 16px;
                line-height: 12px;
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
              {theme.label}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </div>

</nav>

<!-- Mobile: Floating hamburger button only - completely separate from navbar -->
<div class="md:hidden fixed top-3 right-3 z-50">
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
      class="no-theme-styles w-[280px] max-w-[80vw] p-0 overflow-hidden mobile-sheet-content"
      style="
        background-color: var(--page-color);
        border-left: 1px solid rgba(255,255,255,0.15);
      "
    >
      <!-- Header with close button -->
      <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color: rgba(255,255,255,0.15);">
        <a
          href="/"
          class="no-theme-styles"
          style="
            color: var(--font-color);
            font-family: spritelogo;
            font-size: 24px;
            text-shadow: 
            -2px -2px 0 var(--bg-color), 
            0px -2px 0 var(--bg-color), 
            2px -2px 0 var(--bg-color), 
            2px 0px 0 var(--bg-color), 
            2px 2px 0 var(--bg-color), 
            0px 2px 0 var(--bg-color), 
            -2px 2px 0 var(--bg-color), 
            -2px 0px 0 var(--bg-color)
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
                <span style="color: var(--font-color); font-family: saira; font-size: 20px; font-weight: 900;">
                  {getUserDisplayName(user)}
                </span>
              </div>
              <a
                href="/profile"
                class="mobile-nav-link"
                onclick={() => (isMobileMenuOpen = false)}
              >
                Profile
              </a>
              <a
                href="/profile/uploads"
                class="mobile-nav-link"
                onclick={() => (isMobileMenuOpen = false)}
              >
                Uploads ({uploadCount})
              </a>
              <a
                href="/settings"
                class="mobile-nav-link"
                onclick={() => (isMobileMenuOpen = false)}
              >
                Settings
              </a>
              <button
                class="mobile-nav-link w-full text-left"
                style="border: none; background: transparent;"
                onclick={() => { isMobileMenuOpen = false; handleLogout(); }}
              >
                Logout
              </button>
              <a
                href="/upload"
                class="mobile-nav-link-accent"
                onclick={() => (isMobileMenuOpen = false)}
              >
                Upload Sprite
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
            <a href="/" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}>News</a>
            <a href="/sprites" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}>Sprites</a>
          </div>

          <!-- Community -->
          <div class="mb-4">
            <div class="mobile-nav-section-title">Community</div>
            <a href="/sprite-sheet-guidelines" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}>Sprite Sheet Guidelines</a>
            <a href="/upload-guide" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}>Upload Guide</a>
          </div>

          <!-- Archive -->
          <div class="mb-4">
            <div class="mobile-nav-section-title">Archive</div>
            <a href="/smackjeeves" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}>Smack Jeeves</a>
            <a href="http://old.sgxp.me" target="_blank" rel="noopener noreferrer" class="mobile-nav-link" onclick={() => (isMobileMenuOpen = false)}>
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
                  {theme.label}
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
  /* Ensure desktop navbar is completely hidden on mobile */
  nav {
    display: none !important;
  }

  @media (min-width: 768px) {
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
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.5;
  }
</style>