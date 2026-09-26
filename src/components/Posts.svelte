<script>
    import { format, parseISO } from "date-fns";
    import { NumberedPagination, Badge } from "$lib/components";
    import { getDisplayName, getUsername } from '$lib/spriteUtils';
    import { fly } from 'svelte/transition';
    import { untrack } from 'svelte';
    import Spinner from './Spinner.svelte';

    // Reactive state using Svelte's new runes API
    let posts = $state([]);
    let currentPage = $state(1);
    let totalPages = $state(0);
    let totalPosts = $state(0); // For Shadcn pagination 'count'
    let loading = $state(true);
    let error = $state(null);
    const postsPerPage = 5;

    // Page-change animation: the current posts stay on screen while the next page is
    // fetched in the background; only once it has arrived do the old posts slide down
    // and fade out, and only once THAT finishes do the new ones slide in from the left.
    // `posts` is what's rendered; a fetched page waits in `pendingPosts` until the
    // outro's onoutroend swaps it in.
    const PAGE_TRANSITION_MS = 200;
    let showPosts = $state(true);
    let pendingPosts = null;
    // No slide on the very first load - the posts just appear, as before.
    let animatePosts = $state(false);
    // Bumped per request so a slower response for a page the user already clicked
    // past (e.g. 2 then 3 in quick succession) is dropped instead of flashing in.
    let latestRequestId = 0;

    function handlePostsOutroEnd() {
        if (pendingPosts) {
            posts = pendingPosts;
            pendingPosts = null;
        }
        showPosts = true;
    }

    // Function to convert Payload rich text to HTML
    function convertRichTextToHTML(richText) {
        if (!richText || !richText.root || !richText.root.children) {
            return '';
        }

        function processNode(node) {
            if (node.type === 'text') {
                let text = node.text || '';
                text = text.replace(/\n/g, '<br>');
                if (node.format & 1) text = `<strong>${text}</strong>`;
                if (node.format & 2) text = `<em>${text}</em>`;
                return text;
            }

            if (node.type === 'paragraph') {
                const content = node.children ? node.children.map(processNode).join('') : '';
                return `<p>${content}</p>`;
            }

            if (node.type === 'link') {
                const content = node.children ? node.children.map(processNode).join('') : '';
                const url = node.fields?.url || '#';
                const target = node.fields?.newTab ? ' target="_blank" rel="noopener"' : '';
                return `<a href="${url}"${target}>${content}</a>`;
            }

            if (node.type === 'upload') {
                const media = node.value;
                if (media && media.url) {
                    const alt = media.alt || media.filename || 'Image';
                    return `<img src="${media.url}" alt="${alt}" style="max-width: 100%; height: auto; margin: 10px 0;">`;
                }
                return '';
            }

            // Handle lists and list items
            if (node.type === 'list') {
                const tag = node.listType === 'ordered' ? 'ol' : 'ul';
                const listContent = node.children ? node.children.map(processNode).join('') : '';
                return `<${tag}>${listContent}</${tag}>`;
            }

            if (node.type === 'listitem') {
                const content = node.children ? node.children.map(processNode).join('') : '';
                return `<li>${content}</li>`;
            }

            // Handle other node types
            if (node.children) {
                return node.children.map(processNode).join('');
            }

            return '';
        }

        return richText.root.children.map(processNode).join('');
    }

    // Function to fetch posts from the API
    async function loadPosts(page) {
        const requestId = ++latestRequestId;
        // Only the first load (nothing on screen yet) shows the loading message - page
        // changes keep the current posts visible until the new ones are ready.
        const isFirstLoad = posts.length === 0 && !error;
        if (isFirstLoad) loading = true;
        try {
            // Use the correct API endpoint that matches your working postfetch.js
            const response = await fetch(`https://cms.sgxp.me/api/posts?sort=-createdAt&depth=2&page=${page}&limit=${postsPerPage}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (requestId !== latestRequestId) return;
            // Process posts to match the expected format
            const nextPosts = (data.docs || []).map(post => {
                const title = post.title || 'Untitled';
                const content = convertRichTextToHTML(post.content);
                const author = post.author || {};

                const profilePicture = author.profilePicture;
                const authorAvatar = profilePicture?.url || profilePicture?.sizes?.profilePicture?.url;
                const publishDate = post.publishedAt || post.createdAt;

                return {
                    id: post.id,
                    title: title,
                    content: content,
                    author: author, // Preserve full author object
                    authorAvatar: authorAvatar || '/img/default-avatar.png',
                    publishDate: publishDate,
                    formattedDate: format(parseISO(publishDate), "LLLL do yyyy 'at' h:mm aa")
                };
            });

            if (isFirstLoad || error) {
                posts = nextPosts;
                error = null;
            } else {
                // Slide the current posts out; handlePostsOutroEnd swaps these in after.
                // (If an outro is already running from a previous click, this just
                // replaces what it will swap in.)
                pendingPosts = nextPosts;
                animatePosts = true;
                showPosts = false;
            }

            totalPages = data.totalPages || 1;
            totalPosts = data.totalDocs || 0;
            currentPage = data.page || page;
        } catch (err) {
            if (requestId !== latestRequestId) return;
            console.error('Error fetching posts:', err);
            error = 'Failed to load posts. Please try again later.';
        } finally {
            if (requestId === latestRequestId) loading = false;
        }
    }

    // Effect to run loadPosts whenever the currentPage changes.
    // (untrack: loadPosts reads `posts`/`error` before its first await, which would
    // otherwise make swapping in the new page's posts re-trigger another fetch.)
    $effect(() => {
        const page = currentPage;
        untrack(() => loadPosts(page));
    });

</script>

<!-- Mobile News Logo - only shows on mobile -->
<div class="mobile-news-logo">NEWS</div>

{#if totalPages > 1}
        <div class="news-pagination-wrapper" style="margin-bottom: var(--gap); position: relative; z-index: 1;">
            <NumberedPagination count={totalPosts} perPage={postsPerPage} bind:page={currentPage} />
        </div>
    {/if}
{#if loading}
    <div style="font-weight: 600; text-align: center; padding: 20px; display: flex; align-items:center; justify-content:center; gap: 8px;"><Spinner size={20} label={null} /> Loading posts...</div>
{:else if error}
    <div class="error">Failed to load posts. Please try again later.</div>
{:else if showPosts}
    <div
        class:page-change={animatePosts}
        in:fly={{ x: -100, duration: animatePosts ? PAGE_TRANSITION_MS : 0 }}
        out:fly={{ y: 100, duration: PAGE_TRANSITION_MS }}
        onoutroend={handlePostsOutroEnd}
    >
    {#each posts as post (post.id)}
        <div class="main-content-title">{post.title}</div>
        <div class="main-content-box">
            <div class="news">
                <div class="news-info-container">
                    <div class="news-img">
                        <img src={post.authorAvatar} alt={getDisplayName(post.author)}>
                    </div>
                    <div class="news-user-info">
                        <div class="news-user-row">
                            <div class="news-user">
                                <a href="/profile?id={post.author?.id}" class="news-author-link">
                                    {getDisplayName(post.author)}
                                </a>
                            </div>
                            <div class="news-badges">
                                {#if post.author?.role && post.author.role !== 'user'}
                                    <!-- Show role badge only if role is NOT 'user' -->
                                    <Badge
                                        themed
                                        color={post.author.roleColor || '#888888'}
                                        class="news-role-badge"
                                    >
                                        {post.author.role}
                                    </Badge>
                                {:else if post.author?.prestigeRole}
                                    <!-- Show prestige badge only if role IS 'user' -->
                                    <Badge
                                        themed
                                        color={post.author.prestigeColor || '#888888'}
                                        class="news-prestige-badge"
                                    >
                                        {post.author.prestigeRole}
                                    </Badge>
                                {/if}
                            </div>
                        </div>
                        {#if getUsername(post.author)}
                            <div class="news-username">{getUsername(post.author)}</div>
                        {/if}
                    </div>
                    <div class="news-date">{post.formattedDate}</div>
                </div>

                <div class="news-content">
                    {@html post.content}
                </div>
            </div>
        </div>
    {/each}
    </div>
{/if}

<style>
    /* global.css gives every .main-content-title/.main-content-box a fadein-left CSS
       animation on mount. Keep it for the first load, but on page changes the fly-in
       from the left above is the only entrance animation, so the two don't fight. */
    .page-change :global(.main-content-title),
    .page-change :global(.main-content-box) {
        animation: none;
    }

    /* The custom pagination styles have been removed as Shadcn handles its own styling. */
</style>