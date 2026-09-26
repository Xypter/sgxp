<script lang="ts">
  import { Button, ButtonGroup, Input } from '$lib/components';
  import {
    ArrowRight, BookOpen, Bookmark, ChevronLeft, ChevronRight, LayoutGrid, Pencil, Save, Search,
    SlidersHorizontal, Table, Trash2, Upload, X, ZoomIn, ZoomOut, ChevronDown, Heart,
  } from 'lucide-svelte';
  import { sgxpButtonClass } from '$components/ui/button';
  import * as Tabs from '$components/ui/tabs';

  // Live demo state
  let view = $state<'cards' | 'table'>('cards');
  let bookmarked = $state(false);
  let showTable = $state(false);
  let page = $state(2);
  let saving = $state(false);
  let expanded = $state(false);
  let liked = $state(false);

  function fakeSave() {
    saving = true;
    setTimeout(() => (saving = false), 1800);
  }

  const variants = [
    {
      name: 'primary',
      title: 'Primary',
      use: 'The main action on a screen. Always has an icon describing the action.',
      code: `<Button variant="primary" icon={BookOpen}>Read comic</Button>`,
    },
    {
      name: 'secondary',
      title: 'Secondary',
      use: 'Supporting actions next to a primary one, or when nothing on the screen is the main action.',
      code: `<Button variant="secondary" icon={Pencil}>Edit Profile</Button>`,
    },
    {
      name: 'danger',
      title: 'Danger',
      use: 'Deletes or removes something. Same shape and press as primary and secondary, in red.',
      code: `<Button variant="danger" icon={Trash2}>Delete</Button>`,
    },
  ] as const;
</script>

