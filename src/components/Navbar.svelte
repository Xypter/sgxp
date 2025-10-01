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

    console.log('Auth check response:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Auth data:', data);
      const userData = data.user || data;
      user = userData;
      isLoggedIn = true;
    } else {
      user = null;
      isLoggedIn = false;
    }
  } catch (error) {
    console.error('Error checking authentication status:', error);
    user = null;
    isLoggedIn = false;
  } finally {
    isCheckingAuth = false;
  }
}

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
  const handleVisibilityChange = (): void => {
    if (!document.hidden) {
      checkAuthStatus();
    }
  };

  const handleUserLogin = () => {
    checkAuthStatus(); // Re-check auth status when login event fires
  };

  const handleUserLogout = () => {
    user = null;
    isLoggedIn = false;
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('userLogin', handleUserLogin);
  window.addEventListener('userLogout', handleUserLogout);

  checkAuthStatus();

  // Cleanup event listeners
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('userLogin', handleUserLogin);
    window.removeEventListener('userLogout', handleUserLogout);
  };
});
</script>

<nav
  class="sticky top-0 flex items-center justify-between border-b z-50"
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
        SGXP
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

  <div class="flex md:hidden items-center justify-between w-full mx-4 ">
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
      onclick={() => (window.location.href = '/')}
      role="button"
      tabindex="0"
      onkeydown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          window.location.href = '/';
        }
      }}
    >
      SGXP
    </div>

    <Sheet.Root bind:open={isMobileMenuOpen}>
      <Sheet.Trigger
        class="no-theme-styles p-2"
        style="
          color: var(--font-color);
          background-color: transparent;
          border: none;
        "
      >
        <svg
          class="w-6 h-6"
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
        class="no-theme-styles w-[300px] p-0"
        style="
          background-color: var(--page-color);
          border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
          color: var(--font-color);
        "
      >
        <div class="flex flex-col p-6 space-y-4">
          {#if isLoggedIn && user}
            <div class="pb-4 border-b" style="border-color: color-mix(in srgb, var(--page-color) 80%, white);">
              <div class="mb-3 flex items-center" style="color: var(--font-color); font-family: nav; font-size: 16px;">
                <img
                  src="https://cdn.sgxp.me/img/sonic_login_icon.svg"
                  alt="User"
                  class="mr-2"
                  style="
                    padding-top: 2px;
                  "
                />
                {getUserDisplayName(user)}
              </div>
              <a
                href="/profile"
                class="block no-theme-styles py-2 px-4 rounded-md transition-colors"
                style="
                  color: var(--font-color);
                  font-family: nav;
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
                onclick={() => (isMobileMenuOpen = false)}
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
                Profile
              </a>
              <a
                href="/settings"
                class="block no-theme-styles py-2 px-4 rounded-md transition-colors"
                style="
                  color: var(--font-color);
                  font-family: nav;
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
                onclick={() => (isMobileMenuOpen = false)}
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
                Settings
              </a>
              <button
                class="block w-full text-left no-theme-styles py-2 px-4 rounded-md transition-colors"
                style="
                  color: var(--font-color);
                  background-color: transparent;
                  border: none;
                  font-family: nav;
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
                onclick={() => {
                  isMobileMenuOpen = false;
                  handleLogout();
                }}
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
                Logout
              </button>
            </div>
          {:else}
            <Button
              variant="ghost"
              class={cn(
                "h-12 px-4 font-medium no-theme-styles w-full justify-start"
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
                isMobileMenuOpen = false;
                window.location.href = '/login';
              }}
            >
              <img
                src="https://cdn.sgxp.me/img/sonic_login_icon.svg"
                alt="Login"
                class="mr-2"
                style="
                  padding-top: 2px;
                "
              />
              Login
            </Button>
          {/if}
          <a
            href="/"
            class="block no-theme-styles py-2 px-4 rounded-md transition-colors"
            style="
              color: var(--font-color);
              font-family: nav;
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
            onclick={() => (isMobileMenuOpen = false)}
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
            News
          </a>
          <a
            href="/sprites"
            class="block no-theme-styles py-2 px-4 rounded-md transition-colors"
            style="
              color: var(--font-color);
              font-family: nav;
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
            onclick={() => (isMobileMenuOpen = false)}
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
            Sprites
          </a>
          <a
            href="/smackjeeves"
            class="block no-theme-styles py-2 px-4 rounded-md transition-colors"
            style="
              color: var(--font-color);
              font-family: nav;
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
            onclick={() => (isMobileMenuOpen = false)}
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
            Smack Jeeves Archive
          </a>
          <a
            href="http://old.sgxp.me"
            class="block no-theme-styles py-2 px-4 rounded-md transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            style="
              color: var(--font-color);
              font-family: nav;
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
            onclick={() => (isMobileMenuOpen = false)}
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
            Old Site
          </a>
          <div class="pt-4 border-t" style="border-color: color-mix(in srgb, var(--page-color) 80%, white);">
            {#each themes as theme (theme.value)}
              <Button
                onclick={() => {
                  handleThemeChange(theme.value);
                  isMobileMenuOpen = false;
                }}
                class={cn(
                  "cursor-pointer focus:outline-none no-theme-styles w-full justify-start py-2",
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
              </Button>
            {/each}
          </div>
        </div>
      </Sheet.Content>
    </Sheet.Root>
  </div>
</nav>