/**
 * Sprite Viewer Utility Functions
 *
 * Pure utility functions extracted from SpriteViewer.svelte
 * for better code organization and reusability.
 */

/**
 * Format bytes to human-readable string
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted string (e.g., "2.5 MB")
 */
export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format date to relative time string
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time (e.g., "2 days ago")
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get display name from user object
 * @param {Object|string|null} author - User object, string, or null
 * @returns {string} Display name or fallback
 */
export function getDisplayName(author) {
  if (!author) return 'Unknown User';
  if (typeof author === 'string') return author;
  return author.displayName || author.username || author.name || 'Unknown User';
}

/**
 * Get username from user object
 * @param {Object|string|null} author - User object, string, or null
 * @returns {string|null} Username with @ prefix or null
 */
export function getUsername(author) {
  if (!author) return null;
  if (typeof author === 'string') return null;
  return author.username ? `@${author.username}` : null;
}

/**
 * Get profile picture URL from user object
 * @param {Object|string|null} author - User object, string, or null
 * @returns {string|null} Profile picture URL or null
 */
export function getProfilePicture(author) {
  if (!author) return null;
  if (typeof author === 'string') return null;
  return author.profilePicture?.url || null;
}

/**
 * Render markdown-like text formatting to HTML
 * Converts:
 * - **text** to <strong>text</strong>
 * - *text* to <em>text</em>
 * - __text__ to <u>text</u>
 *
 * @param {string} text - Text with markdown-like syntax
 * @returns {string} HTML string
 */
export function renderCommentText(text) {
  if (!text) return '';

  // Convert **text** to <strong>text</strong>
  let rendered = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Convert *text* to <em>text</em>
  rendered = rendered.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Convert __text__ to <u>text</u>
  rendered = rendered.replace(/__(.*?)__/g, '<u>$1</u>');

  return rendered;
}

/**
 * Apply text formatting to textarea selection
 * Supports bold (**), italic (*), and underline (__) formatting
 *
 * @param {HTMLTextAreaElement} textarea - Textarea element
 * @param {('bold'|'italic'|'underline')} formatType - Type of formatting to apply
 * @returns {Object} Object with newValue and newCursorPos
 */
export function applyFormatting(textarea, formatType) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  let formattedText = '';
  let cursorOffset = 0;

  switch(formatType) {
    case 'bold':
      formattedText = `**${selectedText}**`;
      cursorOffset = 2;
      break;
    case 'italic':
      formattedText = `*${selectedText}*`;
      cursorOffset = 1;
      break;
    case 'underline':
      formattedText = `__${selectedText}__`;
      cursorOffset = 2;
      break;
    default:
      console.warn(`Unknown format type: ${formatType}`);
      return {
        newValue: textarea.value,
        newCursorPos: end
      };
  }

  const newValue = textarea.value.substring(0, start) +
                   formattedText +
                   textarea.value.substring(end);

  return {
    newValue,
    newCursorPos: selectedText ? end + cursorOffset * 2 : start + cursorOffset
  };
}

