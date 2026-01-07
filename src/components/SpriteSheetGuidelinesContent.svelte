<script lang="ts">
  import * as Alert from '../lib/components/ui/base/Alert.svelte';
  import Separator from '../lib/components/ui/base/Separator.svelte';
  import Badge from '../lib/components/ui/base/Badge.svelte';
  import PageHeader from '../lib/components/ui/layout/PageHeader.svelte';
</script>

<div class="guidelines-wrapper">
  <div class="content-box">
    <PageHeader
      title="Sprite Sheet Guidelines"
      themed={true}
    />

  <p>
    We take a more principled approach when it comes to upload rules. In general, sprite sheets should:
  </p>

  <!-- Core Principles -->
  <ol class="requirement-list">
    <li>
      Showcase a high degree of effort by the uploader.
    </li>
    <li>
      Contain a reasonable amount of poses that allows for use in comics, animations or other creative mediums.
    </li>
    <li>
      Be reasonably organized in a way that is easy to use.
    </li>
    <li>
      Be connected to Sonic in style or in theme.
    </li>
  </ol>

  <Separator themed={true} class="my-6" />

  <!-- Acceptable Uploads -->
  <h2>Acceptable Uploads</h2>
  <p class="intro-text">Below is specific guidance on what is acceptable, ordered from most likely to least likely to be accepted:</p>

  <!-- Custom Sprites -->
  <h3>Custom Sprites</h3>
  <Alert.Root class="theme-alert theme-alert-success">
    <Alert.Title class="theme-alert-title">Gold Standard</Alert.Title>
    <Alert.Description class="theme-alert-description">
      Any work that you created completely on your own is most likely to be accepted. We encourage you to submit this above anything else.
    </Alert.Description>
  </Alert.Root>

  <!-- Other Franchises -->
  <h3>Other Franchises Styled Like Sonic</h3>
  <p>
    Works from other franchises created in the style of Sonic games (e.g., a sprite sheet of Mario in the style of Sonic the Hedgehog 3).
    Sprite sheets referencing other franchises must adhere to the styling of a specified Sonic game, with the intent of using these
    in conjunction with other Sonic-styled sprites.
  </p>
  <div class="examples">
    <span class="example-item">Example: Mario characters in Sonic 3 & Knuckles style</span>
    <span class="example-item">Example: Mega Man styled after Sonic Advance</span>
  </div>

  <!-- Expansion Sheets -->
  <h3>Expansion Sheets</h3>
  <p>There are two categories of expansion sheets:</p>

  <div class="expansion-types">
    <div class="expansion-type">
      <Badge themed={true} color="#3b82f6">Type 1</Badge>
      <span>Sprites from official games which include new poses not in the original game</span>
    </div>
    <div class="expansion-type">
      <Badge themed={true} color="#8b5cf6">Type 2</Badge>
      <span>Custom sprite sheets from other creators that have been extensively added to</span>
    </div>
  </div>

  <Alert.Root class="theme-alert theme-alert-warning">
    <Alert.Title class="theme-alert-title">Higher Standards Apply</Alert.Title>
    <Alert.Description class="theme-alert-description">
      For sprites in this category to be accepted, there needs to be significant additions to the original sheet
      that make an effort to create the "definitive" version. The barrier to entry for these types of sheets is
      considerably higher due to their derivative nature. Extensive credits must be provided to ensure all
      contributors' work is properly accounted for. Original authors have the right to takedown expansions of their work upon request.
    </Alert.Description>
  </Alert.Root>

  <h4>Sheet Types Not Accepted For Expansion</h4>
  <ul class="prohibited-list">
    <li>Any Mod Gen related sprites</li>
    <li>Any works by Cylent Nite</li>
  </ul>

  <Separator themed={true} class="my-6" />

  <!-- Not Accepted -->
  <h2>Not Accepted</h2>
  <Alert.Root class="theme-alert theme-alert-destructive">
    <Alert.Title class="theme-alert-title">Prohibited Content</Alert.Title>
    <Alert.Description class="theme-alert-description">
      The following types of content will not be accepted under any circumstances:
    </Alert.Description>
  </Alert.Root>

  <ul class="prohibited-list">
    <li>.Exe related sprites</li>
    <li>Low effort edits or recolors</li>
    <li>NSFW content not suitable for all ages</li>
    <li>Any works that were already submitted to the old MFZ archive</li>
  </ul>

  <Separator themed={true} class="my-6" />

  <!-- Moderation Notice -->
  <Alert.Root class="theme-alert theme-alert-info">
    <Alert.Title class="theme-alert-title">Content Moderation</Alert.Title>
    <Alert.Description class="theme-alert-description">
      Acceptance of sprites into the collection is at the discretion of the content moderation team.
      Team members will do their best to work with submitters if revisions are needed. Please be aware
      that members of the content moderation team work on a volunteer basis, and your submission will
      be reviewed based on the time team members have available to go through the review queue.
    </Alert.Description>
  </Alert.Root>
  </div>
