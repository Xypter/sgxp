# SGXP Component Library

A comprehensive, theme-integrated component library for the SGXP project built on top of shadcn-svelte.

## Installation

All components are available through a single barrel export:

```svelte
import { Button, Card, FormInput, Modal, UserAvatar } from '$lib/components';
```

## Component Categories

### 1. Base Components (`$lib/components/base`)

Theme-aware wrappers around shadcn-svelte components. All base components accept a `themed` prop to enable custom theme styling.

#### Simple Components

- **Button** - Themed button wrapper
- **Input** - Themed input field
- **Label** - Themed label
- **Badge** - Themed badge
- **Textarea** - Themed textarea

```svelte
<script>
  import { Button, Input, Label } from '$lib/components';
</script>

<!-- Standard shadcn styling -->
<Button variant="default">Click me</Button>

<!-- With custom theme styling -->
<Button themed>Themed Button</Button>
<Input themed placeholder="Enter text..." />
<Label themed>Field Label</Label>
```

#### Compound Components

- **Card** - Multi-part card component (Root, Header, Title, Description, Content, Footer, Action)
- **Avatar** - Avatar component (Root, Image, Fallback)

```svelte
<script>
  import { Card, Avatar } from '$lib/components';
</script>

<!-- Using Card -->
<Card.Root class="theme-card">
  <Card.Header>
    <Card.Title class="theme-card-title">Title</Card.Title>
    <Card.Description class="theme-card-description">Description</Card.Description>
  </Card.Header>
  <Card.Content>
    Content goes here
  </Card.Content>
  <Card.Footer>
    Footer content
  </Card.Footer>
</Card.Root>

<!-- Using Avatar -->
<Avatar.Root class="theme-avatar">
  <Avatar.Image src="/avatar.jpg" alt="User" />
  <Avatar.Fallback class="theme-avatar-fallback">JD</Avatar.Fallback>
</Avatar.Root>
```

### 2. Composed Components (`$lib/components/composed`)

Pre-built combinations of base components with integrated functionality.

#### UserAvatar

A composed avatar component with automatic fallback generation.

**Props:**
- `src?: string | null` - Avatar image URL
- `alt?: string` - Alt text (default: 'User avatar')
- `fallback?: string` - Custom fallback text
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Size preset (default: 'md')
- `themed?: boolean` - Enable theme styling
- `class?: string` - Additional classes

```svelte
<script>
  import { UserAvatar } from '$lib/components';
</script>

<!-- Basic usage -->
<UserAvatar src="/user.jpg" alt="John Doe" />

<!-- With theming and custom size -->
<UserAvatar
  src={user.profilePicture?.url}
  alt={user.displayName}
  size="lg"
  themed
/>

<!-- Automatic fallback from alt text -->
<UserAvatar alt="John Doe" />
<!-- Shows "JD" as fallback -->
```

#### CommentItem

A pre-styled comment display component.

**Props:**
- `author: { name: string; avatar?: string | null; isAdmin?: boolean }` - Author info
- `content: string` - Comment text
- `timestamp: string | Date` - Comment timestamp
- `themed?: boolean` - Enable theme styling
- `class?: string` - Additional classes

```svelte
<script>
  import { CommentItem } from '$lib/components';

  const comment = {
    author: {
      name: 'John Doe',
      avatar: '/avatar.jpg',
      isAdmin: true
    },
    content: 'This is a great sprite!',
    timestamp: new Date()
  };
</script>

<CommentItem {...comment} themed />
```

#### ThemeSwitcher

A theme selector dropdown with automatic persistence.

**Props:**
- `initialTheme?: ThemeValue` - Starting theme (default: 'ark')
- `baseURL?: string` - API base URL for persistence
- `onThemeChange?: (theme: ThemeValue) => void` - Theme change callback
- `class?: string` - Additional classes

**Themes:**
- `ark` - ARK ATTACK
- `snow` - SNOWBALL ZONE
- `cozy` - COZY CASTLE
- `sbn` - SBN
- `style_v7` - STYLE V7
- `hpz` - HPZ
- `mfz` - MFZ
- `ssz` - SSZ

```svelte
<script>
  import { ThemeSwitcher } from '$lib/components';

  function handleThemeChange(theme) {
    console.log('Theme changed to:', theme);
  }
</script>

<ThemeSwitcher
  initialTheme="ark"
  baseURL="https://cms.sgxp.me"
  onThemeChange={handleThemeChange}
  class="w-[150px]"
/>
```

### 3. Layout Components (`$lib/components/layout`)

Reusable layout patterns for consistent page structure.

#### Modal

A modal/dialog overlay component.

**Props:**
- `open: boolean` (bindable) - Modal visibility state
- `onClose?: () => void` - Close callback
- `themed?: boolean` - Enable theme styling
- `class?: string` - Additional classes

```svelte
<script>
  import { Modal, Button } from '$lib/components';

  let showModal = $state(false);
</script>

<Button onclick={() => showModal = true}>Open Modal</Button>

<Modal bind:open={showModal} themed>
  <div class="p-6">
    <h2>Modal Title</h2>
    <p>Modal content goes here</p>
    <Button onclick={() => showModal = false}>Close</Button>
  </div>
</Modal>
```

#### PageHeader

A consistent page header with title, description, and actions.

**Props:**
- `title: string` - Page title
- `description?: string` - Optional description
- `themed?: boolean` - Enable theme styling
- `class?: string` - Additional classes
- Slot for action buttons

```svelte
<script>
  import { PageHeader, Button } from '$lib/components';
</script>

<PageHeader
  title="My Page"
  description="This is a description of the page"
  themed
>
  <Button>Action</Button>
</PageHeader>
```

#### PageSection

A section wrapper with optional title.

