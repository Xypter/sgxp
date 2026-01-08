<script lang="ts">
  import * as Alert from '../lib/components/ui/base/Alert.svelte';
  import Separator from '../lib/components/ui/base/Separator.svelte';
  import Badge from '../lib/components/ui/base/Badge.svelte';
  import PageHeader from '../lib/components/ui/layout/PageHeader.svelte';
  import { FormInput, FormTextarea, FormCheckbox, Button, SelectWithSuggest, MultiSelect } from '$lib/components';
  import { Pencil, MessageSquare, Trash2 } from 'lucide-svelte';

  // Example data for preview components
  const styleSourceTypeOptions = [
    { value: 'team', label: 'Project Team' },
    { value: 'fanGame', label: 'Fan Game' },
    { value: 'officialGame', label: 'Official Game' },
    { value: 'series', label: 'Series' },
    { value: 'custom', label: 'Custom' }
  ];

  const exampleSections = [
    { value: '1', label: 'Official Characters' },
    { value: '2', label: 'Backgrounds' },
    { value: '3', label: 'Objects' }
  ];

  const exampleContributors = [
    { value: '1', label: 'Cylent Nite' },
    { value: '2', label: 'Xeric' },
    { value: '3', label: 'Shinbs' }
  ];

  // Disabled state for preview
  let previewTitle = $state('');
  let previewDescription = $state('');
  let previewStyleSourceType = $state('');
  let previewSection = $state('');
  let previewContributors = $state<string[]>([]);
  let previewContactPermissions = $state(false);
  let previewInformUsed = $state(false);
  let previewCredit = $state(false);
</script>

