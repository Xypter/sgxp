<script lang="ts">
  import { MessageSquare, PenLine } from 'lucide-svelte';
  import {
    archiveAssetUrl,
    formatCommentTime,
    sanitizeArchiveHtml,
    type ArchiveChapter,
  } from '$lib/jeevesArchive';

  interface Props {
    chapter: ArchiveChapter;
    authorName?: string;
  }

  let { chapter, authorName }: Props = $props();

  const comments = $derived(chapter.comments ?? []);
  let failedAvatars = $state(new Set<string>());

  function avatarFailed(key: string) {
    failedAvatars = new Set(failedAvatars).add(key);
  }
</script>

{#if chapter.authorComment?.trim()}
  <section class="jeeves-panel">
    <h3 class="jeeves-panel-title"><PenLine size={18} /> {authorName ? `${authorName}'s Comment` : "Author's Comment"}</h3>
    <div class="jeeves-panel-body rich-text">
      {@html sanitizeArchiveHtml(chapter.authorComment)}
    </div>
  </section>
{/if}

<section class="jeeves-panel">
  <h3 class="jeeves-panel-title"><MessageSquare size={18} /> Comments ({comments.length})</h3>
  {#if comments.length === 0}
    <p class="jeeves-panel-body empty-note">No comments on this page.</p>
  {:else}
    <ol class="comment-list">
      {#each comments as comment, i (i)}
        {@const key = `${i}-${comment.imgPath}`}
        <li class="comment">
          {#if comment.imgPath && !failedAvatars.has(key)}
            <img
              class="archive-avatar"
              src={archiveAssetUrl(comment.imgPath)}
              alt=""
              loading="lazy"
              onerror={() => avatarFailed(key)}
            />
          {:else}
            <div class="archive-avatar archive-avatar--fallback" aria-hidden="true">
              {comment.nickname?.[0]?.toUpperCase() || '?'}
            </div>
          {/if}
          <div class="comment-meta">
            <span class="comment-author">{comment.nickname || 'Anonymous'}</span>
            <span class="comment-date">{formatCommentTime(comment.time)}</span>
          </div>
          <div class="comment-body rich-text">{@html sanitizeArchiveHtml(comment.commentText)}</div>
        </li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  .comment-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* Desktop: avatar in its own column beside the name and text.
     Phones: avatar + name share a row, and the text gets the full width. */
  .comment {
    display: grid;
    grid-template-columns: 125px minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    column-gap: 14px;
    padding: 14px;
    border-top: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 85%, white);
  }

  .comment:first-child {
    border-top: none;
  }

  /* Smack Jeeves avatars were 125x125 (some smaller) - shown at their true
     size, pixel for pixel; only the rare oversized upload is shrunk to fit. */
  .archive-avatar {
    grid-row: 1 / 3;
    width: 125px;
    height: 125px;
    max-width: none;
    object-fit: scale-down;
    image-rendering: pixelated;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    outline: 2px solid color-mix(in srgb, var(--page-color) 75%, white);
  }

  .archive-avatar--fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'saira', sans-serif;
    font-size: 48px;
    font-weight: 800;
    color: var(--font-link-color);
  }

  .comment-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 10px;
    margin-bottom: 4px;
  }

  .comment-author {
    font-weight: 800;
    font-size: 14px;
    color: var(--font-link-color);
    overflow-wrap: anywhere;
  }

  .comment-date {
    font-size: 12px;
    opacity: 0.65;
    font-variant-numeric: tabular-nums;
  }

  .comment-body {
    font-size: 14px;
    line-height: 1.55;
  }

  @media (max-width: 768px) {
    .comment {
      grid-template-rows: auto auto;
      column-gap: 12px;
      padding: 12px;
    }

    .archive-avatar {
      grid-row: 1;
    }

    .comment-meta {
      flex-direction: column;
      align-self: center;
      margin-bottom: 0;
    }

    .comment-body {
      grid-column: 1 / -1;
      margin-top: 10px;
    }
  }
</style>