</div>

<style>
  .guidelines-wrapper {
    font-family: 'saira', monospace;
    color: var(--font-color);
    line-height: 1.7;
  }

  .content-box {
    background: var(--page-color);
    padding: 2rem;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
  }

  .guidelines-wrapper h2 {
    font-size: 1.875rem;
    font-weight: 800;
    margin-top: 2rem;
    color: var(--font-color);
  }

  .guidelines-wrapper h2:first-of-type {
    margin-top: 1.5rem;
  }

  .guidelines-wrapper h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: 1.5rem;
    color: var(--font-color);
  }

  .guidelines-wrapper h4 {
    font-size: 1.125rem;
    font-weight: 700;
    margin-top: 1rem;
    color: var(--font-link-color);
  }

  .guidelines-wrapper p {
    font-size: 0.9375rem;
    line-height: 1.7;
    margin-bottom: 0.75rem;
  }

  .intro-text {
    font-style: italic;
    opacity: 0.9;
  }

  .guidelines-wrapper :global(.theme-alert) {
    margin-top: 0.75rem;
    margin-bottom: 0.75rem;
  }

  /* Lists */
  .requirement-list {
    list-style: none;
    padding: 0;
    margin: 0.75rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .requirement-list li {
    font-size: 0.9375rem;
    line-height: 1.7;
    padding-left: 1.5rem;
    position: relative;
  }

  .requirement-list li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--font-link-color);
    font-weight: bold;
  }

  .prohibited-list {
    list-style: none;
    padding: 0;
    margin: 0.75rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .prohibited-list li {
    padding-left: 1.5rem;
    position: relative;
    font-size: 0.9375rem;
    line-height: 1.7;
  }

  .prohibited-list li::before {
    content: "✕";
    position: absolute;
    left: 0;
    color: #ef4444;
    font-weight: bold;
  }

  /* Examples */
  .examples {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0.75rem 0;
  }

  .example-item {
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
    background: color-mix(in srgb, #10b981 15%, transparent);
    border-left: 3px solid #10b981;
    border-radius: 2px;
  }

  .example-item::before {
    content: "✓ ";
    color: #10b981;
    font-weight: bold;
  }

  /* Expansion Types */
  .expansion-types {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0.75rem 0;
  }

  .expansion-type {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 4px;
    background: color-mix(in srgb, var(--page-color) 97%, white);
  }

  .expansion-type span {
    flex: 1;
    font-size: 0.9375rem;
    line-height: 1.6;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .content-box {
      padding: 1rem;
    }

    .guidelines-wrapper h2 {
      font-size: 1.5rem;
    }

    .guidelines-wrapper h3 {
      font-size: 1.25rem;
    }

    .guidelines-wrapper h4 {
      font-size: 1rem;
    }
  }
</style>
