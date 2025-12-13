<script lang="ts">
  interface ReportDialogProps {
    open: boolean;
    title?: string;
    themed?: boolean;
    onCancel?: () => void;
    onReport?: (reason: string, details: string) => void;
    class?: string;
  }

  let {
    open = $bindable(false),
    title = 'Report Comment',
    themed = false,
    onCancel,
    onReport,
    class: className
  }: ReportDialogProps = $props();

  let selectedReason = $state('spam');
  let reportDetails = $state('');

  const reportReasons = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'misinformation', label: 'Misinformation' },
    { value: 'other', label: 'Other' }
  ];

  function handleCancel() {
    open = false;
    // Reset form
    selectedReason = 'spam';
    reportDetails = '';
    if (onCancel) {
      onCancel();
    }
  }

  function handleReport() {
    if (onReport) {
      onReport(selectedReason, reportDetails.trim());
    }
    open = false;
    // Reset form
    selectedReason = 'spam';
    reportDetails = '';
  }

  function handleBackdropClick() {
    handleCancel();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      handleCancel();
    }
  }

  // Prevent body scroll when dialog is open
  $effect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="report-dialog-overlay"
    class:themed-report={themed}
    role="dialog"
    aria-modal="true"
    aria-labelledby="report-title"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === 'Enter' && handleBackdropClick()}
    tabindex="-1"
  >
    <div
      class="report-dialog-content {className || ''}"
      class:themed
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <div class="report-dialog-header">
        <h2 id="report-title" class="report-dialog-title" class:themed>
          {title}
        </h2>
        <p class="report-dialog-description" class:themed>
          Please select a reason for reporting this comment and provide any additional details.
        </p>
      </div>

      <form class="report-dialog-form" onsubmit={(e) => { e.preventDefault(); handleReport(); }}>
        <div class="form-group">
          <label class="form-label" class:themed for="report-reason">Reason</label>
          <div class="radio-group">
            {#each reportReasons as reason}
              <label class="radio-label" class:themed>
                <input
                  type="radio"
                  name="report-reason"
                  value={reason.value}
                  bind:group={selectedReason}
                  class="radio-input"
                />
                <span class="radio-text" class:themed>{reason.label}</span>
              </label>
            {/each}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" class:themed for="report-details">
            Additional details (optional)
          </label>
          <textarea
            id="report-details"
            bind:value={reportDetails}
            class="form-textarea"
            class:themed
            rows="3"
            placeholder="Provide any additional context..."
          ></textarea>
        </div>

        <div class="report-dialog-footer">
          <button
            type="button"
            class="report-dialog-button cancel"
            class:themed
            onclick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="report-dialog-button submit"
            class:themed
          >
            Submit Report
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .report-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: fadeIn 0.2s ease-out;
  }

  .report-dialog-content {
    max-width: 500px;
    width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    background: white;
    border-radius: 8px;
    padding: 0;
    animation: slideUp 0.3s ease-out;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }

  .report-dialog-content.themed {
    background: var(--page-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 60%, white);
    border-radius: 0px;
    box-shadow: var(--box-shadow);
  }

  .report-dialog-header {
    padding: 24px 24px 16px;
  }

  .report-dialog-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px;
    color: #1a1a1a;
  }

  .report-dialog-title.themed {
    font-family: 'saira', monospace;
    font-weight: 700;
    font-size: 20px;
    color: var(--font-color);
  }

  .report-dialog-description {
    font-size: 14px;
    margin: 0;
    color: #666;
    line-height: 1.5;
  }

  .report-dialog-description.themed {
    font-family: 'saira', monospace;
    color: var(--font-color);
    opacity: 0.8;
  }

  .report-dialog-form {
    padding: 0 24px 24px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
    color: #333;
  }

  .form-label.themed {
    font-family: 'saira', monospace;
    color: var(--font-color);
    font-weight: 600;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .radio-label:hover {
    background-color: #f5f5f5;
  }

  .radio-label.themed:hover {
    background-color: color-mix(in srgb, var(--page-color) 90%, var(--font-color));
  }

  .radio-input {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .radio-text {
    font-size: 14px;
    color: #333;
  }

  .radio-text.themed {
    font-family: 'saira', monospace;
    color: var(--font-color);
  }

  .form-textarea {
    width: 100%;
    padding: 8px 12px;
    font-size: 14px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
    font-family: inherit;
    transition: border-color 0.2s;
  }

  .form-textarea:focus {
    outline: none;
    border-color: #0066cc;
  }

  .form-textarea.themed {
    background: var(--page-color);
    color: var(--font-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 60%, white);
    border-radius: 0px;
    font-family: 'saira', monospace;
  }

  .form-textarea.themed:focus {
    border-color: var(--font-link-color);
  }

  .report-dialog-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
  }

  .report-dialog-button {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    border: 1px solid #ddd;
    background: white;
    color: #333;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .report-dialog-button:hover {
    border-color: var(--font-link-color);
    transition: all 0.2s ease;
  }

  .report-dialog-button.cancel {
    background: transparent;
  }

  .report-dialog-button.submit {
    background: #dc2626;
    color: white;
    border-color: #dc2626;
  }

  .report-dialog-button.submit:hover {
    background: #b91c1c;
  }

  /* Themed button styles */
  .report-dialog-button.themed {
    background: var(--page-color);
    color: var(--font-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 60%, white);
    border-radius: 0px;
    font-family: 'saira', monospace;
    font-weight: 700;
    font-size: 14px;
    transition: all var(--transition-speed, 200ms) ease-in-out;
    cursor: url('/img/Sonic_Cursor.png'), pointer;
    box-shadow: var(--box-shadow);
  }

  .report-dialog-button.themed:hover {
    background: color-mix(in srgb, var(--page-color) 90%, var(--font-color));
    cursor: url('/img/Sonic_Cursor_Spin.gif'), progress;
    border-color: var(--font-link-color);
    transition: all 0.2s ease;
  }

  .report-dialog-button.submit.themed {
    background: var(--page-color);
    color: var(--font-color);
    border-color: color-mix(in srgb, var(--page-color) 60%, white);
  }

  .report-dialog-button.submit.themed:hover {
    background: color-mix(in srgb, var(--page-color) 90%, var(--font-color));
    cursor: url('/img/Sonic_Cursor_Spin.gif'), progress;
    border-color: var(--font-link-color);
    transition: all 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
