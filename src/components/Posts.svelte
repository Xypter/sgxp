<script>
    import { format, parseISO } from "date-fns";
    import { Pagination, Badge } from "$lib/components";
    import { MediaQuery } from "svelte/reactivity";
    import { getDisplayName, getUsername } from '$lib/spriteUtils';

    // Reactive state using Svelte's new runes API
    let posts = $state([]);
    let currentPage = $state(1);
    let totalPages = $state(0);
    let totalPosts = $state(0); // For Shadcn pagination 'count'
    let loading = $state(true);
    let error = $state(null);
    const postsPerPage = 5;

    // For responsive pagination
    const isDesktop = new MediaQuery("(min-width: 768px)");
    const siblingCount = $derived(isDesktop.current ? 1 : 0);

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
        loading = true;
        error = null;
        try {
            // Use the correct API endpoint that matches your working postfetch.js
            const response = await fetch(`https://cms.sgxp.me/api/posts?sort=-createdAt&depth=2&page=${page}&limit=${postsPerPage}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            // Process posts to match the expected format
            posts = (data.docs || []).map(post => {
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
            
            totalPages = data.totalPages || 1;
            totalPosts = data.totalDocs || 0;
            currentPage = data.page || page;
        } catch (err) {
            console.error('Error fetching posts:', err);
            error = 'Failed to load posts. Please try again later.';
        } finally {
            loading = false;
        }
    }

    // Effect to run loadPosts whenever the currentPage changes.
    $effect(() => {
        loadPosts(currentPage);
    });

</script>

{#if totalPages > 1}
        <div style="margin-bottom: var(--gap); background-color: var(--page-color); border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white); padding: 5px; box-shadow: var(--box-shadow); position: relative; z-index: 1;">
            <Pagination.Root 
                count={totalPosts} 
                perPage={postsPerPage} 
                {siblingCount} 
                bind:page={currentPage}
            >
                {#snippet children({ pages, currentPage })}
                    <Pagination.Content>
                        <Pagination.Item>
                            <Pagination.PrevButton>
                                <span class="hidden sm:block">Previous</span>
                            </Pagination.PrevButton>
                        </Pagination.Item>
                        {#each pages as page (page.key)}
                            {#if page.type === "ellipsis"}
                                <Pagination.Item>
                                    <Pagination.Ellipsis />
                                </Pagination.Item>
                            {:else}
                                <Pagination.Item>
                                    <Pagination.Link {page} isActive={currentPage === page.value}>
                                        {page.value}
                                    </Pagination.Link>
                                </Pagination.Item>
                            {/if}
                        {/each}
                        <Pagination.Item>
                            <Pagination.NextButton>
                                <span class="hidden sm:block">Next</span>
                            </Pagination.NextButton>
                        </Pagination.Item>
                    </Pagination.Content>
                {/snippet}
            </Pagination.Root>
        </div>
    {/if}
{#if loading}
    <div style="font-weight: 600; text-align: center; padding: 20px; display: flex; align-items:center; justify-content:center;">Loading<img src="https://cdn.sgxp.me/img/BIG_SGXPkanDos.gif" alt="">Posts :D</div>
{:else if error}
    <div class="error">Failed to load posts. Please try again later.</div>
{:else}

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
{/if}

<style>
    /* The custom pagination styles have been removed as Shadcn handles its own styling. */
</style>