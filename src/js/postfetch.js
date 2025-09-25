import { format, parseISO } from "date-fns";

// Function to convert Payload rich text to HTML
function convertRichTextToHTML(richText) {
  if (!richText || !richText.root || !richText.root.children) {
    return '';
  }

  function processNode(node) {
    if (node.type === 'text') {
      let text = node.text || '';
      // Handle line breaks by converting \n to <br>
      text = text.replace(/\n/g, '<br>');
      // Apply formatting
      if (node.format & 1) text = `<strong>${text}</strong>`; // bold
      if (node.format & 2) text = `<em>${text}</em>`; // italic
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

    // New logic for lists and list items
    if (node.type === 'list') {
      const tag = node.listType === 'ordered' ? 'ol' : 'ul';
      const listContent = node.children ? node.children.map(processNode).join('') : '';
      return `<${tag}>${listContent}</${tag}>`;
    }

    if (node.type === 'listitem') {
      const content = node.children ? node.children.map(processNode).join('') : '';
      return `<li>${content}</li>`;
    }
    
    // Handle other node types as needed
    if (node.children) {
      return node.children.map(processNode).join('');
    }
    
    return '';
  }

  return richText.root.children.map(processNode).join('');
}

function getSprites() {
    const div = document.getElementById('posts')
    let currentPage = 1;
    const postsPerPage = 5;
    
    function loadPosts(page = 1) {
        // Show loading state
        div.innerHTML = '<div style="text-align: center; padding: 20px;">Loading posts...</div>';
        
        // Updated API endpoint for Payload CMS with pagination
        fetch(`https://cms.sgxp.me/api/posts?sort=-createdAt&depth=2&page=${page}&limit=${postsPerPage}`)
        .then(res => res.json())
        .then(data => {
            // Clear loading state
            div.innerHTML = '';
            
            const posts = data.docs || [];
            
            posts.forEach(post => {
                // Extract data from Payload CMS structure
                const title = post.title || 'Untitled';
                const content = convertRichTextToHTML(post.content);
                const author = post.author || {};
                const authorName = author.displayName || author.username || 'Unknown Author';
                const profilePicture = author.profilePicture;
                const authorAvatar = profilePicture?.url || profilePicture?.sizes?.profilePicture?.url;
                const publishDate = post.publishedAt || post.createdAt;
                
                div.innerHTML += `
                <div class="main-content-title">${title}</div>
                <div class="main-content-box">
                  <div class="news">
                    <div class="news-info-container">
                      <div class="news-img">
                        <img src="${authorAvatar || '/img/default-avatar.png'}" alt="${authorName}">
                      </div>
                      <div class="news-user">${authorName}</div>
                      <div class="news-date">${format(parseISO(publishDate), "LLLL do yyyy 'at' h:mm aa")}</div>
                    </div>
                    <div class="news-content">
                      ${content}
                    </div>
                  </div>
                </div>
                `
            });
            
            // Add pagination controls with CSS variables and hover effect
            if (data.totalPages > 1) {
                div.innerHTML += `
                <style>
                    .pagination-btn {
                        --bg-color: var(--page-color); 
                        --font-color: var(--font-color); 
                        --border-color: color-mix(in srgb, var(--page-color) 80%, white);
                        background-color: var(--page-color); 
                        color: var(--font-color); 
                        border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
                        padding: 10px 15px; 
                        cursor: pointer;
                        font-family: inherit; 
                        font-size: 14px;
                        transition: background-color 0.3s ease, border-color 0.3s ease;
                        box-shadow: var(--box-shadow);
                    }
                    .pagination-btn:hover:not(:disabled) {
                        background-color: color-mix(in srgb, var(--page-color) 60%, black);
                    }
                    .pagination-btn:disabled {
                        opacity: 0.8; 
                        cursor: not-allowed;
                    }
                </style>
                <div style="display: flex; justify-content: center; gap: 10px; margin-top: 10px; padding: 10px;">
                    <button id="prevBtn" 
                            onclick="loadPosts(${page - 1})" 
                            ${page <= 1 ? 'disabled' : ''}
                            class="pagination-btn">
                        Previous
                    </button>
                    <span style="background-color: var(--page-color); color: var(--font-color); border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
                                 padding: 10px 15px; font-family: inherit; font-size: 14px;
                                 box-shadow: var(--box-shadow);">
                        Page ${page} of ${data.totalPages}
                    </span>
                    <button id="nextBtn" 
                            onclick="loadPosts(${page + 1})" 
                            ${page >= data.totalPages ? 'disabled' : ''}
                            class="pagination-btn">
                        Next
                    </button>
                </div>
                `;
            }
            
            currentPage = page;
        })
        .catch(error => {
            console.error('Error fetching posts:', error);
            div.innerHTML = '<div class="error">Failed to load posts. Please try again later.</div>';
        });
    }
    
    // Make loadPosts available globally so buttons can call it
    window.loadPosts = loadPosts;
    
    // Initial load
    loadPosts(1);
}

getSprites();