<div class="guidelines-wrapper">
  <div class="content-box">
    <PageHeader
      title="Upload Guide"
      description="Everything you need to know about uploading your sprites to The SGXP"
      themed={true}
    />

    <!-- Introduction -->
    <Alert.Root class="theme-alert theme-alert-info">
    <Alert.Title class="theme-alert-title">Welcome!</Alert.Title>
    <Alert.Description class="theme-alert-description">
      This guide will walk you through the upload process and help you understand how to manage your submissions.
      Make sure to also check the Sprite Sheet Guidelines for content requirements.
    </Alert.Description>
  </Alert.Root>

  <!-- Your First Upload -->
  <h2>Your First Upload</h2>

  <!-- Basic Information -->
  <h3>Basic Information</h3>

  <div class="preview-section">
    <FormInput
      themed
      label="Sheet Title"
      name="title"
      bind:value={previewTitle}
      placeholder="Enter a descriptive title for your sprite sheet..."
      helperText="Maximum 100 characters"
      disabled
    />
  </div>

  <p>
    This should have a descriptive name that tells people what your sprite sheet is about. Titles are limited
    to 100 characters, so try to use words that encompass the main elements of your sheet. Some examples include:
  </p>

  <div class="examples">
    <span class="example-item">Sonic the Hedgehog 3: Expanded Sheet</span>
    <span class="example-item">Blur the Hedgehog - Official Character Sheet</span>
    <span class="example-item">Sonic Advance Expanded - Green Hill Zone</span>
  </div>


  <div class="preview-section">
    <FormTextarea
      themed
      label="Description"
      name="description"
      bind:value={previewDescription}
      placeholder="Describe your sprite sheet, your process, or any notable features..."
      helperText="Maximum 2048 characters"
      disabled
    />
  </div>

  <p>
    This is where you can describe any part of your project. Include anything you think people will find
    interesting or notable about the sheet.
  </p>

  <!-- Images -->
  <h3>Images</h3>
  <p>
    More details about image guidelines are described in the <a href="/sprite-sheet-guidelines" class="guide-link">Sprite Sheet Guidelines</a> page.
  </p>

  <!-- Style Source Type -->
  <h3>Style Source Type</h3>
  <p>
    Think of style source type as the overarching category for your sprites. There are 5 main categories for this section:
  </p>

  <div class="preview-section">
    <SelectWithSuggest
      themed
      label="Style Source Type"
      name="styleSourceType"
      options={styleSourceTypeOptions}
      bind:value={previewStyleSourceType}
      placeholder="-- Select Style Source Type --"
      helperText="Choose the category that best describes your sprite"
    />
  </div>

  <div class="source-types">
    <div class="source-type">
      <Badge themed={true} color="#10b981">Project Team</Badge>
      <span>Generally includes a team of spriters that created the sheet but were not necessarily part of a fan game project</span>
    </div>
    <div class="source-type">
      <Badge themed={true} color="#3b82f6">Fan Game</Badge>
      <span>Any assets made for a fan game</span>
    </div>
    <div class="source-type">
      <Badge themed={true} color="#8b5cf6">Official Game</Badge>
      <span>Any assets that were originally part of an official game or an expansion of official sprites</span>
    </div>
    <div class="source-type">
      <Badge themed={true} color="#f59e0b">Series</Badge>
      <span>Any assets that are derived from a TV series, movie, or other type of media other than games</span>
    </div>
    <div class="source-type">
      <Badge themed={true} color="#ec4899">Custom</Badge>
      <span>Unique asset created outside the scope of the other categories</span>
    </div>
  </div>

  <Alert.Root class="theme-alert theme-alert-info">
    <Alert.Title class="theme-alert-title">Specific Source Types</Alert.Title>
    <Alert.Description class="theme-alert-description">
      Once a type is selected, you will be given the option to select a more specific source type for your sheet.
      For example, if you selected Fan Game, the more specific category might be Sonic XG or Sonic Time Twisted.
      If you don't see your specific category listed, you have the option to add your own as part of the submission
      by pressing the plus button to the right.
    </Alert.Description>
  </Alert.Root>

  <!-- Section -->
  <h3>Section</h3>
  <p>
    This is the general category of sheet you are posting. This could range from background assets to character sheets.
    If you don't see a section that fits your category of sheet, you have the option to add a new one as part of your submission.
  </p>

  <div class="preview-section">
    <SelectWithSuggest
      themed
      label="Section"
      name="section"
      options={exampleSections}
      bind:value={previewSection}
      placeholder="-- Select Section --"
      helperText="Type of sprite sheet (Characters, Objects, etc.)"
    />
  </div>

  <!-- Contributors and Credits -->
  <h3>Contributors and Additional Credits</h3>
  <p>
    These categories are for people who helped put the sheet together or who need to be credited.
  </p>

  <div class="preview-section">
    <MultiSelect
      themed
      label="Contributors"
      name="contributors"
      options={exampleContributors}
      bind:value={previewContributors}
      placeholder="Select contributors"
      helperText="Select any contributors who worked on this (optional)"
    />
  </div>

  <div class="credit-distinction">
    <div class="distinction-item">
      <strong>Contributors</strong>
      <p>Someone who worked together with the uploader on any part of the project</p>
    </div>
    <div class="distinction-item">
      <strong>Additional Credits</strong>
      <p>Those who did not contribute directly, but whose work was used in the making of the sheet</p>
    </div>
  </div>

  <Alert.Root class="theme-alert theme-alert-info">
    <Alert.Title class="theme-alert-title">Adding New Contributors</Alert.Title>
    <Alert.Description class="theme-alert-description">
      If you don't see a contributor in the list, you have the option to add a new one as part of your submission.
    </Alert.Description>
  </Alert.Root>

  <!-- Terms of Use -->
  <h3>Terms of Use</h3>
  <p>
    This tells people the acceptable way to use your sheet. You can select one, two, all three, or none depending on
    how you want your work to be treated.
  </p>

  <div class="preview-section">
    <div class="terms-preview">
      <FormCheckbox
        themed
        bind:checked={previewContactPermissions}
        label="Contact for Permissions"
        description="Users must contact you before using this sprite"
        disabled
      />

      <FormCheckbox
        themed
        bind:checked={previewInformUsed}
        label="Inform When Used"
        description="Users should inform you when they use this sprite"
        disabled
      />

      <FormCheckbox
        themed
        bind:checked={previewCredit}
        label="Credit Where Used"
        description="Users must credit you when using this sprite"
        disabled
      />
    </div>
  </div>

  <Alert.Root class="theme-alert theme-alert-warning">
    <Alert.Title class="theme-alert-title">Providing Contact Information</Alert.Title>
    <Alert.Description class="theme-alert-description">
      It is advised that if you select either the "Contact for Permissions" or "Inform When Used" categories,
      you provide a social link on your profile that users can use to contact you.
    </Alert.Description>
  </Alert.Root>

    <!-- Submit Button Preview -->
  <h3>Ready to Submit</h3>
  <p>
    Once you've filled out all the required fields, you can submit your sprite sheet for review using the submit button.
  </p>

  <div class="form-actions-preview">
    <Button themed type="submit">Submit Sprite</Button>
    <p class="submit-note-preview">Your sprite will be submitted for review before being published.</p>
  </div>

  <Separator themed={true} class="my-6" />

  <!-- My Uploads Page -->
  <h2>My Uploads Page</h2>

  <!-- Status -->
  <h3>Status</h3>
  <p>
    Once your sheet is submitted, it will be sent to the <a href="/profile/uploads" class="guide-link">My Uploads</a> page
    where it will be given the status of <Badge themed={true} color="#f59e0b">Pending Review</Badge>.
    This is the status of all newly submitted sheets.
  </p>

  <p>
    Once a member of the content moderation team has reviewed your sheet, it will be given one of three statuses:
  </p>

  <div class="status-types">
    <div class="status-type">
      <Badge themed={true} color="#6b7280">Needs Revision</Badge>
      <span>Changes are required before approval</span>
    </div>
    <div class="status-type">
      <Badge themed={true} color="#22c55e">Approved</Badge>
      <span>Your sheet has been accepted into the collection</span>
    </div>
    <div class="status-type">
      <Badge themed={true} color="#ef4444">Rejected</Badge>
      <span>Your sheet does not meet our guidelines</span>
    </div>
  </div>

  <!-- Editing -->
  <h3>Editing</h3>
  <p>
    If your sheet has a Pending Review, Needs Revision, or Approved status, you have the option to make changes
    to your sheet by pressing the Edit button in the Actions column.
  </p>

  <div class="preview-section">
    <p class="preview-label">Actions available on your uploads:</p>
    <div class="actions-preview">
      <Button themed variant="outline" size="sm" disabled>
        <Pencil class="h-4 w-4" />
        Edit
      </Button>
      <Button themed variant="outline" size="sm" disabled>
        <MessageSquare class="h-4 w-4" />
        Feedback
      </Button>
      <Button themed variant="outline" size="sm" disabled>
        <Trash2 class="h-4 w-4" />
        Delete
      </Button>
    </div>
  </div>

  <Alert.Root class="theme-alert theme-alert-warning">
    <Alert.Title class="theme-alert-title">Re-review After Edits</Alert.Title>
    <Alert.Description class="theme-alert-description">
      Regardless of status, including Approved sheets, once you make an edit to a sheet, its status will change
      back to Pending Review for a content team member to approve the changes.
    </Alert.Description>
  </Alert.Root>

  <h4>Version History</h4>
  <p>
    If you swap out the sprite sheet image for a new one, you will be given an additional dialogue to make note
    of the changes you made to the sheet. This acts as a version history to show users all the changes made to
    a sheet. We encourage you to be as descriptive as possible when adding your update comments.
  </p>

  <!-- Feedback -->
  <h3>Feedback</h3>
  <p>
    When sheets are given the status of Needs Revision or Rejected, feedback will be available for you to see
    in the Actions column. This is a communication area where content team members can tell you what items need
    to be changed or reasons why a sheet was rejected.
  </p>

  <h4>Communicating with the Team</h4>
  <p>
    In the case of sheets that need revision, you can comment back for clarifications about specific actions
    requested by a team member or to specify what changes were made after making edits.
  </p>
  <p>
    If a sheet is approved, a feedback history will remain showing the discourse between you and the content
    moderation team member.
  </p>

  <Separator themed={true} class="my-6" />

  <!-- Final Note -->
  <Alert.Root class="theme-alert theme-alert-success">
    <Alert.Title class="theme-alert-title">Ready to Upload!</Alert.Title>
    <Alert.Description class="theme-alert-description">
      Now that you understand the upload process, you're ready to share your sprites with the SGXP community.
      Remember to review the Sprite Sheet Guidelines before submitting. Happy spriting!
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
    color: var(--font-link-color);
  }

  .guidelines-wrapper p {
    font-size: 0.9375rem;
    line-height: 1.7;
  }

  .guide-link {
    color: var(--font-link-color);
    text-decoration: underline;
    font-weight: 600;
  }

  .guide-link:hover {
    opacity: 0.8;
  }

  .guidelines-wrapper :global(.theme-alert) {
    margin-top: 0.75rem;
    margin-bottom: 0.75rem;
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
  }

  .example-item::before {
    content: "✓ ";
    color: #10b981;
    font-weight: bold;
  }

  /* Source Types & Status Types */
  .source-types,
  .status-types {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0.75rem 0;
  }

  .source-type,
  .status-type {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: color-mix(in srgb, var(--page-color) 97%, white);
  }

  .source-type span,
  .status-type span {
    flex: 1;
    font-size: 0.9375rem;
    line-height: 1.6;
  }

  /* Credit Distinction */
  .credit-distinction {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin: 0.75rem 0;
  }

  .distinction-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .distinction-item strong {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--font-link-color);
  }

  .distinction-item p {
    font-size: 0.9375rem;
    margin: 0;
    opacity: 0.9;
    line-height: 1.6;
  }

  /* Preview Sections */
  .preview-section {
    margin: 0.75rem 0;
    padding: 1.5rem;
    background: color-mix(in srgb, var(--page-color) 95%, black);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 85%, white);
  }

  .preview-section :global(input),
  .preview-section :global(textarea),
  .preview-section :global(select),
  .preview-section :global(button) {
    cursor: not-allowed;
  }

  .terms-preview {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-actions-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--gap);
    padding: 24px;
    background: var(--page-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    margin: 0.75rem 0;
  }

  .submit-note-preview {
    font-family: 'saira', monospace;
    font-size: 12px;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    text-align: center;
    margin: 0;
  }

  .preview-label {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    color: var(--font-color);
  }

  .actions-preview {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .actions-preview :global(button) {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .content-box {
      padding: 1rem;
      border: none !important;
      width: 100vw !important;
      margin-left: calc(-50vw + 50%) !important;
      margin-right: calc(-50vw + 50%) !important;
      box-shadow: none !important;
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

    .credit-distinction {
      grid-template-columns: 1fr;
    }

    .preview-section {
      padding: 1rem;
    }
  }
</style>
