<script lang="ts">
  import * as Card from '../lib/components/ui/base/Card.svelte';
  import * as Alert from '../lib/components/ui/base/Alert.svelte';
  import Separator from '../lib/components/ui/base/Separator.svelte';
  import Badge from '../lib/components/ui/base/Badge.svelte';
  import PageHeader from '../lib/components/ui/layout/PageHeader.svelte';
</script>

<div class="guidelines-wrapper">
  <PageHeader
    title="Sprite Upload Guidelines"
    description="Please read these guidelines carefully before uploading sprites to SGXP"
    themed={true}
  />

  <!-- Introduction Alert -->
  <Alert.Root class="theme-alert theme-alert-info">
    <Alert.Title class="theme-alert-title">Welcome to SGXP!</Alert.Title>
    <Alert.Description class="theme-alert-description">
      SGXP is a community-driven sprite archive. By following these guidelines, you help maintain the quality and organization of our collection. Thank you for contributing!
    </Alert.Description>
  </Alert.Root>

  <!-- What You Can Upload -->
  <div class="sprite-content-title">What You Can Upload</div>
  <div class="sprite-content-box">
    <ul class="content-list">
      <li>
        <Badge themed={true} color="#10b981">Sprite Sheets</Badge>
        <span>Character sprites, tilesets, UI elements, and other game assets</span>
      </li>
      <li>
        <Badge themed={true} color="#3b82f6">Sprite Comics</Badge>
        <span>Comics created using sprites from games or custom sprites</span>
      </li>
      <li>
        <Badge themed={true} color="#8b5cf6">WIP Art</Badge>
        <span>Work-in-progress sprite art and animations</span>
      </li>
      <li>
        <Badge themed={true} color="#f59e0b">Custom Sprites</Badge>
        <span>Original sprite artwork in various styles</span>
      </li>
      <li>
        <Badge themed={true} color="#ec4899">Edits & Recolors</Badge>
        <span>Modified or recolored sprites (with proper attribution)</span>
      </li>
    </ul>
  </div>

  <Separator themed={true} class="my-8" />

  <!-- What's Not Allowed -->
  <div class="sprite-content-title">What's Not Allowed</div>
  <div class="sprite-content-box">
    <ul class="prohibited-list">
      <li>Non-sprite artwork (photos, 3D renders, high-res paintings)</li>
      <li>Copyrighted material without proper attribution or fair use</li>
      <li>Offensive, hateful, or inappropriate content</li>
      <li>Spam or duplicate uploads</li>
      <li>Malicious files or executables</li>
    </ul>
  </div>

  <Separator themed={true} class="my-8" />

  <!-- File Requirements -->
  <div class="sprite-content-title">Technical Specifications</div>
  <div class="sprite-content-box">
    <div class="requirements-grid">
      <div class="requirement-item">
        <h4 class="requirement-label">File Formats</h4>
        <p class="requirement-value">PNG, GIF (preferred for sprites)</p>
        <p class="requirement-note">JPG accepted but not recommended due to compression artifacts</p>
      </div>

      <div class="requirement-item">
        <h4 class="requirement-label">File Size</h4>
        <p class="requirement-value">Maximum 10MB per file</p>
        <p class="requirement-note">Larger files may fail to upload</p>
      </div>

      <div class="requirement-item">
        <h4 class="requirement-label">Dimensions</h4>
        <p class="requirement-value">No strict limits</p>
        <p class="requirement-note">Recommend under 4000x4000px for performance</p>
      </div>

      <div class="requirement-item">
        <h4 class="requirement-label">Transparency</h4>
        <p class="requirement-value">PNG supports transparency</p>
        <p class="requirement-note">Use PNG for sprites with transparent backgrounds</p>
      </div>
    </div>
  </div>

  <Separator themed={true} class="my-8" />

  <!-- Optimization Tip -->
  <Alert.Root class="theme-alert theme-alert-warning">
    <Alert.Title class="theme-alert-title">Tip: Optimize Your Sprites</Alert.Title>
    <Alert.Description class="theme-alert-description">
      Use tools like TinyPNG or ImageOptim to reduce file sizes without losing quality. Smaller files load faster and provide a better experience for everyone!
    </Alert.Description>
  </Alert.Root>

  <!-- Naming Best Practices -->
  <div class="sprite-content-title">Naming & Organization</div>
  <div class="sprite-content-box">
    <div class="best-practices">
      <div class="practice-item">
        <div class="practice-icon">📝</div>
        <div class="practice-content">
          <h4>Descriptive Titles</h4>
          <p>Use clear, descriptive titles like "Mario Running Animation" instead of "sprite01.png"</p>
          <div class="practice-examples">
            <span class="good-example">Good: "Sonic the Hedgehog - Full Sprite Sheet"</span>
            <span class="bad-example">Bad: "untitled-final-v2.png"</span>
          </div>
        </div>
      </div>

      <div class="practice-item">
        <div class="practice-icon">🏷️</div>
        <div class="practice-content">
          <h4>Credit Appropriate Contributors</h4>
          <p>Add relevant contributors to give proper credit to other authors as well as make your sprites discoverable.</p>
          <div class="practice-examples">
            <span class="tag-example"><Badge themed={true}>Cylent Nite</Badge> <Badge themed={true}>Xeric</Badge> <Badge themed={true}>Shinbs</Badge></span>
          </div>
        </div>
      </div>

      <div class="practice-item">
        <div class="practice-icon">✍️</div>
        <div class="practice-content">
          <h4>Add Descriptions</h4>
          <p>Include details about the sprite, its use, or any special notes.</p>
        </div>
      </div>

      <div class="practice-item">
        <div class="practice-icon">🎨</div>
        <div class="practice-content">
          <h4>Credit Original Artists</h4>
          <p>If you're uploading edits, recolors, or rips, always credit the original creator or game</p>
        </div>
      </div>
    </div>
  </div>

  <Separator themed={true} class="my-8" />

  <!-- Community Standards -->
  <div class="sprite-content-title">Community Standards</div>
  <div class="sprite-content-box">
    <ul class="community-list">
      <li>
        <strong>Respect Copyright:</strong> Only upload sprites you have the right to share
      </li>
      <li>
        <strong>Give Credit:</strong> Always attribute original creators, games, or sources
      </li>
      <li>
        <strong>Be Original:</strong> Don't re-upload existing sprites without significant changes
      </li>
      <li>
        <strong>Stay On-Topic:</strong> This is a sprite community - keep uploads sprite-related
      </li>
      <li>
        <strong>Be Respectful:</strong> Treat other artists and their work with respect
      </li>
      <li>
        <strong>Report Issues:</strong> If you see rule violations, use the report feature
      </li>
    </ul>
  </div>

  <Separator themed={true} class="my-8" />

  <!-- Violations Alert -->
  <Alert.Root class="theme-alert theme-alert-destructive">
    <Alert.Title class="theme-alert-title">Violations & Consequences</Alert.Title>
    <Alert.Description class="theme-alert-description">
      Repeated violations of these guidelines may result in content removal, upload restrictions, or account suspension. We want to keep SGXP a welcoming place for everyone!
    </Alert.Description>
  </Alert.Root>

  <!-- Quick Reference Checklist -->
  <div class="sprite-content-title">Quick Reference Checklist</div>
  <div class="sprite-content-box">
    <div class="checklist">
      <label class="checklist-item">
        <input type="checkbox" disabled />
        <span>File is PNG or GIF format</span>
      </label>
      <label class="checklist-item">
        <input type="checkbox" disabled />
        <span>File is under 10MB</span>
      </label>
      <label class="checklist-item">
        <input type="checkbox" disabled />
        <span>Title is descriptive and clear</span>
      </label>
      <label class="checklist-item">
        <input type="checkbox" disabled />
        <span>Tags are relevant and helpful</span>
      </label>
      <label class="checklist-item">
        <input type="checkbox" disabled />
        <span>Description provides useful context</span>
      </label>
      <label class="checklist-item">
        <input type="checkbox" disabled />
        <span>Original creator/source is credited</span>
      </label>
      <label class="checklist-item">
        <input type="checkbox" disabled />
        <span>Content follows community guidelines</span>
      </label>
    </div>
  </div>

  <Separator themed={true} class="my-8" />

  <!-- Final Note -->
  <Alert.Root class="theme-alert theme-alert-success">
    <Alert.Title class="theme-alert-title">Ready to Upload!</Alert.Title>
    <Alert.Description class="theme-alert-description">
      If you've read these guidelines and your content meets the requirements, you're ready to share your sprites with the SGXP community. Happy spriting!
    </Alert.Description>
  </Alert.Root>
