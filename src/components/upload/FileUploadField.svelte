<script lang="ts">
  import { Upload, X, Image as ImageIcon } from 'lucide-svelte';

  interface FileUploadFieldProps {
    name: string;
    label: string;
    accept?: string;
    required?: boolean;
    value?: File | null;
    error?: string;
    helperText?: string;
    themed?: boolean;
    class?: string;
    existingImageUrl?: string | null;
    maxSize?: number; // in bytes
    maxWidth?: number; // in pixels
    maxHeight?: number; // in pixels
    onFileChange?: (file: File | null) => void;
  }

  let {
    name,
    label,
    accept = 'image/png,image/gif',
    required = false,
    value = $bindable(null),
    error,
    helperText,
    themed = false,
    class: className,
    existingImageUrl = null,
    maxSize,
    maxWidth,
    maxHeight,
    onFileChange
  }: FileUploadFieldProps = $props();

  let isDragging = $state(false);
  let previewUrl = $state<string | null>(null);
  let fileInput: HTMLInputElement;

  // Generate preview URL when file changes
  $effect(() => {
    if (value) {
      const url = URL.createObjectURL(value);
      previewUrl = url;
      return () => URL.revokeObjectURL(url);
    } else {
      previewUrl = null;
    }
  });

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (await validateFile(file)) {
        value = file;
        onFileChange?.(file);
      }
    }
  }

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (await validateFile(file)) {
        value = file;
        onFileChange?.(file);
      } else {
        // Clear the input if validation fails
        input.value = '';
      }
    }
  }

  async function validateFile(file: File): Promise<boolean> {
    // Check file type
    const acceptedTypes = accept.split(',').map(t => t.trim());
    if (!acceptedTypes.includes(file.type)) {
      alert(`Invalid file type. Please upload: ${accept}`);
      return false;
    }

    // Check file size
    if (maxSize && file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`File size (${fileSizeMB}MB) exceeds maximum allowed size of ${maxSizeMB}MB`);
      return false;
    }

    // Check image dimensions
    if ((maxWidth || maxHeight) && file.type.startsWith('image/')) {
      try {
        const dimensions = await getImageDimensions(file);

        // If both maxWidth and maxHeight are set, require exact dimensions
        if (maxWidth && maxHeight) {
          if (dimensions.width !== maxWidth || dimensions.height !== maxHeight) {
            alert(`Image must be exactly ${maxWidth}x${maxHeight}px. Current image is ${dimensions.width}x${dimensions.height}px.`);
            return false;
          }
        } else {
          // If only one dimension is set, check maximum
          if (maxWidth && dimensions.width > maxWidth) {
            alert(`Image width (${dimensions.width}px) exceeds maximum allowed width of ${maxWidth}px`);
            return false;
          }

          if (maxHeight && dimensions.height > maxHeight) {
            alert(`Image height (${dimensions.height}px) exceeds maximum allowed height of ${maxHeight}px`);
            return false;
          }
        }
      } catch (error) {
        console.error('Failed to load image:', error);
        alert('Failed to validate image dimensions');
        return false;
      }
    }

    return true;
  }

  function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  function removeFile() {
    value = null;
    previewUrl = null;
    if (fileInput) {
      fileInput.value = '';
    }
    onFileChange?.(null);
  }

  function triggerFileSelect() {
    fileInput?.click();
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<div class="file-upload-wrapper {className || ''}" class:themed>
  <label for={name} class="theme-label">
    {label}
    {#if required}<span class="required-asterisk">*</span>{/if}
  </label>

  <input
    type="file"
    id={name}
    {name}
    {accept}
    {required}
    bind:this={fileInput}
    onchange={handleFileSelect}
    class="file-input-hidden"
  />

  {#if value && previewUrl}
    <!-- New file preview -->
    <div class="file-preview">
      <div class="preview-image-container">
        <img src={previewUrl} alt="Preview" class="preview-image" />
      </div>
      <div class="file-info">
        <span class="file-name">{value.name}</span>
        <span class="file-size">{formatFileSize(value.size)}</span>
      </div>
      <button
        type="button"
        class="remove-file-btn"
        onclick={removeFile}
        title="Remove file"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  {:else if existingImageUrl}
    <!-- Existing image preview -->
    <div
      class="file-preview existing"
      role="button"
      tabindex="0"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onclick={triggerFileSelect}
      onkeydown={(e) => e.key === 'Enter' && triggerFileSelect()}
    >
      <div class="preview-image-container">
        <img src={existingImageUrl} alt="Current file preview" class="preview-image" />
      </div>
      <div class="file-info">
        <span class="file-name">Current Image</span>
        <span class="file-size">Click or drag to replace</span>
      </div>
      <button
        type="button"
        class="replace-file-btn"
        onclick={triggerFileSelect}
        title="Replace image"
      >
        <Upload class="h-4 w-4" />
      </button>
    </div>
  {:else}
    <div
      class="drop-zone"
      class:dragging={isDragging}
      role="button"
      tabindex="0"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onclick={triggerFileSelect}
      onkeydown={(e) => e.key === 'Enter' && triggerFileSelect()}
    >
      <div class="drop-zone-content">
        <div class="drop-zone-icon">
          {#if isDragging}
            <Upload class="h-8 w-8" />
          {:else}
            <ImageIcon class="h-8 w-8" />
          {/if}
        </div>
        <div class="drop-zone-text">
          {#if isDragging}
            <span class="drop-text">Drop your file here</span>
          {:else}
            <span class="drop-text">Drag & drop or click to upload</span>
            <span class="drop-hint">PNG or GIF only</span>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if error}
    <span class="field-error">{error}</span>
  {:else if helperText}
    <span class="field-helper">{helperText}</span>
  {/if}
</div>

<style>
  .file-upload-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 100%;
    min-width: 0;
  }

  .theme-label {
    display: block;
    font-family: 'saira', monospace;
    font-weight: 700;
    font-size: 14px;
    color: var(--font-color);
    margin-bottom: 4px;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
  }

  .required-asterisk {
    color: #ef4444;
    margin-left: 2px;
  }

  .file-input-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  .drop-zone {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 150px;
    padding: 24px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: 2px dashed color-mix(in srgb, var(--page-color) 80%, white);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .drop-zone:hover {
    border-color: var(--font-link-color);
    background: color-mix(in srgb, var(--page-color) 50%, black);
  }

  .drop-zone.dragging {
    border-color: var(--font-link-color);
    background: color-mix(in srgb, var(--font-link-color) 10%, transparent);
  }

  .drop-zone:focus {
    outline: none;
    border-color: var(--font-link-color);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--font-link-color) 20%, transparent);
  }

  .drop-zone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }

  .drop-zone-icon {
    color: var(--font-link-color);
    opacity: 0.8;
  }

  .drop-zone-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .drop-text {
    font-family: 'saira', monospace;
    font-weight: 600;
    font-size: 14px;
    color: var(--font-color);
  }

  .drop-hint {
    font-family: 'saira', monospace;
    font-size: 12px;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
  }

  .file-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
    max-width: 100%;
    min-width: 0;
  }

  .preview-image-container {
    flex-shrink: 0;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--page-color) 40%, black);
    border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
    overflow: hidden;
  }

  .preview-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .file-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .file-name {
    font-family: 'saira', monospace;
    font-weight: 600;
    font-size: 14px;
    color: var(--font-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    font-family: 'saira', monospace;
    font-size: 12px;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
  }

  .remove-file-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: color-mix(in srgb, #ef4444 20%, transparent);
    border: 1px solid #ef4444;
    color: #ef4444;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .remove-file-btn:hover {
    background: #ef4444;
    color: white;
  }

  .replace-file-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: color-mix(in srgb, var(--font-link-color) 20%, transparent);
    border: 1px solid var(--font-link-color);
    color: var(--font-link-color);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .replace-file-btn:hover {
    background: var(--font-link-color);
    color: white;
  }

  .file-preview.existing {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .file-preview.existing:hover {
    background: color-mix(in srgb, var(--page-color) 50%, black);
    border-color: var(--font-link-color);
  }

  .file-preview.existing:focus {
    outline: none;
    border-color: var(--font-link-color);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--font-link-color) 20%, transparent);
  }

  .field-error {
    font-size: 12px;
    color: #ef4444;
    margin-top: 4px;
  }

  .field-helper {
    font-size: 12px;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    margin-top: 4px;
  }
</style>