<div class="ref">
  <header class="ref-head">
    <p class="ref-eyebrow">Dev only · not linked from the site</p>
    <h1>Button standard</h1>
    <p class="ref-lede">
      Every button uses <code>&lt;Button&gt;</code> from <code>$lib/components</code> with one of these variants.
      Styles live in <code>src/styles/buttons.css</code>. Hover and press the live buttons to see their states,
      and switch themes from the navbar - every variant is built from the theme's own colors.
    </p>
  </header>

  <!-- Height check: buttons must line up with the search box next to them. -->
  <section class="ref-section">
    <h2>Height: one control height</h2>
    <p class="ref-note">
      <code>--control-height</code>: 42px on desktop and phones (the phone value is its own setting,
      <code>--control-height-touch</code>, if that ever changes). Search boxes use the same token, so a toolbar
      lines up exactly.
    </p>
    <div class="ref-row ref-toolbar">
      <Input placeholder="Search by title, author, or notes..." themed class="ref-search" />
      <Button variant="primary" icon={SlidersHorizontal}>Filter & Sort</Button>
      <Button variant="secondary" icon={X}>Clear Filters</Button>
      <Button variant="tool" size="icon" icon={Bookmark} aria-label="My bookmarks" />
    </div>
  </section>

  {#each variants as v (v.name)}
    <section class="ref-section">
      <h2>{v.title}</h2>
      <p class="ref-note">{v.use}</p>
      <div class="ref-grid">
        <div class="ref-cell">
          <span class="ref-label">Default</span>
          {#if v.name === 'primary'}
            <Button variant="primary" icon={BookOpen}>Read comic</Button>
          {:else if v.name === 'secondary'}
            <Button variant="secondary" icon={Pencil}>Edit Profile</Button>
          {:else}
            <Button variant="danger" icon={Trash2}>Delete</Button>
          {/if}
        </div>
        <div class="ref-cell">
          <span class="ref-label">Loading (click)</span>
          <Button variant={v.name} icon={Save} loading={saving} onclick={fakeSave}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
        <div class="ref-cell">
          <span class="ref-label">Disabled</span>
          <Button variant={v.name} icon={Upload} disabled>Upload</Button>
        </div>
        <div class="ref-cell">
          <span class="ref-label">As a link</span>
          <Button variant={v.name} icon={ArrowRight} href="#top">Go somewhere</Button>
        </div>
        <div class="ref-cell">
          <span class="ref-label">Icon only</span>
          <Button variant={v.name} size="icon" icon={v.name === 'danger' ? Trash2 : Pencil} aria-label="Edit" />
        </div>
        <div class="ref-cell ref-cell--wide">
          <span class="ref-label">Full width (phones)</span>
          <Button variant={v.name} icon={BookOpen} class="w-full">Start reading</Button>
        </div>
      </div>
      <pre class="ref-code"><code>{v.code}</code></pre>
    </section>
  {/each}

  <section class="ref-section">
    <h2>Toggle</h2>
    <p class="ref-note">
      Anything with an on/off or selected state. Set <code>aria-pressed</code> (or <code>data-state="on"</code>);
      the selected one fills with the accent. Group side-by-side toggles with <code>ButtonGroup</code>.
      Tabs use it too: <code>sgxpButtonClass(&#123; variant: 'toggle' &#125;)</code> on each <code>Tabs.Trigger</code>
      (the active one is <code>data-state="active"</code>) and <code>sgxp-btn-group</code> on the <code>Tabs.List</code>.
    </p>
    <div class="ref-grid">
      <div class="ref-cell ref-cell--wide">
        <span class="ref-label">Group (Cards / Table)</span>
        <ButtonGroup label="View as">
          <Button variant="toggle" icon={LayoutGrid} aria-pressed={view === 'cards'} onclick={() => (view = 'cards')}>Cards</Button>
          <Button variant="toggle" icon={Table} aria-pressed={view === 'table'} onclick={() => (view = 'table')}>Table</Button>
        </ButtonGroup>
      </div>
      <div class="ref-cell ref-cell--wide">
        <span class="ref-label">Pagination (secondary; current page in the accent)</span>
        <div class="ref-row">
          <Button variant="secondary" size="icon" icon={ChevronLeft} aria-label="Previous page" disabled={page === 1} onclick={() => page--} />
          {#each [1, 2, 3, 4] as n}
            <Button variant="secondary" size="icon" aria-current={page === n ? 'page' : undefined} onclick={() => (page = n)}>{n}</Button>
          {/each}
          <Button variant="secondary" size="icon" icon={ChevronRight} aria-label="Next page" disabled={page === 4} onclick={() => page++} />
        </div>
      </div>
      <div class="ref-cell ref-cell--wide">
        <span class="ref-label">Tabs (Login / Register)</span>
        <Tabs.Root value="login">
          <Tabs.List class="sgxp-btn-group">
            <Tabs.Trigger value="login" class={sgxpButtonClass({ variant: 'toggle' })}>Login</Tabs.Trigger>
            <Tabs.Trigger value="register" class={sgxpButtonClass({ variant: 'toggle' })}>Register</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      </div>
      <div class="ref-cell">
        <span class="ref-label">Mini (24px)</span>
        <Button variant="toggle" size="mini" icon={Table} aria-pressed={showTable} onclick={() => (showTable = !showTable)}>Table</Button>
      </div>
      <div class="ref-cell">
        <span class="ref-label">Disabled</span>
        <Button variant="toggle" icon={Table} disabled>Table</Button>
      </div>
    </div>
    <pre class="ref-code"><code>{`<ButtonGroup label="View as">
  <Button variant="toggle" icon={LayoutGrid} aria-pressed={view === 'cards'}>Cards</Button>
  <Button variant="toggle" icon={Table} aria-pressed={view === 'table'}>Table</Button>
</ButtonGroup>

<Button variant="toggle" size="mini" aria-pressed={showTable}>Table</Button>

<Tabs.List class="sgxp-btn-group">
  <Tabs.Trigger value="login" class={sgxpButtonClass({ variant: 'toggle' })}>Login</Tabs.Trigger>
  <Tabs.Trigger value="register" class={sgxpButtonClass({ variant: 'toggle' })}>Register</Tabs.Trigger>
</Tabs.List>`}</code></pre>
  </section>

  <section class="ref-section">
    <h2>Icon buttons</h2>
    <p class="ref-note">
      Their own category. <strong>tool</strong> is boxed with the block shadow and press (for tool rows like
      the reader's zoom and back buttons); <strong>subtle</strong> has no box and stays faint until used (for
      icons inside content). Two-state icons like the bookmark fill in when on and go back to an outline when
      off - set <code>aria-pressed</code>. Both need an <code>aria-label</code>.
    </p>
    <div class="ref-grid">
      <div class="ref-cell ref-cell--wide">
        <span class="ref-label">Tool</span>
        <div class="ref-row">
          <Button variant="tool" size="icon" icon={ZoomOut} aria-label="Zoom out" />
          <Button variant="tool" size="icon" icon={ZoomIn} aria-label="Zoom in" />
          <Button variant="tool" size="icon" icon={Bookmark} aria-label="Bookmark" aria-pressed={bookmarked} onclick={() => (bookmarked = !bookmarked)} />
          <Button variant="tool" icon={ChevronLeft}>With a label</Button>
        </div>
      </div>
      <div class="ref-cell ref-cell--wide">
        <span class="ref-label">Subtle</span>
        <div class="ref-row">
          <Button variant="subtle" size="icon" icon={Bookmark} aria-label="Bookmark this comic" aria-pressed={bookmarked} onclick={() => (bookmarked = !bookmarked)} />
          <Button variant="subtle" size="icon" icon={Search} aria-label="Search" />
          <Button variant="subtle" size="icon-mini" icon={X} aria-label="Remove" />
        </div>
      </div>
    </div>
    <pre class="ref-code"><code>{`<Button variant="tool" size="icon" icon={ZoomIn} aria-label="Zoom in" />
<Button variant="subtle" size="icon" icon={Bookmark} aria-label="Bookmark this comic" aria-pressed={bookmarked} />`}</code></pre>
  </section>

  <section class="ref-section">
    <h2>Quiet (provisional)</h2>
    <p class="ref-note">
      Low-emphasis text action, like the "About this archive" toggle. You marked this one as the least settled -
      it's here to revisit with real scenarios. The italic suffix is <code>sgxp-btn-hint</code>. On an accordion,
      put <code>sgxpButtonClass(&#123; variant: 'quiet' &#125;)</code> on the <code>Accordion.Trigger</code> (its own
      chevron follows the text colour).
    </p>
    <div class="ref-row">
      <Button variant="quiet" icon={ChevronDown} onclick={() => (expanded = !expanded)} aria-expanded={expanded}>
        About this archive <span class="sgxp-btn-hint">({expanded ? 'Collapse' : 'Expand'})</span>
      </Button>
    </div>
    <pre class="ref-code"><code>{`<Button variant="quiet" icon={ChevronDown}>About this archive <span class="sgxp-btn-hint">(Expand)</span></Button>

<Accordion.Trigger class={sgxpButtonClass({ variant: 'quiet' })}>
  About this archive <span class="sgxp-btn-hint">(Expand)</span>
</Accordion.Trigger>`}</code></pre>
  </section>

  <section class="ref-section">
    <h2>Pieces and options</h2>
    <p class="ref-note">
      Everything a button needs lives in the standard, so a change there reaches every button in the category.
      If a page needs a look that isn't here, add it to <code>buttons.css</code> as an option like these - never
      as page-level CSS.
    </p>
    <div class="ref-grid">
      <div class="ref-cell">
        <span class="ref-label">Count</span>
        <Button variant="toggle" icon={Heart} data-icon-fill="true" aria-pressed={liked} onclick={() => (liked = !liked)}>
          <span class="sgxp-btn-count">{liked ? 13 : 12}</span>
        </Button>
      </div>
      <div class="ref-cell">
        <span class="ref-label">Badge</span>
        <Button variant="primary" icon={SlidersHorizontal}>Filter & Sort <span class="sgxp-btn-badge">3</span></Button>
      </div>
      <div class="ref-cell">
        <span class="ref-label">Corner badge</span>
        <Button variant="tool" size="icon" icon={SlidersHorizontal} aria-label="Filter & sort (3 active)">
          <span class="sgxp-btn-badge sgxp-btn-badge--corner">3</span>
        </Button>
      </div>
      <div class="ref-cell">
        <span class="ref-label">Plain icon</span>
        <Button variant="secondary" icon={ChevronLeft} data-icon="plain">Prev</Button>
      </div>
      <div class="ref-cell">
        <span class="ref-label">Static (not clickable)</span>
        <div class={sgxpButtonClass({ variant: 'secondary', size: 'icon', static: true })}>7</div>
      </div>
    </div>
    <pre class="ref-code"><code>{`<span class="sgxp-btn-count">12</span>          count beside an icon
<span class="sgxp-btn-badge">3</span>           pill after a label (+ sgxp-btn-badge--corner to pin it)
data-icon="plain"                               icon in the text colour, bold (arrows)
data-icon-fill="true" | "false"                 fill the icon when on: opt in (labelled) / out (line icons)
sgxpButtonClass({ variant, size, static: true }) a box that matches a button but isn't one`}</code></pre>
  </section>

  <section class="ref-section">
    <h2>Rules</h2>
    <ul class="ref-rules">
      <li>Always <code>&lt;Button&gt;</code> from <code>$lib/components</code> with a standard <code>variant</code> - no new custom button CSS.</li>
      <li>Primary buttons always get an <code>icon</code> that describes the action.</li>
      <li>Don't set heights: the size (<code>default</code>, <code>mini</code>, <code>icon</code>, <code>icon-mini</code>) does it, matched to inputs.</li>
      <li>Use <code>loading</code> for anything that waits on the server - it disables the button and shows the site spinner.</li>
      <li>Icon-only buttons need an <code>aria-label</code>.</li>
      <li>Navbar items are the exception and keep their own look.</li>
    </ul>
  </section>
</div>

<style>
  .ref {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 16px 80px;
    color: var(--font-color);
    font-family: 'saira', sans-serif;
  }

  .ref-head {
    background: var(--page-color);
    border: var(--border-width, 1px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 70%, white);
    box-shadow: var(--box-shadow);
    padding: 20px 24px;
    margin-bottom: 24px;
  }

  .ref-eyebrow {
    margin: 0 0 4px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--font-link-color);
  }

  h1 {
    margin: 0 0 8px;
    font-size: 28px;
    font-weight: 800;
  }

  .ref-lede,
  .ref-note {
    margin: 0;
    max-width: 75ch;
    line-height: 1.5;
    opacity: 0.85;
  }

  .ref-section {
    background: var(--page-color);
    border: var(--border-width, 1px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 70%, white);
    box-shadow: var(--box-shadow);
    padding: 20px 24px 24px;
    margin-bottom: 24px;
    display: grid;
    gap: 14px;
  }

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
  }

  code {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 0.9em;
  }

  .ref-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px 24px;
    align-items: start;
  }

  .ref-cell {
    display: grid;
    gap: 8px;
    justify-items: start;
    /* Room for the 7px block shadow. */
    padding: 0 8px 8px 0;
  }

  .ref-cell--wide {
    grid-column: span 2;
  }

  .ref-cell--wide :global(.w-full) {
    width: 100%;
  }

  .ref-label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.6;
  }

  .ref-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding-bottom: 8px;
  }

  .ref-toolbar :global(.ref-search) {
    flex: 1 1 260px;
    min-width: 0;
    height: var(--control-height) !important;
  }

  .ref-code {
    margin: 0;
    padding: 10px 12px;
    overflow-x: auto;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
    font-size: 13px;
    line-height: 1.5;
  }

  .ref-rules {
    margin: 0;
    padding-left: 20px;
    display: grid;
    gap: 6px;
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .ref-cell--wide {
      grid-column: 1 / -1;
    }

    .ref-section {
      padding: 16px;
    }
  }
</style>