</div>

<style>
  .guidelines-wrapper {
    font-family: 'saira', monospace;
    color: var(--font-color);
  }

  .sprite-content-title {
    display: block;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    padding: 3px 0px 3px 15px;
    margin-top: 2rem;
    font-family: 'saira';
    font-weight: 800;
    font-size: 24px;
    color: var(--font-color);
    text-shadow:
      calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
      calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    position: relative;
  }

  .guidelines-wrapper :global(.theme-alert) {
    margin-top: 1rem;
  }

  /* Content Lists */
  .content-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .content-list li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    border-radius: 4px;
    background: color-mix(in srgb, var(--page-color) 95%, white);
  }

  .content-list li span {
    flex: 1;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .prohibited-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .prohibited-list li {
    padding-left: 1.5rem;
    position: relative;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .prohibited-list li::before {
    content: "✕";
    position: absolute;
    left: 0;
    color: #ef4444;
    font-weight: bold;
  }

  /* Requirements Grid */
  .requirements-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .requirement-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .requirement-label {
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--font-link-color);
    margin: 0;
  }

  .requirement-value {
    font-weight: 600;
    font-size: 0.875rem;
    margin: 0;
  }

  .requirement-note {
    font-size: 0.75rem;
    opacity: 0.7;
    margin: 0;
  }

  /* Best Practices */
  .best-practices {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .practice-item {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .practice-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .practice-content {
    flex: 1;
  }

  .practice-content h4 {
    margin: 0 0 0.25rem 0;
    font-size: 0.875rem;
    font-weight: 700;
  }

  .practice-content p {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    opacity: 0.9;
    line-height: 1.5;
  }

  .practice-examples {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .good-example {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: color-mix(in srgb, #10b981 20%, transparent);
    border-left: 2px solid #10b981;
    border-radius: 2px;
  }

  .good-example::before {
    content: "✓ ";
    color: #10b981;
    font-weight: bold;
  }

  .bad-example {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: color-mix(in srgb, #ef4444 20%, transparent);
    border-left: 2px solid #ef4444;
    border-radius: 2px;
  }

  .bad-example::before {
    content: "✗ ";
    color: #ef4444;
    font-weight: bold;
  }

  .tag-example {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  /* Community List */
  .community-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .community-list li {
    font-size: 0.875rem;
    line-height: 1.6;
    padding-left: 1.5rem;
    position: relative;
  }

  .community-list li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--font-link-color);
    font-weight: bold;
  }

  /* Checklist */
  .checklist {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .checklist-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: not-allowed;
    font-size: 0.875rem;
  }

  .checklist-item input[type="checkbox"] {
    width: 1.125rem;
    height: 1.125rem;
    cursor: not-allowed;
    accent-color: var(--font-link-color);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .requirements-grid {
      grid-template-columns: 1fr;
    }

    .practice-item {
      flex-direction: column;
      gap: 0.5rem;
    }

    .practice-icon {
      font-size: 1.25rem;
    }
  }
</style>
