<script lang="ts">
  import * as Select from '$components/ui/select';

  type ThemeValue = 'ark' | 'snow' | 'cozy' | 'sbn' | 'style_v7' | 'hpz' | 'mfz' | 'ssz';

  interface ThemeSwitcherProps {
    initialTheme?: ThemeValue;
    baseURL?: string;
    onThemeChange?: (theme: ThemeValue) => void;
    class?: string;
  }

  let {
    initialTheme = 'ark',
    baseURL = '',
    onThemeChange,
    class: className
  }: ThemeSwitcherProps = $props();

  let selectedTheme = $state<ThemeValue>(initialTheme);

  const themes: { value: ThemeValue; label: string }[] = [
    { value: 'ark', label: 'ARK ATTACK' },
    { value: 'snow', label: 'SNOWBALL ZONE' },
    { value: 'cozy', label: 'COZY CASTLE' },
    { value: 'sbn', label: 'SBN' },
    { value: 'style_v7', label: 'STYLE V7' },
    { value: 'hpz', label: 'HPZ' },
    { value: 'mfz', label: 'MFZ' },
    { value: 'ssz', label: 'SSZ' }
  ];

  const selectedLabel = $derived(
    themes.find(theme => theme.value === selectedTheme)?.label || 'ARK ATTACK'
  );

  async function handleThemeChange(theme: ThemeValue): Promise<void> {
    selectedTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    // Call optional callback
    if (onThemeChange) {
      onThemeChange(theme);
    }

    // Save to server if baseURL is provided
    if (baseURL) {
      try {
        await fetch(`${baseURL}/api/set-theme`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ theme }),
        });
      } catch (error) {
        console.error('Error saving theme to cookie:', error);
      }
    }
  }

  // Watch for theme changes
  $effect(() => {
    if (selectedTheme !== initialTheme) {
      handleThemeChange(selectedTheme);
    }
  });
</script>

<Select.Root type="single" name="theme" bind:value={selectedTheme}>
  <Select.Trigger class="no-theme-styles {className || ''}">
    {selectedLabel}
  </Select.Trigger>
  <Select.Content class="no-theme-styles">
    {#each themes as theme (theme.value)}
      <Select.Item
        value={theme.value}
        label={theme.label}
        class="cursor-pointer focus:outline-none no-theme-styles"
      >
        {theme.label}
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