**Props:**
- `title?: string` - Section title
- `themed?: boolean` - Enable theme styling
- `class?: string` - Additional classes

```svelte
<script>
  import { PageSection } from '$lib/components';
</script>

<PageSection title="Section Title" themed>
  <p>Section content goes here</p>
</PageSection>
```

### 4. Form Components (`$lib/components/forms`)

Form fields with built-in validation and labels.

#### FormInput

Input field with label, validation, and helper text.

**Props:**
- `label: string` - Field label
- `name: string` - Input name
- `type?: string` - Input type (default: 'text')
- `value?: string` (bindable) - Input value
- `placeholder?: string` - Placeholder text
- `required?: boolean` - Required field
- `disabled?: boolean` - Disabled state
- `error?: string` - Error message
- `helperText?: string` - Helper text
- `themed?: boolean` - Enable theme styling
- `class?: string` - Container classes
- `inputClass?: string` - Input classes
- `onInput?: (value: string) => void` - Input callback
- `onChange?: (value: string) => void` - Change callback

```svelte
<script>
  import { FormInput } from '$lib/components';

  let email = $state('');
  let emailError = $state('');

  function validateEmail(value) {
    if (!value.includes('@')) {
      emailError = 'Please enter a valid email';
    } else {
      emailError = '';
    }
  }
</script>

<FormInput
  label="Email Address"
  name="email"
  type="email"
  bind:value={email}
  required
  error={emailError}
  helperText="We'll never share your email"
  themed
  onInput={validateEmail}
/>
```

#### FormTextarea

Textarea with label, validation, and character count.

**Props:**
- Same as FormInput, plus:
- `rows?: number` - Number of rows (default: 4)
- `maxLength?: number` - Maximum character length
- `textareaClass?: string` - Textarea classes

```svelte
<script>
  import { FormTextarea } from '$lib/components';

  let comment = $state('');
</script>

<FormTextarea
  label="Comment"
  name="comment"
  bind:value={comment}
  maxLength={500}
  helperText="Share your thoughts"
  themed
  rows={6}
/>
```

#### SearchBar

A search input with icon.

**Props:**
- `value?: string` (bindable) - Search value
- `placeholder?: string` - Placeholder text (default: 'Search...')
- `themed?: boolean` - Enable theme styling
- `class?: string` - Additional wrapper classes
- `inputClass?: string` - Additional input element classes
- `onSearch?: (value: string) => void` - Search callback

```svelte
<script>
  import { SearchBar } from '$lib/components';

  let searchTerm = $state('');

  function handleSearch(value) {
    console.log('Searching for:', value);
  }
</script>

<SearchBar
  bind:value={searchTerm}
  placeholder="Search sprites..."
  themed
  onSearch={handleSearch}
/>

<!-- With custom input styling -->
<SearchBar
  bind:value={searchTerm}
  placeholder="Search..."
  inputClass="py-3 border border-border rounded-md"
  onSearch={handleSearch}
/>
```

## Theming

All components support theme integration through the `themed` prop. When enabled, components automatically use CSS custom properties from your theme system:

- `--page-color` - Background color
- `--font-color` - Text color
- `--font-link-color` - Accent color
- `--bg-color` - Shadow color
- `--border-width` - Border width
- `--border-style` - Border style
- `--box-shadow` - Box shadow
- `--transition-speed` - Transition speed

Example themed component:

```svelte
<Button themed>Themed Button</Button>
```

This applies custom styles that integrate with your 8 theme options (ark, snow, cozy, sbn, style_v7, hpz, mfz, ssz).

## Complete Example

```svelte
<script>
  import {
    PageHeader,
    PageSection,
    FormInput,
    FormTextarea,
    Button,
    Card,
    UserAvatar,
    CommentItem,
    Modal,
    ThemeSwitcher
  } from '$lib/components';

  let formData = $state({
    title: '',
    description: ''
  });

  let showModal = $state(false);

  const comments = [
    {
      author: { name: 'User 1', avatar: null, isAdmin: false },
      content: 'Great work!',
      timestamp: new Date()
    }
  ];
</script>

<div class="container">
  <PageHeader
    title="My Page"
    description="Example page using the component library"
    themed
  >
    <ThemeSwitcher initialTheme="ark" class="w-[150px]" />
  </PageHeader>

  <PageSection title="Create Sprite" themed>
    <form class="space-y-4">
      <FormInput
        label="Title"
        name="title"
        bind:value={formData.title}
        required
        themed
      />

      <FormTextarea
        label="Description"
        name="description"
        bind:value={formData.description}
        maxLength={500}
        themed
      />

      <Button themed type="submit">Submit</Button>
    </form>
  </PageSection>

  <PageSection title="Comments" themed>
    <div class="space-y-4">
      {#each comments as comment}
        <CommentItem {...comment} themed />
      {/each}
    </div>
  </PageSection>
</div>

<Modal bind:open={showModal} themed>
  <div class="p-6">
    <h2>Modal Content</h2>
  </div>
</Modal>
```

## Migration Guide

To migrate existing components to use this library:

### Before:
```svelte
<script>
  import { Button } from '../components/ui/button/index.ts';
  import { Input } from '../components/ui/input/index.ts';
  import { Label } from '../components/ui/label/index.ts';
  import * as Card from '../components/ui/card/index.ts';
</script>

<Button class="theme-button">Click me</Button>
<Input class="theme-input" />
<Label class="theme-label">Label</Label>
```

### After:
```svelte
<script>
  import { Button, Input, Label, Card } from '$lib/components';
</script>

<Button themed>Click me</Button>
<Input themed />
<Label themed>Label</Label>
```

## Contributing

When adding new components:

1. Create the component in the appropriate category folder
2. Add export to the category's `index.ts`
3. The main `$lib/components/index.ts` will automatically re-export it
4. Document usage in this README
