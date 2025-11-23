<script>
    // Import from component library
    import { Button, Card, Avatar, Textarea, AlertDialog, ReportDialog } from '$lib/components';

    // Import shadcn components we don't have wrappers for
    import * as ScrollArea from '$components/ui/scroll-area';
    import { Separator } from '$components/ui/separator';

    // Import Lucide icons
    import { ZoomIn, ZoomOut, X, FlipHorizontal, FlipVertical, Grid3x3, RotateCw, Download, Eye, MessageSquare, Reply, Edit2, Trash2, Bold, Italic, Underline, Heart, Flag } from 'lucide-svelte';
    
    // Props - now accepting pre-fetched data from server and modal state
    let { 
        spriteId, 
        initialSprite = null, 
        initialError = null,
        isModal = false,
        onClose = null,
        user: initialUser = null // Rename to avoid conflicts
    } = $props();
    
    // State management - initialize with server data
    let sprite = $state(initialSprite);
    let loading = $state(!initialSprite && !initialError);
    let error = $state(initialError);
    let user = $state(initialUser);
    
    // Viewer state
    let viewerOpen = $state(false);
    let zoom = $state(1);
    let imagePosition = $state({ x: 0, y: 0 });
    let isDragging = $state(false);
    let dragStart = $state({ x: 0, y: 0 });
    let flipHorizontal = $state(false);
    let flipVertical = $state(false);
    let showGrid = $state(false);
    let rotation = $state(0);
    let imageLoaded = $state(false);
    
    // Comments state
    let comments = $state([]);
    let commentsLoading = $state(false);
    let commentsError = $state(null);
    let newCommentText = $state('');
    let replyingTo = $state(null);
    let replyText = $state('');
    let editingComment = $state(null);
    let editText = $state('');
    let submittingComment = $state(false);
    let loadingReplies = $state({});
    let expandedComments = $state({});

    // Delete dialog state
    let deleteDialogOpen = $state(false);
    let pendingDelete = $state(null); // { commentId, isReply, parentCommentId }

    // Report dialog state
    let reportDialogOpen = $state(false);
    let pendingReport = $state(null); // commentId to report

    const API_BASE_URL = "/api";

    // Check user authentication
    async function checkUserAuth() {
        try {
            const response = await fetch('/api/users/me', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                const userData = data.user || data;
                user = userData;
            } else {
                user = null;
            }
        } catch (err) {
            user = null;
        }
    }

    // Populate related data (convert IDs to full objects)
    async function populateRelatedData(spriteData) {
        if (!spriteData) return spriteData;

        const populated = { ...spriteData };

        try {
            // Fetch styleGame if it's just an ID
            if (populated.styleGame && typeof populated.styleGame === 'number') {
                const styleRes = await fetch(`${API_BASE_URL}/games/${populated.styleGame}`);
                if (styleRes.ok) {
                    populated.styleGame = await styleRes.json();
                }
            }

            // Fetch sourceGame if it's just an ID
            if (populated.sourceGame && typeof populated.sourceGame === 'number') {
                const sourceRes = await fetch(`${API_BASE_URL}/games/${populated.sourceGame}`);
                if (sourceRes.ok) {
                    populated.sourceGame = await sourceRes.json();
                }
            }

            // Fetch sourceSeries if it's just an ID
            if (populated.sourceSeries && typeof populated.sourceSeries === 'number') {
                const seriesRes = await fetch(`${API_BASE_URL}/series/${populated.sourceSeries}`);
                if (seriesRes.ok) {
                    populated.sourceSeries = await seriesRes.json();
                }
            }

            // Fetch section if it's just an ID
            if (populated.section && typeof populated.section === 'number') {
                const sectionRes = await fetch(`${API_BASE_URL}/sections/${populated.section}`);
                if (sectionRes.ok) {
                    populated.section = await sectionRes.json();
                }
            }

            // Fetch characters if they're just IDs
            if (populated.characters && Array.isArray(populated.characters)) {
                const characterPromises = populated.characters.map(async (char) => {
                    if (typeof char === 'number') {
                        const charRes = await fetch(`${API_BASE_URL}/characters/${char}`);
                        if (charRes.ok) {
                            return await charRes.json();
                        }
                    }
                    return char;
                });
                populated.characters = await Promise.all(characterPromises);
            }

            // Fetch contributors if they're just IDs
            if (populated.contributors && Array.isArray(populated.contributors)) {
                const contributorPromises = populated.contributors.map(async (contrib) => {
                    if (typeof contrib === 'number') {
                        const contribRes = await fetch(`${API_BASE_URL}/users/${contrib}`);
                        if (contribRes.ok) {
                            return await contribRes.json();
                        }
                    }
                    return contrib;
                });
                populated.contributors = await Promise.all(contributorPromises);
            }

        } catch (err) {
            console.error('Error populating related data:', err);
        }

        return populated;
    }

    // Only fetch if we don't have initial data
    async function loadSprite() {
        if (initialSprite || initialError) {
            return;
        }

        if (!spriteId) {
            error = 'No sprite ID provided';
            loading = false;
            return;
        }

        loading = true;
        error = null;

        try {
            const response = await fetch(`${API_BASE_URL}/sprites/${spriteId}?depth=3`);

            if (!response.ok) {
                throw new Error(`Sprite not found (${response.status})`);
            }

            const data = await response.json();
            sprite = await populateRelatedData(data);

        } catch (err) {
            console.error('Error fetching sprite:', err);
            error = err.message || 'Failed to load sprite';
        } finally {
            loading = false;
        }
    }

    // --- LIKES PERSISTENCE LOGIC ---

    // Helper to get IDs from a list of comments
    function getCommentIds(list) {
        if (!list || !Array.isArray(list)) return [];
        return list.map(c => c.id).filter(Boolean);
    }

    // Check if current user has liked the loaded comments
    async function checkLikesForComments(commentsToCheck) {
        if (!user || !commentsToCheck || commentsToCheck.length === 0) return;
        
        const ids = getCommentIds(commentsToCheck);
        if(ids.length === 0) return;

        try {
            // Payload "in" query to check multiple IDs at once
            const idsParam = ids.join(',');
            const response = await fetch(
                `${API_BASE_URL}/likes?where[user][equals]=${user.id}&where[comment][in]=${idsParam}&limit=${ids.length}`,
                { credentials: 'include' }
            );
            
            if (response.ok) {
                const data = await response.json();
                
                // Create a Set of comment IDs that the user has liked
                const likedCommentIds = new Set(
                    data.docs.map(like => typeof like.comment === 'object' ? like.comment.id : like.comment)
                );
                
                // Update comments state to set userHasLiked = true
                comments = comments.map(c => {
                    let updatedC = c;
                    
                    // Check top-level comment
                    if (likedCommentIds.has(c.id)) {
                        updatedC = { ...c, userHasLiked: true };
                    }
                    
                    // Check replies if they exist within this comment structure
                    if (c.replies && Array.isArray(c.replies)) {
                        const updatedReplies = c.replies.map(r => {
                            if (likedCommentIds.has(r.id)) {
                                return { ...r, userHasLiked: true };
                            }
                            return r;
                        });
                        updatedC = { ...updatedC, replies: updatedReplies };
                    }
                    return updatedC;
                });
            }
        } catch (e) {
            console.error("Failed to check existing likes:", e);
        }
    }

    async function loadComments() {
        if (!spriteId) return;

        commentsLoading = true;
        commentsError = null;

        try {
            // Matches Step 1 of Ideal API Flow: Top-level comments only
            // depth=2 to populate author and author.profilePicture
            const response = await fetch(
                `${API_BASE_URL}/comments?where[sprite][equals]=${spriteId}&where[parentComment][exists]=false&depth=2&sort=-createdAt&limit=20`,
                { credentials: 'include' }
            );

            if (!response.ok) throw new Error('Failed to load comments');

            const data = await response.json();
            comments = data.docs || [];
            
            // Immediately check if user liked any of these
            checkLikesForComments(comments);

        } catch (err) {
            console.error('Error loading comments:', err);
            commentsError = err.message || 'Failed to load comments';
        } finally {
            commentsLoading = false;
        }
    }

    async function loadReplies(parentCommentId) {
        if (loadingReplies[parentCommentId]) return;

        // Set loading state for this specific comment
        loadingReplies = { ...loadingReplies, [parentCommentId]: true };

        try {
            const url = `${API_BASE_URL}/comments?where[parentComment][equals]=${parentCommentId}&depth=2&sort=createdAt`;
            console.log('[loadReplies] Fetching replies for comment:', parentCommentId);
            console.log('[loadReplies] URL:', url);

            // Matches Step 2 of Ideal API Flow: Replies to specific parent
            const response = await fetch(url, { credentials: 'include' });

            console.log('[loadReplies] Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[loadReplies] Error response body:', errorText);
                throw new Error('Failed to load replies');
            }

            const responseText = await response.text();
            console.log('[loadReplies] Success response body (length):', responseText.length);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('[loadReplies] Failed to parse response as JSON:', e);
                throw new Error('Invalid response from server');
            }

            const loadedReplies = data.docs || [];
            console.log('[loadReplies] Loaded replies count:', loadedReplies.length);

            // Update the specific comment with its replies
            comments = comments.map(comment => {
                if (comment.id === parentCommentId) {
                    return { ...comment, replies: loadedReplies };
                }
                return comment;
            });

            expandedComments = { ...expandedComments, [parentCommentId]: true };

            // Check if user liked any of these replies
            checkLikesForComments(loadedReplies);

        } catch (err) {
            console.error('[loadReplies] Error:', err);
            console.error('[loadReplies] Error stack:', err instanceof Error ? err.stack : 'N/A');
            alert('Failed to load replies: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            loadingReplies = { ...loadingReplies, [parentCommentId]: false };
        }
    }

    // Submit a new comment with optimistic UI
    async function submitComment() {
        if (!user) { alert('Please log in to comment'); return; }
        if (!newCommentText.trim()) return;

        const commentText = newCommentText.trim();
        const tempId = `temp-${Date.now()}`;

        // Create optimistic comment that appears immediately
        const optimisticComment = {
            id: tempId,
            text: commentText,
            sprite: parseInt(spriteId, 10),
            author: user,
            createdAt: new Date().toISOString(),
            likeCount: 0,
            userHasLiked: false,
            replies: [],
            isPending: true, // Flag to show pending state
        };

        console.log('[submitComment] Adding optimistic comment:', optimisticComment);

        // OPTIMISTIC UPDATE: Immediately add comment to UI
        comments = [optimisticComment, ...comments];
        newCommentText = '';
        submittingComment = true;

        try {
            const requestBody = {
                text: commentText,
                sprite: parseInt(spriteId, 10),
                // No parentComment means it's top-level
                // Note: author is auto-injected by the backend from authenticated user
            };

            console.log('[submitComment] Sending request:', {
                url: `${API_BASE_URL}/comments`,
                body: requestBody
            });

            const response = await fetch(`${API_BASE_URL}/comments?depth=2`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(requestBody),
            });

            console.log('[submitComment] Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[submitComment] Error response body:', errorText);

                let errorData = {};
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    console.error('[submitComment] Failed to parse error response as JSON');
                }

                throw new Error(errorData.message || `Failed to post comment (${response.status})`);
            }

            const responseText = await response.text();
            console.log('[submitComment] Success response body:', responseText);

            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                console.error('[submitComment] Failed to parse success response as JSON:', e);
                throw new Error('Invalid response from server');
            }

            // Handle case where Payload wraps response in { doc: ... } or returns doc directly
            const newComment = responseData.doc || responseData;
            console.log('[submitComment] New comment from server:', newComment);

            // Ensure author is fully populated - preserve from optimistic if needed
            if (!newComment.author || typeof newComment.author === 'string' || typeof newComment.author === 'number') {
                newComment.author = user;
            }

            // Replace optimistic comment with real one from server
            comments = comments.map(c => c.id === tempId ? newComment : c);

        } catch (err) {
            console.error('[submitComment] Error:', err);
            console.error('[submitComment] Error stack:', err instanceof Error ? err.stack : 'N/A');

            // ROLLBACK: Remove the optimistic comment on error
            comments = comments.filter(c => c.id !== tempId);

            // Restore the text so user doesn't lose their comment
            newCommentText = commentText;

            alert('Failed to post comment: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            submittingComment = false;
        }
    }

    async function submitReply(parentCommentId) {
        if (!user) { alert('Please log in to reply'); return; }
        if (!replyText.trim()) return;

        const replyTextValue = replyText.trim();
        const tempId = `temp-reply-${Date.now()}`;

        // Create optimistic reply that appears immediately
        const optimisticReply = {
            id: tempId,
            text: replyTextValue,
            sprite: parseInt(spriteId, 10),
            parentComment: parentCommentId,
            author: user,
            createdAt: new Date().toISOString(),
            likeCount: 0,
            userHasLiked: false,
            isPending: true, // Flag to show pending state
        };

        console.log('[submitReply] Adding optimistic reply:', optimisticReply);

        // OPTIMISTIC UPDATE: Immediately add reply to UI
        comments = comments.map(comment => {
            if (comment.id === parentCommentId) {
                const currentReplies = comment.replies || [];
                return {
                    ...comment,
                    replyCount: (comment.replyCount || 0) + 1,
                    replies: [...currentReplies, optimisticReply]
                };
            }
            return comment;
        });

        replyText = '';
        replyingTo = null;
        expandedComments = { ...expandedComments, [parentCommentId]: true };
        submittingComment = true;

        try {
            const requestBody = {
                text: replyTextValue,
                sprite: parseInt(spriteId, 10),
                parentComment: parentCommentId,
                // Note: author is auto-injected by the backend from authenticated user
            };

            console.log('[submitReply] Sending request:', {
                url: `${API_BASE_URL}/comments`,
                body: requestBody
            });

            const response = await fetch(`${API_BASE_URL}/comments?depth=2`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(requestBody),
            });

            console.log('[submitReply] Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[submitReply] Error response body:', errorText);

                let errorData = {};
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    console.error('[submitReply] Failed to parse error response as JSON');
                }

                throw new Error(errorData.message || `Failed to post reply (${response.status})`);
            }

            const responseText = await response.text();
            console.log('[submitReply] Success response body:', responseText);

            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                console.error('[submitReply] Failed to parse success response as JSON:', e);
                throw new Error('Invalid response from server');
            }

            const newReply = responseData.doc || responseData;
            console.log('[submitReply] New reply from server:', newReply);

            // Ensure author is fully populated - preserve from optimistic if needed
            if (!newReply.author || typeof newReply.author === 'string' || typeof newReply.author === 'number') {
                newReply.author = user;
            }

            // Replace optimistic reply with real one from server
            comments = comments.map(comment => {
                if (comment.id === parentCommentId) {
                    return {
                        ...comment,
                        replies: (comment.replies || []).map(r =>
                            r.id === tempId ? newReply : r
                        )
                    };
                }
                return comment;
            });

        } catch (err) {
            console.error('[submitReply] Error:', err);
            console.error('[submitReply] Error stack:', err instanceof Error ? err.stack : 'N/A');

            // ROLLBACK: Remove the optimistic reply on error
            comments = comments.map(comment => {
                if (comment.id === parentCommentId) {
                    return {
                        ...comment,
                        replyCount: Math.max(0, (comment.replyCount || 1) - 1),
                        replies: (comment.replies || []).filter(r => r.id !== tempId)
                    };
                }
                return comment;
            });

            // Restore the text so user doesn't lose their reply
            replyText = replyTextValue;
            replyingTo = parentCommentId;

            alert('Failed to post reply: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            submittingComment = false;
        }
    }

    // Edit a comment with optimistic UI
    async function updateComment(commentId) {
        if (!editText.trim()) {
            return;
        }

        const newText = editText.trim();

        // Store previous state for potential rollback
        const previousComments = JSON.parse(JSON.stringify(comments));
        const previousEditingComment = editingComment;
        const previousEditText = editText;

        // OPTIMISTIC UPDATE: Immediately update the text and mark as editing
        comments = comments.map(comment => {
            if (comment.id === commentId) {
                return { ...comment, text: newText, isEditing: true };
            }
            // Also check replies
            if (comment.replies) {
                return {
                    ...comment,
                    replies: comment.replies.map(reply =>
                        reply.id === commentId ? { ...reply, text: newText, isEditing: true } : reply
                    )
                };
            }
            return comment;
        });

        // Exit edit mode immediately
        editingComment = null;
        editText = '';
        submittingComment = true;

        try {
            console.log('[updateComment] Updating comment:', commentId, 'with text:', newText);

            const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    text: newText,
                }),
            });

            console.log('[updateComment] Update response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[updateComment] API Error Response:', errorData);
                throw new Error(errorData.message || `Failed to update comment (${response.status})`);
            }

            const updatedComment = await response.json();
            console.log('[updateComment] Updated comment from server:', updatedComment);

            // Replace with server response and remove isEditing flag
            comments = comments.map(comment => {
                if (comment.id === commentId) {
                    return { ...updatedComment.doc, isEditing: false };
                }
                // Also check replies
                if (comment.replies) {
                    return {
                        ...comment,
                        replies: comment.replies.map(reply =>
                            reply.id === commentId ? { ...updatedComment.doc, isEditing: false } : reply
                        )
                    };
                }
                return comment;
            });

        } catch (err) {
            // ROLLBACK: Restore previous state on error
            comments = previousComments;
            editingComment = previousEditingComment;
            editText = previousEditText;

            console.error('[updateComment] Error updating comment:', err);
            alert('Failed to update comment: ' + err.message);
        } finally {
            submittingComment = false;
        }
    }

    // Delete a comment with optimistic UI
    async function deleteComment(commentId, isReply = false, parentCommentId = null) {
        // Open confirmation dialog instead of using confirm()
        pendingDelete = { commentId, isReply, parentCommentId };
        deleteDialogOpen = true;
    }

    // Execute the delete after confirmation
    async function executeDelete() {
        if (!pendingDelete) return;

        const { commentId, isReply, parentCommentId } = pendingDelete;
        pendingDelete = null;

        // Store previous state for potential rollback
        const previousComments = JSON.parse(JSON.stringify(comments));

        // OPTIMISTIC UPDATE: Immediately mark comment as deleting
        if (isReply && parentCommentId) {
            comments = comments.map(comment => {
                if (comment.id === parentCommentId) {
                    return {
                        ...comment,
                        replies: (comment.replies || []).map(r =>
                            r.id === commentId ? { ...r, isDeleting: true } : r
                        )
                    };
                }
                return comment;
            });
        } else {
            comments = comments.map(c =>
                c.id === commentId ? { ...c, isDeleting: true } : c
            );
        }

        try {
            console.log('[deleteComment] Deleting comment:', commentId);

            const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            console.log('[deleteComment] Delete response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[deleteComment] API Error Response:', errorData);
                throw new Error(errorData.message || `Failed to delete comment (${response.status})`);
            }

            // Success! Now actually remove the comment from state
            if (isReply && parentCommentId) {
                comments = comments.map(comment => {
                    if (comment.id === parentCommentId) {
                        return {
                            ...comment,
                            replyCount: Math.max(0, (comment.replyCount || 1) - 1),
                            replies: comment.replies ? comment.replies.filter(r => r.id !== commentId) : []
                        };
                    }
                    return comment;
                });
            } else {
                comments = comments.filter(c => c.id !== commentId);
            }

        } catch (err) {
            // ROLLBACK: Restore previous state on error
            comments = previousComments;

            console.error('[deleteComment] Error deleting comment:', err);
            alert('Failed to delete comment: ' + err.message);
        }
    }

    function toggleReplies(commentId) {
        if (expandedComments[commentId]) {
            expandedComments = { ...expandedComments, [commentId]: false };
        } else {
            const comment = comments.find(c => c.id === commentId);
            // If we haven't loaded replies yet (or replies is empty but count > 0), load them
            if (comment && (!comment.replies || comment.replies.length === 0) && comment.replyCount > 0) {
                loadReplies(commentId);
            } else {
                expandedComments = { ...expandedComments, [commentId]: true };
            }
        }
    }

    function startReply(commentId) {
        replyingTo = commentId;
        replyText = '';
    }

    function cancelReply() {
        replyingTo = null;
        replyText = '';
    }

    function startEdit(comment) {
        editingComment = comment.id;
        editText = comment.text;
    }

    function cancelEdit() {
        editingComment = null;
        editText = '';
    }

    function canEditDelete(comment) {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return comment.author?.id === user.id || comment.author === user.id;
    }

    // Like/Unlike a comment with optimistic UI updates
    async function likeComment(commentId, isReply = false, parentCommentId = null) {
        console.log('[likeComment] Called with:', { commentId, isReply, parentCommentId });

        if (!user) {
            alert('Please log in to like comments');
            return;
        }

        // Get current comment state to determine action
        let currentComment;
        if (isReply && parentCommentId) {
            const parentComment = comments.find(c => c.id === parentCommentId);
            currentComment = parentComment?.replies?.find(r => r.id === commentId);
        } else {
            currentComment = comments.find(c => c.id === commentId);
        }

        if (!currentComment) {
            console.error('Comment not found');
            return;
        }

        console.log('[likeComment] Current comment:', currentComment);

        // Store previous state for potential rollback (use JSON for better browser compatibility)
        const previousComments = JSON.parse(JSON.stringify(comments));

        // Determine the optimistic update
        const wasLiked = currentComment.userHasLiked || false;
        const newLikeStatus = !wasLiked;
        const likeChange = newLikeStatus ? 1 : -1;

        console.log('[likeComment] Optimistic update:', { wasLiked, newLikeStatus, likeChange });

        // OPTIMISTIC UPDATE: Immediately update UI before API call
        if (isReply && parentCommentId) {
            comments = comments.map(c => {
                if (c.id === parentCommentId && c.replies) {
                    return {
                        ...c,
                        replies: c.replies.map(r =>
                            r.id === commentId
                                ? { ...r, likeCount: (r.likeCount || 0) + likeChange, userHasLiked: newLikeStatus }
                                : r
                        )
                    };
                }
                return c;
            });
        } else {
            comments = comments.map(c =>
                c.id === commentId
                    ? { ...c, likeCount: (c.likeCount || 0) + likeChange, userHasLiked: newLikeStatus }
                    : c
            );
        }

        // Now perform the actual API call in the background
        try {
            // Check current server status to determine what action to take
            const checkResponse = await fetch(
                `${API_BASE_URL}/likes?where[user][equals]=${user.id}&where[comment][equals]=${commentId}`,
                { credentials: 'include' }
            );

            if (!checkResponse.ok) throw new Error('Failed to check like status');

            const checkData = await checkResponse.json();
            const isLikedOnServer = checkData.totalDocs > 0;

            // Perform the action that matches our optimistic update
            if (newLikeStatus && !isLikedOnServer) {
                // We want to like it and it's not liked on server - POST
                const response = await fetch(`${API_BASE_URL}/likes`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: user.id, comment: commentId }),
                });
                if (!response.ok) throw new Error('Failed to like comment');

            } else if (!newLikeStatus && isLikedOnServer) {
                // We want to unlike it and it's liked on server - DELETE
                const likeId = checkData.docs[0].id;
                const response = await fetch(`${API_BASE_URL}/likes/${likeId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });
                if (!response.ok) throw new Error('Failed to unlike comment');

            } else if (newLikeStatus && isLikedOnServer) {
                // Server already shows it as liked - local state was out of sync
                // Keep the optimistic update (no API call needed, state is now correct)
                console.log('Like already exists on server, local state updated to match');

            } else if (!newLikeStatus && !isLikedOnServer) {
                // Server already shows it as not liked - local state was out of sync
                // Keep the optimistic update (no API call needed, state is now correct)
                console.log('Like already removed on server, local state updated to match');
            }

        } catch (err) {
            // ROLLBACK: Revert to previous state on error
            comments = previousComments;

            console.error('Error toggling like:', err);
            alert('Failed to ' + (newLikeStatus ? 'like' : 'unlike') + ' comment. Please try again.');
        }
    }

    function reportComment(commentId) {
        if (!user) {
            alert('Please log in to report');
            return;
        }
        // Open report dialog
        pendingReport = commentId;
        reportDialogOpen = true;
    }

    // Execute the report after dialog submission
    async function executeReport(reason, details) {
        if (!pendingReport || !user) return;

        const commentId = pendingReport;
        pendingReport = null;

        try {
            const requestBody = {
                comment: commentId,
                reporter: user.id,
                reason: reason,
                details: details || undefined
            };

            console.log('[executeReport] Sending request:', {
                url: `${API_BASE_URL}/reports`,
                body: requestBody
            });

            const response = await fetch(`${API_BASE_URL}/reports`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            console.log('[executeReport] Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[executeReport] Error response body:', errorText);

                let errData = {};
                try {
                    errData = JSON.parse(errorText);
                } catch (e) {
                    console.error('[executeReport] Failed to parse error response as JSON');
                }

                throw new Error(errData.message || 'Failed to submit report');
            }

            const responseText = await response.text();
            console.log('[executeReport] Success response body:', responseText);
            alert('Comment reported successfully. Thank you for helping keep our community safe.');

        } catch (err) {
            console.error('[executeReport] Error:', err);
            console.error('[executeReport] Error stack:', err instanceof Error ? err.stack : 'N/A');
            alert('Failed to report: ' + (err instanceof Error ? err.message : String(err)));
        }
    }

    // Text formatting functions
    function applyFormatting(textarea, formatType) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        let formattedText = '';
        let cursorOffset = 0;

        switch(formatType) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                cursorOffset = selectedText ? 2 : 2;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                cursorOffset = selectedText ? 1 : 1;
                break;
            case 'underline':
                formattedText = `__${selectedText}__`;
                cursorOffset = selectedText ? 2 : 2;
                break;
        }

        const newValue = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);

        return {
            newValue,
            newCursorPos: selectedText ? end + cursorOffset * 2 : start + cursorOffset
        };
    }

    function formatNewComment(type) {
        // Check both modal and page view textarea IDs
        const textarea = document.getElementById('new-comment-textarea') || document.getElementById('new-comment-textarea-page');
        if (!textarea) return;

        const result = applyFormatting(textarea, type);
        newCommentText = result.newValue;

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(result.newCursorPos, result.newCursorPos);
        }, 0);
    }

    function formatReply(type) {
        const textarea = document.getElementById('reply-textarea');
        if (!textarea) return;

        const result = applyFormatting(textarea, type);
        replyText = result.newValue;

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(result.newCursorPos, result.newCursorPos);
        }, 0);
    }

    function formatEdit(type) {
        const textarea = document.getElementById('edit-textarea');
        if (!textarea) return;

        const result = applyFormatting(textarea, type);
        editText = result.newValue;

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(result.newCursorPos, result.newCursorPos);
        }, 0);
    }

    // Simple markdown-like text renderer
    function renderCommentText(text) {
        if (!text) return '';
        // Convert **text** to <strong>text</strong>
        let rendered = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Convert *text* to <em>text</em>
        rendered = rendered.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Convert __text__ to <u>text</u>
        rendered = rendered.replace(/__(.*?)__/g, '<u>$1</u>');
        return rendered;
    }

    function preloadImage() {
        if (sprite?.image?.url) {
            const img = new Image();
            img.src = sprite.image.url;
        }
    }

    function openViewer() {
        viewerOpen = true;
        zoom = 1;
        flipHorizontal = false;
        flipVertical = false;
        showGrid = false;
        rotation = 0;
        centerImage();
        // Prevent scrolling on both body and the sprite viewer container
        document.body.style.overflow = 'hidden';
        if (isModal) {
            const container = document.querySelector('.sprite-viewer-container');
            if (container) {
                container.style.overflow = 'hidden';
            }
        }
    }

    function closeViewer() {
        viewerOpen = false;
        // Restore scrolling
        document.body.style.overflow = '';
        if (isModal) {
            const container = document.querySelector('.sprite-viewer-container');
            if (container) {
                container.style.overflow = '';
            }
        }
    }

    function handleModalClose() {
        if (isModal && onClose) {
            onClose();
        }
    }

    function centerImage() {
        if (!sprite?.image) return;
        imagePosition = { x: 0, y: 0 };
    }

    function zoomIn() {
        const oldZoom = zoom;
        zoom = Math.min(25, zoom + 1);
        
        if (zoom !== oldZoom) {
            const zoomRatio = zoom / oldZoom;
            imagePosition = {
                x: imagePosition.x * zoomRatio,
                y: imagePosition.y * zoomRatio
            };
        }
    }

    function zoomOut() {
        const oldZoom = zoom;
        zoom = Math.max(1, zoom - 1);
        
        if (zoom !== oldZoom) {
            const zoomRatio = zoom / oldZoom;
            imagePosition = {
                x: imagePosition.x * zoomRatio,
                y: imagePosition.y * zoomRatio
            };
        }
    }

    function rotateImage() {
        rotation = (rotation + 90) % 360;
    }

    function toggleFlipHorizontal() {
        flipHorizontal = !flipHorizontal;
    }

    function toggleFlipVertical() {
        flipVertical = !flipVertical;
    }

    function toggleGrid() {
        showGrid = !showGrid;
    }

    async function downloadImage() {
        if (!sprite?.image) return;
        
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', sprite.image.url, true);
            xhr.responseType = 'blob';
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    const blob = xhr.response;
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = sprite.image.filename || `sprite_${sprite.id}.png`;
                    
                    document.body.appendChild(a);
                    a.click();
                    
                    setTimeout(() => {
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                    }, 100);
                }
            };
            
            xhr.onerror = function() {
                console.error('Download failed');
                const a = document.createElement('a');
                a.href = sprite.image.url;
                a.download = sprite.image.filename || `sprite_${sprite.id}.png`;
                a.click();
            };
            
            xhr.send();
            
        } catch (error) {
            console.error('Failed to download image:', error);
            const a = document.createElement('a');
            a.href = sprite.image.url;
            a.download = sprite.image.filename || `sprite_${sprite.id}.png`;
            a.click();
        }
    }

    function formatBytes(bytes) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 1) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function getDisplayName(author) {
        if (!author) return 'Unknown User';
        if (typeof author === 'string') return 'Unknown User';
        return author.displayName || author.username || author.email?.split('@')[0] || 'Unknown User';
    }

    function getProfilePicture(author) {
        if (!author || typeof author === 'string') return null;
        return author.profilePicture?.url || null;
    }

    function handleWheel(event) {
        if (!viewerOpen) return;
        
        event.preventDefault();
        
        const delta = event.deltaY > 0 ? -1 : 1;
        const newZoom = Math.max(1, Math.min(25, zoom + delta));
        
        if (newZoom !== zoom) {
            const rect = event.currentTarget.getBoundingClientRect();
            const mouseX = event.clientX - rect.left - rect.width / 2;
            const mouseY = event.clientY - rect.top - rect.height / 2;
            
            const imagePointX = (mouseX - imagePosition.x) / zoom;
            const imagePointY = (mouseY - imagePosition.y) / zoom;
            
            zoom = newZoom;
            
            imagePosition = {
                x: mouseX - imagePointX * zoom,
                y: mouseY - imagePointY * zoom
            };
        }
    }

    function handleMouseDown(event) {
        if (event.button === 0) {
            event.preventDefault();
            isDragging = true;
            
            dragStart = {
                x: event.clientX,
                y: event.clientY,
                imageX: imagePosition.x,
                imageY: imagePosition.y
            };
        }
    }

    function handleMouseMove(event) {
        if (isDragging) {
            event.preventDefault();
            
            const deltaX = event.clientX - dragStart.x;
            const deltaY = event.clientY - dragStart.y;
            
            const angleRad = -(rotation * Math.PI / 180);
            const cos = Math.cos(angleRad);
            const sin = Math.sin(angleRad);
            
            const rotatedDeltaX = deltaX * cos - deltaY * sin;
            const rotatedDeltaY = deltaX * sin + deltaY * cos;
            
            imagePosition = {
                x: dragStart.imageX + rotatedDeltaX,
                y: dragStart.imageY + rotatedDeltaY
            };
        }
    }

    function handleMouseUp(event) {
        if (isDragging) {
            event.preventDefault();
        }
        isDragging = false;
    }

    function handleKeydown(event) {
        if (isModal && event.key === 'Escape') {
            handleModalClose();
            return;
        }
        
        if (!viewerOpen) return;
        
        if (event.key === 'Escape') {
            closeViewer();
        } else if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            zoomIn();
        } else if (event.key === '-') {
            event.preventDefault();
            zoomOut();
        }
    }

    $effect(() => {
        async function init() {
            if (!initialSprite && !initialError) {
                await loadSprite();
            } else if (initialSprite) {
                // Populate related data for initial sprite
                sprite = await populateRelatedData(initialSprite);
            }
            checkUserAuth();
        }
        init();
    });

    $effect(() => {
        if (sprite?.image?.url) {
            preloadImage();
        }
    });

    $effect(() => {
        if (spriteId) {
            loadComments();
        }
    });

    $effect(() => {
        if (viewerOpen || isModal) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('keydown', handleKeydown);
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('keydown', handleKeydown);
            };
        }
    });
</script>

<div class="sprite-viewer-container" class:is-modal={isModal}>
    {#if isModal}
        <ScrollArea.Root class="h-full" orientation="vertical">
            {#if loading}
                <div class="sprite-content-title">Loading Sprite...</div>
                <div class="sprite-content-box">
                    <div class="loading-state">
                        <p>Loading sprite details...</p>
                    </div>
                </div>
            {:else if error}
        <div class="sprite-content-title">Error</div>
        <div class="sprite-content-box">
            <div class="error-state">
                <p>{error}</p>
            </div>
        </div>
    {:else if sprite}
        <!-- Header with title -->
        <div class="sprite-viewer-header">
            <div class="sprite-content-title">{sprite.title}</div>
        </div>

        <!-- Sprite Sheet Section -->
        <div class="sprite-sheet-section">
            {#if sprite.image}
                <div class="sprite-sheet-container">
                    <img 
                        src={sprite.image.url} 
                        alt={sprite.image.alt || sprite.title}
                        class="sprite-sheet-image"
                        class:loaded={imageLoaded}
                        loading="eager"
                        onclick={openViewer}
                        onload={() => imageLoaded = true}
                    />
                    <button class="sprite-sheet-overlay" onclick={openViewer}>
                        <Eye class="overlay-icon" />
                        <span>Click to view fullscreen</span>
                    </button>
                </div>
            {:else}
                <div class="sprite-sheet-container no-image">
                    <p>No image available for this sprite.</p>
                </div>
            {/if}
        </div>

        <!-- Information Section -->
        <div class="sprite-info-section">
            <div class="sprite-info-title">Information</div>
            <div class="sprite-info-content">
                <!-- Author Info -->
                <div class="author-section">
                    <div class="author-avatar">
                        {#if sprite.author?.profilePicture?.url}
                            <img 
                                src={sprite.author.profilePicture.url} 
                                alt={sprite.author.displayName || sprite.author.username}
                            />
                        {:else}
                            <div class="avatar-placeholder">
                                {(sprite.author?.displayName || sprite.author?.username || 'U')[0].toUpperCase()}
                            </div>
                        {/if}
                    </div>
                    <div class="author-details">
                        <h3 class="author-name">
                            {sprite.author?.displayName || sprite.author?.username || 'Unknown Author'}
                        </h3>
                        <p class="author-meta">
                            Uploaded {formatDate(sprite.createdAt)}
                        </p>
                    </div>
                </div>

                <!-- Image Details Grid -->
                <div class="details-grid">
                    <div class="detail-item">
                        <h4>Dimensions</h4>
                        <p>{sprite.image?.width || 0} × {sprite.image?.height || 0} px</p>
                    </div>
                    <div class="detail-item">
                        <h4>File Size</h4>
                        <p>{sprite.image?.filesize ? formatBytes(sprite.image.filesize) : '0 Bytes'}</p>
                    </div>
                    <div class="detail-item">
                        <h4>Style</h4>
                        <p>{sprite.styleGame?.name || 'Unknown'}</p>
                    </div>
                    <div class="detail-item">
                        <h4>Source</h4>
                        <p>
                            {#if sprite.sourceType === 'game'}
                                {sprite.sourceGame?.name || 'Unknown'}
                            {:else if sprite.sourceType === 'series'}
                                {sprite.sourceSeries?.name || 'Unknown'}
                            {:else}
                                Unknown
                            {/if}
                        </p>
                    </div>
                    <div class="detail-item">
                        <h4>Section</h4>
                        <p>{sprite.section?.name || 'Unknown'}</p>
                    </div>
                    {#if sprite.characters && sprite.characters.length > 0}
                        <div class="detail-item">
                            <h4>Characters</h4>
                            <p>{sprite.characters.map(c => c.name).join(', ')}</p>
                        </div>
                    {/if}
                    <div class="detail-item">
                        <h4>Views</h4>
                        <p>{sprite.views?.toLocaleString() || 0}</p>
                    </div>
                </div>

                <!-- Contributors Section -->
                {#if sprite.contributors && sprite.contributors.length > 0}
                    <div class="contributors-section">
                        <h4>Contributors</h4>
                        <div class="contributors-list">
                            {#each sprite.contributors as contributor}
                                <div class="contributor-item">
                                    <span>{contributor.displayName || contributor.username || contributor.name || 'Unknown Contributor'}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- Description Section -->
                {#if sprite.description}
                    <div class="description-section">
                        <h4>Description</h4>
                        <p class="description-text">{sprite.description}</p>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Comments Section -->
        <div class="sprite-comments-section">
            <div class="sprite-comments-title">
                <MessageSquare class="h-5 w-5" style="display: inline-block; vertical-align: middle; margin-right: 8px;" />
                Comments ({comments.length})
            </div>
            <div class="sprite-comments-content">
                <!-- Comment Form -->
                {#if user}
                    <Card.Root class="comment-form-card">
                        <div class="comment-form-header">
                            <Avatar.Root class="comment-avatar">
                                {#if user.profilePicture?.url}
                                    <Avatar.Image src={user.profilePicture.url} alt={getDisplayName(user)} />
                                {:else}
                                    <Avatar.Fallback class="avatar-fallback">
                                        {getDisplayName(user)[0].toUpperCase()}
                                    </Avatar.Fallback>
                                {/if}
                            </Avatar.Root>
                            <div class="comment-input-wrapper">
                                <Textarea
                                    id="new-comment-textarea"
                                    bind:value={newCommentText}
                                    placeholder="Write a comment... Use **bold**, *italic*, or __underline__ for formatting."
                                    rows={4}
                                    disabled={submittingComment}
                                    class="comment-textarea-modern"
                                />
                                <div class="formatting-toolbar">
                                    <div class="toolbar-buttons">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onclick={() => formatNewComment('bold')}
                                            disabled={submittingComment}
                                            title="Bold"
                                            class="toolbar-btn"
                                        >
                                            <Bold class="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onclick={() => formatNewComment('italic')}
                                            disabled={submittingComment}
                                            title="Italic"
                                            class="toolbar-btn"
                                        >
                                            <Italic class="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onclick={() => formatNewComment('underline')}
                                            disabled={submittingComment}
                                            title="Underline"
                                            class="toolbar-btn"
                                        >
                                            <Underline class="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Button
                                        onclick={submitComment}
                                        disabled={submittingComment || !newCommentText.trim()}
                                        size="sm"
                                    >
                                        {submittingComment ? 'Posting...' : 'Post Comment'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card.Root>
                {:else}
                    <div class="login-prompt">
                        <p>Please <a href="/login">log in</a> to leave a comment.</p>
                    </div>
                {/if}

                <!-- Comments List -->
                {#if commentsLoading}
                    <div class="loading-state">
                        <p>Loading comments...</p>
                    </div>
                {:else if commentsError}
                    <div class="error-state">
                        <p>Failed to load comments. Please try again.</p>
                    </div>
                {:else if comments.length === 0}
                    {#if !user}
                        <div class="login-prompt">
                            <p>Please <a href="/login">log in</a> to be the first to comment!</p>
                        </div>
                    {/if}
                {:else}
                    <div class="comments-list">
                        {#each comments as comment}
                            <Card.Root class="comment-card {comment.isPending ? 'pending' : ''} {comment.isDeleting ? 'deleting' : ''} {comment.isEditing ? 'editing' : ''}">
                                <div class="comment-header">
                                    <Avatar.Root class="comment-avatar-large">
                                        {#if getProfilePicture(comment.author)}
                                            <Avatar.Image
                                                src={getProfilePicture(comment.author)}
                                                alt={getDisplayName(comment.author)}
                                            />
                                        {:else}
                                            <Avatar.Fallback class="avatar-fallback-large">
                                                {getDisplayName(comment.author)[0].toUpperCase()}
                                            </Avatar.Fallback>
                                        {/if}
                                    </Avatar.Root>
                                    <div class="comment-meta">
                                        <h4 class="comment-author">
                                            {getDisplayName(comment.author)}
                                        </h4>
                                        <p class="comment-date">
                                            {formatDate(comment.createdAt)}
                                            {#if comment.isEdited}
                                                <span class="edited-badge">(edited)</span>
                                            {/if}
                                        </p>
                                    </div>
                                    {#if canEditDelete(comment)}
                                        <div class="comment-actions">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onclick={() => startEdit(comment)}
                                                title="Edit"
                                                class="comment-action-btn"
                                            >
                                                <Edit2 class="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onclick={() => deleteComment(comment.id)}
                                                title="Delete"
                                                class="comment-action-btn delete-btn"
                                            >
                                                <Trash2 class="h-4 w-4" />
                                            </Button>
                                        </div>
                                    {/if}
                                </div>

                                <Separator class="comment-separator" />

                                <div class="comment-body">
                                    {#if editingComment === comment.id}
                                        <div class="edit-form">
                                            <Textarea
                                                id="edit-textarea"
                                                bind:value={editText}
                                                rows={3}
                                                disabled={submittingComment}
                                                class="comment-textarea-modern"
                                            />
                                            <div class="formatting-toolbar edit-toolbar">
                                                <div class="toolbar-buttons">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onclick={() => formatEdit('bold')}
                                                        disabled={submittingComment}
                                                        title="Bold"
                                                        class="toolbar-btn"
                                                    >
                                                        <Bold class="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onclick={() => formatEdit('italic')}
                                                        disabled={submittingComment}
                                                        title="Italic"
                                                        class="toolbar-btn"
                                                    >
                                                        <Italic class="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onclick={() => formatEdit('underline')}
                                                        disabled={submittingComment}
                                                        title="Underline"
                                                        class="toolbar-btn"
                                                    >
                                                        <Underline class="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div class="edit-form-actions">
                                                    <Button
                                                        onclick={() => updateComment(comment.id)}
                                                        disabled={submittingComment || !editText.trim()}
                                                        size="sm"
                                                    >
                                                        {submittingComment ? 'Saving...' : 'Save'}
                                                    </Button>
                                                    <Button
                                                        onclick={cancelEdit}
                                                        disabled={submittingComment}
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    {:else}
                                        <p class="comment-text">{@html renderCommentText(comment.text)}</p>
                                    {/if}
                                </div>

                                <!-- Reply Button and Count -->
                                <div class="comment-footer">
                                    <div class="comment-footer-left">
                                        {#if user}
                                            <button
                                                class="reply-btn"
                                                onclick={() => startReply(comment.id)}
                                            >
                                                <Reply class="h-4 w-4" />
                                                Reply
                                            </button>
                                        {/if}

                                        {#if comment.replyCount > 0}
                                            <button
                                                class="view-replies-btn"
                                                onclick={() => toggleReplies(comment.id)}
                                            >
                                                {expandedComments[comment.id] ? 'Hide' : 'View'} {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                                            </button>
                                        {/if}
                                    </div>

                                    <div class="comment-footer-right">
                                        {#if user}
                                            <button
                                                class="like-btn {comment.userHasLiked ? 'liked' : ''}"
                                                onclick={() => likeComment(comment.id)}
                                                title={comment.userHasLiked ? 'Unlike' : 'Like'}
                                            >
                                                <Heart class="h-4 w-4" fill={comment.userHasLiked ? 'currentColor' : 'none'} />
                                                {#if comment.likeCount > 0}
                                                    <span class="like-count">{comment.likeCount}</span>
                                                {/if}
                                            </button>
                                            {#if !canEditDelete(comment)}
                                                <button
                                                    class="report-btn"
                                                    onclick={() => reportComment(comment.id)}
                                                    title="Report comment"
                                                >
                                                    <Flag class="h-4 w-4" />
                                                </button>
                                            {/if}
                                        {/if}
                                    </div>
                                </div>

                                <!-- Reply Form -->
                                {#if replyingTo === comment.id}
                                    <div class="reply-form">
                                        <div class="comment-form-header">
                                            <Avatar.Root class="comment-avatar-small">
                                                {#if user.profilePicture?.url}
                                                    <Avatar.Image src={user.profilePicture.url} alt={getDisplayName(user)} />
                                                {:else}
                                                    <Avatar.Fallback class="avatar-fallback-small">
                                                        {getDisplayName(user)[0].toUpperCase()}
                                                    </Avatar.Fallback>
                                                {/if}
                                            </Avatar.Root>
                                            <div class="reply-input-wrapper">
                                                <Textarea
                                                    id="reply-textarea"
                                                    bind:value={replyText}
                                                    placeholder="Write a reply..."
                                                    rows={3}
                                                    disabled={submittingComment}
                                                    class="comment-textarea-modern"
                                                />
                                                <div class="formatting-toolbar">
                                                    <div class="toolbar-buttons">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onclick={() => formatReply('bold')}
                                                            disabled={submittingComment}
                                                            title="Bold"
                                                            class="toolbar-btn"
                                                        >
                                                            <Bold class="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onclick={() => formatReply('italic')}
                                                            disabled={submittingComment}
                                                            title="Italic"
                                                            class="toolbar-btn"
                                                        >
                                                            <Italic class="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onclick={() => formatReply('underline')}
                                                            disabled={submittingComment}
                                                            title="Underline"
                                                            class="toolbar-btn"
                                                        >
                                                            <Underline class="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <div class="reply-form-actions">
                                                        <Button
                                                            onclick={() => submitReply(comment.id)}
                                                            disabled={submittingComment || !replyText.trim()}
                                                            size="sm"
                                                        >
                                                            {submittingComment ? 'Posting...' : 'Post Reply'}
                                                        </Button>
                                                        <Button
                                                            onclick={cancelReply}
                                                            disabled={submittingComment}
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                {/if}

                                <!-- Replies List -->
                                {#if expandedComments[comment.id] && comment.replies}
                                    <div class="replies-list">
                                        {#each comment.replies as reply}
                                            <Card.Root class="reply-card {reply.isPending ? 'pending' : ''} {reply.isDeleting ? 'deleting' : ''} {reply.isEditing ? 'editing' : ''}">
                                                <div class="comment-header">
                                                    <Avatar.Root class="comment-avatar-small">
                                                        {#if getProfilePicture(reply.author)}
                                                            <Avatar.Image
                                                                src={getProfilePicture(reply.author)}
                                                                alt={getDisplayName(reply.author)}
                                                            />
                                                        {:else}
                                                            <Avatar.Fallback class="avatar-fallback-small">
                                                                {getDisplayName(reply.author)[0].toUpperCase()}
                                                            </Avatar.Fallback>
                                                        {/if}
                                                    </Avatar.Root>
                                                    <div class="comment-meta">
                                                        <h4 class="comment-author">
                                                            {getDisplayName(reply.author)}
                                                        </h4>
                                                        <p class="comment-date">
                                                            {formatDate(reply.createdAt)}
                                                            {#if reply.isEdited}
                                                                <span class="edited-badge">(edited)</span>
                                                            {/if}
                                                        </p>
                                                    </div>
                                                    {#if canEditDelete(reply)}
                                                        <div class="comment-actions">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onclick={() => startEdit(reply)}
                                                                title="Edit"
                                                                class="comment-action-btn"
                                                            >
                                                                <Edit2 class="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onclick={() => deleteComment(reply.id, true, comment.id)}
                                                                title="Delete"
                                                                class="comment-action-btn delete-btn"
                                                            >
                                                                <Trash2 class="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    {/if}
                                                </div>

                                                <Separator class="comment-separator" />

                                                <div class="comment-body reply-body">
                                                    {#if editingComment === reply.id}
                                                        <div class="edit-form">
                                                            <Textarea
                                                                id="edit-textarea"
                                                                bind:value={editText}
                                                                rows={2}
                                                                disabled={submittingComment}
                                                                class="comment-textarea-modern"
                                                            />
                                                            <div class="formatting-toolbar edit-toolbar">
                                                                <div class="toolbar-buttons">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onclick={() => formatEdit('bold')}
                                                                        disabled={submittingComment}
                                                                        title="Bold"
                                                                        class="toolbar-btn"
                                                                    >
                                                                        <Bold class="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onclick={() => formatEdit('italic')}
                                                                        disabled={submittingComment}
                                                                        title="Italic"
                                                                        class="toolbar-btn"
                                                                    >
                                                                        <Italic class="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onclick={() => formatEdit('underline')}
                                                                        disabled={submittingComment}
                                                                        title="Underline"
                                                                        class="toolbar-btn"
                                                                    >
                                                                        <Underline class="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                <div class="edit-form-actions">
                                                                    <Button
                                                                        onclick={() => updateComment(reply.id)}
                                                                        disabled={submittingComment || !editText.trim()}
                                                                        size="sm"
                                                                    >
                                                                        {submittingComment ? 'Saving...' : 'Save'}
                                                                    </Button>
                                                                    <Button
                                                                        onclick={cancelEdit}
                                                                        disabled={submittingComment}
                                                                        variant="outline"
                                                                        size="sm"
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    {:else}
                                                        <p class="comment-text">{@html renderCommentText(reply.text)}</p>
                                                    {/if}
                                                </div>

                                                <!-- Reply Footer with Like and Report -->
                                                {#if user}
                                                    <div class="comment-footer reply-footer">
                                                        <div class="comment-footer-right">
                                                            <button
                                                                class="like-btn {reply.userHasLiked ? 'liked' : ''}"
                                                                onclick={() => likeComment(reply.id, true, comment.id)}
                                                                title={reply.userHasLiked ? 'Unlike' : 'Like'}
                                                            >
                                                                <Heart class="h-4 w-4" fill={reply.userHasLiked ? 'currentColor' : 'none'} />
                                                                {#if reply.likeCount > 0}
                                                                    <span class="like-count">{reply.likeCount}</span>
                                                                {/if}
                                                            </button>
                                                            {#if !canEditDelete(reply)}
                                                                <button
                                                                    class="report-btn"
                                                                    onclick={() => reportComment(reply.id)}
                                                                    title="Report comment"
                                                                >
                                                                    <Flag class="h-4 w-4" />
                                                                </button>
                                                            {/if}
                                                        </div>
                                                    </div>
                                                {/if}
                                            </Card.Root>
                                        {/each}
                                    </div>
                                {/if}
                                
                                {#if loadingReplies[comment.id]}
                                    <div class="loading-replies">
                                        <p>Loading replies...</p>
                                    </div>
                                {/if}
                            </Card.Root>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
            {:else}
                <div class="sprite-content-title">Not Found</div>
                <div class="sprite-content-box">
                    <div class="not-found-state">
                        <p>Sprite not found.</p>
                    </div>
                </div>
            {/if}
        </ScrollArea.Root>
    {:else}
        {#if loading}
            <div class="sprite-content-title">Loading Sprite...</div>
            <div class="sprite-content-box">
                <div class="loading-state">
                    <p>Loading sprite details...</p>
                </div>
            </div>
        {:else if error}
            <div class="sprite-content-title">Error</div>
            <div class="sprite-content-box">
                <div class="error-state">
                    <p>{error}</p>
                </div>
            </div>
        {:else if sprite}
            <!-- Header with title -->
            <div class="sprite-viewer-header">
                <div class="sprite-content-title">{sprite.title}</div>
            </div>

            <!-- Sprite Sheet Section -->
            <div class="sprite-sheet-section">
                {#if sprite.image}
                    <div class="sprite-sheet-container">
                        <img
                            src={sprite.image.url}
                            alt={sprite.image.alt || sprite.title}
                            class="sprite-sheet-image"
                            class:loaded={imageLoaded}
                            loading="eager"
                            onclick={openViewer}
                            onload={() => imageLoaded = true}
                        />
                        <button class="sprite-sheet-overlay" onclick={openViewer}>
                            <Eye class="overlay-icon" />
                            <span>Click to view fullscreen</span>
                        </button>
                    </div>
                {:else}
                    <div class="sprite-sheet-container no-image">
                        <p>No image available for this sprite.</p>
                    </div>
                {/if}
            </div>

            <!-- Information Section -->
            <div class="sprite-info-section">
                <div class="sprite-info-title">Information</div>
                <div class="sprite-info-content">
                    <!-- Author Info -->
                    <div class="author-section">
                        <div class="author-avatar">
                            {#if sprite.author?.profilePicture?.url}
                                <img
                                    src={sprite.author.profilePicture.url}
                                    alt={sprite.author.displayName || sprite.author.username}
                                />
                            {:else}
                                <div class="avatar-placeholder">
                                    {(sprite.author?.displayName || sprite.author?.username || 'U')[0].toUpperCase()}
                                </div>
                            {/if}
                        </div>
                        <div class="author-details">
                            <h3 class="author-name">
                                {sprite.author?.displayName || sprite.author?.username || 'Unknown Author'}
                            </h3>
                            <p class="author-meta">
                                Uploaded {formatDate(sprite.createdAt)}
                            </p>
                        </div>
                    </div>

                    <!-- Image Details Grid -->
                    <div class="details-grid">
                        <div class="detail-item">
                            <h4>Dimensions</h4>
                            <p>{sprite.image?.width || 0} × {sprite.image?.height || 0} px</p>
                        </div>
                        <div class="detail-item">
                            <h4>File Size</h4>
                            <p>{sprite.image?.filesize ? formatBytes(sprite.image.filesize) : '0 Bytes'}</p>
                        </div>
                        <div class="detail-item">
                            <h4>Style</h4>
                            <p>{sprite.styleGame?.name || 'Unknown'}</p>
                        </div>
                        <div class="detail-item">
                            <h4>Source</h4>
                            <p>
                                {#if sprite.sourceType === 'game'}
                                    {sprite.sourceGame?.name || 'Unknown'}
                                {:else if sprite.sourceType === 'series'}
                                    {sprite.sourceSeries?.name || 'Unknown'}
                                {:else}
                                    Unknown
                                {/if}
                            </p>
                        </div>
                        <div class="detail-item">
                            <h4>Section</h4>
                            <p>{sprite.section?.name || 'Unknown'}</p>
                        </div>
                        {#if sprite.characters && sprite.characters.length > 0}
                            <div class="detail-item">
                                <h4>Characters</h4>
                                <p>{sprite.characters.map(c => c.name).join(', ')}</p>
                            </div>
                        {/if}
                        <div class="detail-item">
                            <h4>Views</h4>
                            <p>{sprite.views?.toLocaleString() || 0}</p>
                        </div>
                    </div>

                    <!-- Contributors Section -->
                    {#if sprite.contributors && sprite.contributors.length > 0}
                        <div class="contributors-section">
                            <h4>Contributors</h4>
                            <div class="contributors-list">
                                {#each sprite.contributors as contributor}
                                    <div class="contributor-item">
                                        <span>{contributor.displayName || contributor.username || contributor.name || 'Unknown Contributor'}</span>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <!-- Description Section -->
                    {#if sprite.description}
                        <div class="description-section">
                            <h4>Description</h4>
                            <p class="description-text">{sprite.description}</p>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Comments Section -->
            <div class="sprite-comments-section">
                <div class="sprite-comments-title">
                    <MessageSquare class="h-5 w-5" style="display: inline-block; vertical-align: middle; margin-right: 8px;" />
                    Comments ({comments.length})
                </div>
                <div class="sprite-comments-content">
                    <!-- Comment Form -->
                    {#if user}
                        <Card.Root class="comment-form-card">
                            <div class="comment-form-header">
                                <Avatar.Root class="comment-avatar">
                                    {#if user.profilePicture?.url}
                                        <Avatar.Image src={user.profilePicture.url} alt={getDisplayName(user)} />
                                    {:else}
                                        <Avatar.Fallback class="avatar-fallback">
                                            {getDisplayName(user)[0].toUpperCase()}
                                        </Avatar.Fallback>
                                    {/if}
                                </Avatar.Root>
                                <div class="comment-input-wrapper">
                                    <Textarea
                                        id="new-comment-textarea-page"
                                        bind:value={newCommentText}
                                        placeholder="Write a comment... Use **bold**, *italic*, or __underline__ for formatting."
                                        rows={4}
                                        disabled={submittingComment}
                                        class="comment-textarea-modern"
                                    />
                                    <div class="formatting-toolbar">
                                        <div class="toolbar-buttons">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onclick={() => formatNewComment('bold')}
                                                disabled={submittingComment}
                                                title="Bold"
                                                class="toolbar-btn"
                                            >
                                                <Bold class="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onclick={() => formatNewComment('italic')}
                                                disabled={submittingComment}
                                                title="Italic"
                                                class="toolbar-btn"
                                            >
                                                <Italic class="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onclick={() => formatNewComment('underline')}
                                                disabled={submittingComment}
                                                title="Underline"
                                                class="toolbar-btn"
                                            >
                                                <Underline class="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <Button
                                            onclick={submitComment}
                                            disabled={submittingComment || !newCommentText.trim()}
                                            size="sm"
                                        >
                                            {submittingComment ? 'Posting...' : 'Post Comment'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card.Root>
                    {:else}
                        <div class="login-prompt">
                            <p>Please <a href="/login">log in</a> to leave a comment.</p>
                        </div>
                    {/if}

                    <!-- Comments List -->
                    {#if commentsLoading}
                        <div class="loading-state">
                            <p>Loading comments...</p>
                        </div>
                    {:else if commentsError}
                        <div class="error-state">
                            <p>Failed to load comments. Please try again.</p>
                        </div>
                    {:else if comments.length === 0}
                        {#if !user}
                            <div class="login-prompt">
                                <p>Please <a href="/login">log in</a> to be the first to comment!</p>
                            </div>
                        {/if}
                    {:else}
                        <div class="comments-list">
                            {#each comments as comment}
                                <Card.Root class="comment-card {comment.isPending ? 'pending' : ''} {comment.isDeleting ? 'deleting' : ''} {comment.isEditing ? 'editing' : ''}">
                                    <div class="comment-header">
                                        <Avatar.Root class="comment-avatar-large">
                                            {#if getProfilePicture(comment.author)}
                                                <Avatar.Image
                                                    src={getProfilePicture(comment.author)}
                                                    alt={getDisplayName(comment.author)}
                                                />
                                            {:else}
                                                <Avatar.Fallback class="avatar-fallback-large">
                                                    {getDisplayName(comment.author)[0].toUpperCase()}
                                                </Avatar.Fallback>
                                            {/if}
                                        </Avatar.Root>
                                        <div class="comment-meta">
                                            <h4 class="comment-author">
                                                {getDisplayName(comment.author)}
                                            </h4>
                                            <p class="comment-date">
                                                {formatDate(comment.createdAt)}
                                                {#if comment.isEdited}
                                                    <span class="edited-badge">(edited)</span>
                                                {/if}
                                            </p>
                                        </div>
                                        {#if canEditDelete(comment)}
                                            <div class="comment-actions">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onclick={() => startEdit(comment)}
                                                    title="Edit"
                                                    class="comment-action-btn"
                                                >
                                                    <Edit2 class="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onclick={() => deleteComment(comment.id)}
                                                    title="Delete"
                                                    class="comment-action-btn delete-btn"
                                                >
                                                    <Trash2 class="h-4 w-4" />
                                                </Button>
                                            </div>
                                        {/if}
                                    </div>

                                    <Separator class="comment-separator" />

                                    <div class="comment-body">
                                        {#if editingComment === comment.id}
                                            <div class="edit-form">
                                                <Textarea
                                                    id="edit-textarea"
                                                    bind:value={editText}
                                                    rows={3}
                                                    disabled={submittingComment}
                                                    class="comment-textarea-modern"
                                                />
                                                <div class="formatting-toolbar edit-toolbar">
                                                    <div class="toolbar-buttons">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onclick={() => formatEdit('bold')}
                                                            disabled={submittingComment}
                                                            title="Bold"
                                                            class="toolbar-btn"
                                                        >
                                                            <Bold class="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onclick={() => formatEdit('italic')}
                                                            disabled={submittingComment}
                                                            title="Italic"
                                                            class="toolbar-btn"
                                                        >
                                                            <Italic class="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onclick={() => formatEdit('underline')}
                                                            disabled={submittingComment}
                                                            title="Underline"
                                                            class="toolbar-btn"
                                                        >
                                                            <Underline class="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <div class="edit-form-actions">
                                                        <Button
                                                            onclick={() => updateComment(comment.id)}
                                                            disabled={submittingComment || !editText.trim()}
                                                            size="sm"
                                                        >
                                                            {submittingComment ? 'Saving...' : 'Save'}
                                                        </Button>
                                                        <Button
                                                            onclick={cancelEdit}
                                                            disabled={submittingComment}
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        {:else}
                                            <p class="comment-text">{@html renderCommentText(comment.text)}</p>
                                        {/if}
                                    </div>

                                    <!-- Reply Button and Count -->
                                    <div class="comment-footer">
                                        <div class="comment-footer-left">
                                            {#if user}
                                                <button
                                                    class="reply-btn"
                                                    onclick={() => startReply(comment.id)}
                                                >
                                                    <Reply class="h-4 w-4" />
                                                    Reply
                                                </button>
                                            {/if}

                                            {#if comment.replyCount > 0}
                                                <button
                                                    class="view-replies-btn"
                                                    onclick={() => toggleReplies(comment.id)}
                                                >
                                                    {expandedComments[comment.id] ? 'Hide' : 'View'} {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                                                </button>
                                            {/if}
                                        </div>

                                        <div class="comment-footer-right">
                                            {#if user}
                                                <button
                                                    class="like-btn {comment.userHasLiked ? 'liked' : ''}"
                                                    onclick={() => likeComment(comment.id)}
                                                    title={comment.userHasLiked ? 'Unlike' : 'Like'}
                                                >
                                                    <Heart class="h-4 w-4" fill={comment.userHasLiked ? 'currentColor' : 'none'} />
                                                    {#if comment.likeCount > 0}
                                                        <span class="like-count">{comment.likeCount}</span>
                                                    {/if}
                                                </button>
                                                {#if !canEditDelete(comment)}
                                                    <button
                                                        class="report-btn"
                                                        onclick={() => reportComment(comment.id)}
                                                        title="Report comment"
                                                    >
                                                        <Flag class="h-4 w-4" />
                                                    </button>
                                                {/if}
                                            {/if}
                                        </div>
                                    </div>

                                    <!-- Reply Form -->
                                    {#if replyingTo === comment.id}
                                        <div class="reply-form">
                                            <div class="comment-form-header">
                                                <Avatar.Root class="comment-avatar-small">
                                                    {#if user.profilePicture?.url}
                                                        <Avatar.Image src={user.profilePicture.url} alt={getDisplayName(user)} />
                                                    {:else}
                                                        <Avatar.Fallback class="avatar-fallback-small">
                                                            {getDisplayName(user)[0].toUpperCase()}
                                                        </Avatar.Fallback>
                                                    {/if}
                                                </Avatar.Root>
                                                <div class="reply-input-wrapper">
                                                    <Textarea
                                                        id="reply-textarea"
                                                        bind:value={replyText}
                                                        placeholder="Write a reply..."
                                                        rows={3}
                                                        disabled={submittingComment}
                                                        class="comment-textarea-modern"
                                                    />
                                                    <div class="formatting-toolbar">
                                                        <div class="toolbar-buttons">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onclick={() => formatReply('bold')}
                                                                disabled={submittingComment}
                                                                title="Bold"
                                                                class="toolbar-btn"
                                                            >
                                                                <Bold class="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onclick={() => formatReply('italic')}
                                                                disabled={submittingComment}
                                                                title="Italic"
                                                                class="toolbar-btn"
                                                            >
                                                                <Italic class="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onclick={() => formatReply('underline')}
                                                                disabled={submittingComment}
                                                                title="Underline"
                                                                class="toolbar-btn"
                                                            >
                                                                <Underline class="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <div class="reply-form-actions">
                                                            <Button
                                                                onclick={() => submitReply(comment.id)}
                                                                disabled={submittingComment || !replyText.trim()}
                                                                size="sm"
                                                            >
                                                                {submittingComment ? 'Posting...' : 'Post Reply'}
                                                            </Button>
                                                            <Button
                                                                onclick={cancelReply}
                                                                disabled={submittingComment}
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    {/if}

                                    <!-- Replies List -->
                                    {#if expandedComments[comment.id] && comment.replies}
                                        <div class="replies-list">
                                            {#each comment.replies as reply}
                                                <Card.Root class="reply-card {reply.isPending ? 'pending' : ''} {reply.isDeleting ? 'deleting' : ''} {reply.isEditing ? 'editing' : ''}">
                                                    <div class="comment-header">
                                                        <Avatar.Root class="comment-avatar-small">
                                                            {#if getProfilePicture(reply.author)}
                                                                <Avatar.Image
                                                                    src={getProfilePicture(reply.author)}
                                                                    alt={getDisplayName(reply.author)}
                                                                />
                                                            {:else}
                                                                <Avatar.Fallback class="avatar-fallback-small">
                                                                    {getDisplayName(reply.author)[0].toUpperCase()}
                                                                </Avatar.Fallback>
                                                            {/if}
                                                        </Avatar.Root>
                                                        <div class="comment-meta">
                                                            <h4 class="comment-author">
                                                                {getDisplayName(reply.author)}
                                                            </h4>
                                                            <p class="comment-date">
                                                                {formatDate(reply.createdAt)}
                                                                {#if reply.isEdited}
                                                                    <span class="edited-badge">(edited)</span>
                                                                {/if}
                                                            </p>
                                                        </div>
                                                        {#if canEditDelete(reply)}
                                                            <div class="comment-actions">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onclick={() => startEdit(reply)}
                                                                    title="Edit"
                                                                    class="comment-action-btn"
                                                                >
                                                                    <Edit2 class="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onclick={() => deleteComment(reply.id, true, comment.id)}
                                                                    title="Delete"
                                                                    class="comment-action-btn delete-btn"
                                                                >
                                                                    <Trash2 class="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        {/if}
                                                    </div>

                                                    <Separator class="comment-separator" />

                                                    <div class="comment-body reply-body">
                                                        {#if editingComment === reply.id}
                                                            <div class="edit-form">
                                                                <Textarea
                                                                    id="edit-textarea"
                                                                    bind:value={editText}
                                                                    rows={2}
                                                                    disabled={submittingComment}
                                                                    class="comment-textarea-modern"
                                                                />
                                                                <div class="formatting-toolbar edit-toolbar">
                                                                    <div class="toolbar-buttons">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onclick={() => formatEdit('bold')}
                                                                            disabled={submittingComment}
                                                                            title="Bold"
                                                                            class="toolbar-btn"
                                                                        >
                                                                            <Bold class="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onclick={() => formatEdit('italic')}
                                                                            disabled={submittingComment}
                                                                            title="Italic"
                                                                            class="toolbar-btn"
                                                                        >
                                                                            <Italic class="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onclick={() => formatEdit('underline')}
                                                                            disabled={submittingComment}
                                                                            title="Underline"
                                                                            class="toolbar-btn"
                                                                        >
                                                                            <Underline class="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <div class="edit-form-actions">
                                                                        <Button
                                                                            onclick={() => updateComment(reply.id)}
                                                                            disabled={submittingComment || !editText.trim()}
                                                                            size="sm"
                                                                        >
                                                                            {submittingComment ? 'Saving...' : 'Save'}
                                                                        </Button>
                                                                        <Button
                                                                            onclick={cancelEdit}
                                                                            disabled={submittingComment}
                                                                            variant="outline"
                                                                            size="sm"
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        {:else}
                                                            <p class="comment-text">{@html renderCommentText(reply.text)}</p>
                                                        {/if}
                                                    </div>

                                                    <!-- Reply Footer with Like and Report -->
                                                    {#if user}
                                                        <div class="comment-footer reply-footer">
                                                            <div class="comment-footer-right">
                                                                <button
                                                                    class="like-btn {reply.userHasLiked ? 'liked' : ''}"
                                                                    onclick={() => likeComment(reply.id, true, comment.id)}
                                                                    title={reply.userHasLiked ? 'Unlike' : 'Like'}
                                                                >
                                                                    <Heart class="h-4 w-4" fill={reply.userHasLiked ? 'currentColor' : 'none'} />
                                                                    {#if reply.likeCount > 0}
                                                                        <span class="like-count">{reply.likeCount}</span>
                                                                    {/if}
                                                                </button>
                                                                {#if !canEditDelete(reply)}
                                                                    <button
                                                                        class="report-btn"
                                                                        onclick={() => reportComment(reply.id)}
                                                                        title="Report comment"
                                                                    >
                                                                        <Flag class="h-4 w-4" />
                                                                    </button>
                                                                {/if}
                                                            </div>
                                                        </div>
                                                    {/if}
                                                </Card.Root>
                                            {/each}
                                        </div>
                                    {/if}

                                    {#if loadingReplies[comment.id]}
                                        <div class="loading-replies">
                                            <p>Loading replies...</p>
                                        </div>
                                    {/if}
                                </Card.Root>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        {:else}
            <div class="sprite-content-title">Not Found</div>
            <div class="sprite-content-box">
                <div class="not-found-state">
                    <p>Sprite not found.</p>
                </div>
            </div>
        {/if}
    {/if}
</div>

{#if viewerOpen && sprite?.image}
    <div class="viewer-modal" onclick={(e) => e.target === e.currentTarget && closeViewer()}>
        <div class="viewer-container">
            <div class="viewer-image-container" onwheel={handleWheel}>
                <div class="image-wrapper">
                    <div class="rotation-container"
                         style="transform: rotate({rotation}deg);">
                        <div class="image-with-grid">
                            <img
                                src={sprite.image.url}
                                alt={sprite.image.alt || sprite.title}
                                class="viewer-image"
                                style="
                                    transform: translate({imagePosition.x}px, {imagePosition.y}px) 
                                              scale({zoom}) 
                                              scaleX({flipHorizontal ? -1 : 1}) 
                                              scaleY({flipVertical ? -1 : 1});
                                    width: {sprite.image.width}px;
                                    height: {sprite.image.height}px;
                                    image-rendering: pixelated;
                                "
                                onmousedown={handleMouseDown}
                                draggable="false"
                                loading="eager"
                            />
                            
                            {#if showGrid && zoom >= 2}
                                <div
                                    class="pixel-grid"
                                    style="
                                        transform: translate({imagePosition.x}px, {imagePosition.y}px) 
                                                  scale({zoom}) 
                                                  scaleX({flipHorizontal ? -1 : 1}) 
                                                  scaleY({flipVertical ? -1 : 1});
                                        width: {sprite.image.width}px;
                                        height: {sprite.image.height}px;
                                        --grid-size: {1 / zoom}px;
                                    "
                                ></div>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="viewer-controls">
                <Button variant="outline" size="sm" onclick={zoomOut} disabled={zoom <= 1}>
                    <ZoomOut class="h-4 w-4" />
                </Button>
                
                <span class="zoom-indicator">{zoom}x</span>
                
                <Button variant="outline" size="sm" onclick={zoomIn} disabled={zoom >= 25}>
                    <ZoomIn class="h-4 w-4" />
                </Button>
                
                <div class="control-separator"></div>
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    onclick={rotateImage}
                >
                    <RotateCw class="h-4 w-4" />
                </Button>
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    onclick={toggleFlipHorizontal}
                    class={flipHorizontal ? 'active' : ''}
                >
                    <FlipHorizontal class="h-4 w-4" />
                </Button>
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    onclick={toggleFlipVertical}
                    class={flipVertical ? 'active' : ''}
                >
                    <FlipVertical class="h-4 w-4" />
                </Button>
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    onclick={toggleGrid}
                    class={showGrid ? 'active' : ''}
                    disabled={zoom < 2}
                >
                    <Grid3x3 class="h-4 w-4" />
                </Button>
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    onclick={downloadImage}
                >
                    <Download class="h-4 w-4" />
                </Button>
                
                <div class="control-separator"></div>
                
                <Button variant="outline" size="sm" onclick={centerImage}>
                    Center
                </Button>
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    class="close-btn"
                    onclick={closeViewer}
                >
                    <X class="h-4 w-4" />
                </Button>
            </div>
        </div>
    </div>
{/if}

<!-- Delete Confirmation Dialog -->
<AlertDialog
    bind:open={deleteDialogOpen}
    title="Delete Comment"
    description="Are you sure you want to delete this comment? This action cannot be undone."
    cancelText="Cancel"
    actionText="Delete"
    variant="destructive"
    themed
    onCancel={() => { pendingDelete = null; }}
    onAction={executeDelete}
/>

<!-- Report Comment Dialog -->
<ReportDialog
    bind:open={reportDialogOpen}
    title="Report Comment"
    themed
    onCancel={() => { pendingReport = null; }}
    onReport={executeReport}
/>

<style>
    /* Container */
    .sprite-viewer-container {
        width: 80%;
        margin: 0 auto;
        padding: 50px 20px;
    }

    .sprite-viewer-container.is-modal {
        width: 100%;
        height: 100%;
        padding: 50px 20px;
    }

    /* Header */
    .sprite-viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
    }

    .sprite-content-title {
        display: block;
        background: color-mix(in srgb, var(--page-color) 60%, black);
        padding: 10px 15px;
        font-family: 'saira';
        font-weight: 800;
        font-size: 18px;
        color: var(--font-color);
        text-shadow:
            calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
            calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
            calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        flex: 1;
    }

    .sprite-modal-close-btn {
        flex-shrink: 0;
        background-color: #dc2626 !important;
        border-color: #dc2626 !important;
        color: white !important;
        padding: 8px 12px;
    }

    .sprite-modal-close-btn:hover {
        background-color: #b91c1c !important;
        border-color: #b91c1c !important;
    }

    /* Sprite Sheet Section */
    .sprite-sheet-section {
        background: var(--page-color);
        border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        padding: 30px;
        margin-bottom: var(--gap);
        box-shadow: var(--box-shadow);
    }

    .sprite-sheet-container {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 200px;
    }

    .sprite-sheet-image {
        max-width: 100%;
        height: auto;
        image-rendering: pixelated;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: -webkit-crisp-edges;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        -ms-interpolation-mode: nearest-neighbor;
        opacity: 0;
        transition: opacity 0.3s ease-in;
        cursor: pointer;
        display: block;
    }

    .sprite-sheet-image.loaded {
        opacity: 1;
    }

    .sprite-sheet-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: color-mix(in srgb, var(--bg-color) 80%, transparent);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.2s ease;
        cursor: pointer;
        border: none;
        color: var(--font-color);
        font-family: 'saira';
        font-weight: 700;
        font-size: 16px;
    }

    .sprite-sheet-container:hover .sprite-sheet-overlay {
        opacity: 1;
    }

    .overlay-icon {
        width: 48px;
        height: 48px;
    }

    /* Information Section */
    .sprite-info-section {
        margin-bottom: var(--gap);
    }

    .sprite-info-title {
        display: block;
        background: color-mix(in srgb, var(--page-color) 60%, black);
        padding: 8px 15px;
        font-family: 'saira';
        font-weight: 800;
        font-size: 18px;
        color: var(--font-color);
        text-shadow:
            calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
            calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
            calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    }

    .sprite-info-content {
        background: var(--page-color);
        padding: 20px;
        border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        box-shadow: var(--box-shadow);
        color: var(--font-color);
    }

    /* Author Section */
    .author-section {
        display: flex;
        align-items: flex-start;
        gap: 15px;
        padding-bottom: 20px;
        margin-bottom: 20px;
        border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
    }

    .author-avatar {
        width: 75px;
        height: 75px;
        flex-shrink: 0;
        image-rendering: auto;
    }

    .author-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        box-shadow: 
            calc(4px * var(--multiply-factor)) calc(4px * var(--multiply-factor)) 0 var(--bg-color);
    }

    .avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: color-mix(in srgb, var(--page-color) 50%, black);
        color: var(--font-color);
        font-family: 'saira';
        font-weight: 800;
        font-size: 32px;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        box-shadow: 
            calc(4px * var(--multiply-factor)) calc(4px * var(--multiply-factor)) 0 var(--bg-color);
    }

    .author-details {
        flex: 1;
    }

    .author-name {
        font-family: 'saira';
        font-weight: 800;
        font-size: 20px;
        color: var(--font-link-color);
        margin-bottom: 4px;
        text-shadow:
            calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
            calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
            calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
    }

    .author-meta {
        font-family: 'saira';
        font-size: 14px;
        color: var(--font-color);
        opacity: 0.8;
    }

    /* Details Grid */
    .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
    }

    .detail-item h4 {
        font-family: 'saira';
        font-weight: 800;
        font-size: 12px;
        text-transform: uppercase;
        color: var(--font-link-color);
        margin-bottom: 4px;
        text-shadow:
            calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
            calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
            calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
    }

    .detail-item p {
        font-family: 'saira';
        font-size: 16px;
        color: var(--font-color);
        font-weight: 600;
    }

    /* Contributors Section */
    .contributors-section {
        margin-bottom: 20px;
        padding-top: 20px;
        border-top: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
    }

    .contributors-section h4 {
        font-family: 'saira';
        font-weight: 800;
        font-size: 14px;
        text-transform: uppercase;
        color: var(--font-link-color);
        margin-bottom: 12px;
        text-shadow:
            calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
            calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
            calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
    }

    .contributors-list {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
    }

    .contributor-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: color-mix(in srgb, var(--page-color) 80%, black);
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
        font-family: 'saira';
        font-size: 14px;
        color: var(--font-color);
    }

    .contributor-avatar,
    .contributor-avatar-placeholder {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
    }

    .contributor-avatar-placeholder {
        display: flex;
        justify-content: center;
        align-items: center;
        background: color-mix(in srgb, var(--page-color) 50%, black);
        color: var(--font-color);
        font-family: 'saira';
        font-weight: 700;
        font-size: 12px;
    }

    /* Description Section */
    .description-section {
        padding-top: 20px;
        border-top: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
    }

    .description-section h4 {
        font-family: 'saira';
        font-weight: 800;
        font-size: 14px;
        text-transform: uppercase;
        color: var(--font-link-color);
        margin-bottom: 12px;
        text-shadow:
            calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
            calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
            calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
    }

    .description-text {
        font-family: 'saira';
        font-size: 14px;
        line-height: 1.6;
        color: var(--font-color);
        white-space: pre-wrap;
    }

    /* Comments Section */
    .sprite-comments-section {
        margin-bottom: var(--gap);
    }

    .sprite-comments-title {
        display: block;
        background: color-mix(in srgb, var(--page-color) 60%, black);
        padding: 8px 15px;
        font-family: 'saira';
        font-weight: 800;
        font-size: 18px;
        color: var(--font-color);
        text-shadow:
            calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
            calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
            calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    }

    .sprite-comments-content {
        background: var(--page-color);
        padding: 20px;
        border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        box-shadow: var(--box-shadow);
    }

    .comment-item {
        padding: 15px;
        margin-bottom: 15px;
        background: color-mix(in srgb, var(--page-color) 90%, black);
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
    }

    .comment-item:last-child {
        margin-bottom: 0;
    }

    .comment-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
    }

    .comment-avatar {
        width: 75px;
        height: 75px;
        flex-shrink: 0;
        image-rendering: auto;
    }

    .comment-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        box-shadow: 
            calc(3px * var(--multiply-factor)) calc(3px * var(--multiply-factor)) 0 var(--bg-color);
    }

    .comment-avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: color-mix(in srgb, var(--page-color) 50%, black);
        color: var(--font-color);
        font-family: 'saira';
        font-weight: 800;
        font-size: 20px;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        box-shadow: 
            calc(3px * var(--multiply-factor)) calc(3px * var(--multiply-factor)) 0 var(--bg-color);
    }

    .comment-meta {
        flex: 1;
    }

    .comment-author {
        font-family: 'saira';
        font-weight: 800;
        font-size: 16px;
        color: var(--font-link-color);
        margin-bottom: 2px;
        text-shadow:
            calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
            calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
            calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
    }

    .comment-date {
        font-family: 'saira';
        font-size: 12px;
        color: var(--font-color);
        opacity: 0.7;
    }

    .comment-body {
        padding-left: 0px;
    }

    .comment-body p {
        font-family: 'saira';
        font-size: 14px;
        line-height: 1.6;
        color: var(--font-color);
        margin: 0;
    }

    .no-comments {
        text-align: center;
        padding: 40px 20px;
        color: var(--font-color);
        opacity: 0.6;
    }

    .no-comments p {
        font-family: 'saira';
        font-size: 14px;
        font-style: italic;
    }

    /* Loading/Error States */
    .loading-state,
    .error-state,
    .not-found-state {
        text-align: center;
        padding: 40px 20px;
        font-family: 'saira';
        font-size: 14px;
        color: var(--font-color);
    }

    .error-state {
        color: #ff4444;
    }

    /* Login Prompt */
    .login-prompt {
        font-family: 'saira';
        font-size: 14px;
        color: var(--font-color);
    }

    .login-prompt a {
        color: var(--font-link-color);
        text-decoration: none;
        font-weight: 700;
        transition: opacity 0.2s ease;
    }

    .login-prompt a:hover {
        opacity: 0.8;
        text-decoration: underline;
    }

    .sprite-content-box {
        background: var(--page-color);
        padding: 20px;
        border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        box-shadow: var(--box-shadow);
    }

    .no-image {
        background-color: color-mix(in srgb, var(--page-color) 90%, white);
        border: 2px dashed color-mix(in srgb, var(--page-color) 70%, white);
        padding: 40px;
        font-style: italic;
        opacity: 0.7;
    }

    /* Fullscreen Viewer Modal */
    .viewer-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.95);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
    }

    .viewer-container {
        width: 90%;
        height: 90vh;
        position: relative;
        background: 
            linear-gradient(to right, white 5px, transparent 5px),
            linear-gradient(to bottom, white 5px, transparent 5px),
            linear-gradient(0deg, #002705 0%, #12a740 100%);
        background-size: 50px 50px, 50px 50px, 100% 100%;
        background-position: 0 0, 0 0, 0 0;
        background-blend-mode: overlay, overlay, normal;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        overflow: hidden;
        animation: gridPan 2s linear infinite;
    }

    @keyframes gridPan {
        0% {
            background-position: 0 0, 0 0, 0 0;
        }
        100% {
            background-position: 50px 0, 0 0, 0 0;
        }
    }

    .viewer-image-container {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        cursor: grab;
        position: relative;
    }

    .viewer-image-container:active {
        cursor: grabbing;
    }

    .image-wrapper {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .rotation-container {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        transform-origin: center center;
        image-rendering: pixelated;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: -webkit-crisp-edges;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        filter: none;
    }

    .image-with-grid {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .viewer-image {
        image-rendering: pixelated;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: -webkit-crisp-edges;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        -ms-interpolation-mode: nearest-neighbor;
        transform-origin: center center;
        user-select: none;
        pointer-events: auto;
        cursor: grab;
        max-width: none;
        filter: drop-shadow(10px 10px 2px rgba(0, 0, 0, .7));
    }

    .viewer-image:active {
        cursor: grabbing;
    }

    .pixel-grid {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        transform-origin: center center;
        background-image: 
            repeating-linear-gradient(
                to right,
                transparent,
                transparent calc(1px - var(--grid-size)),
                rgba(0, 0, 0, 0.5) calc(1px - var(--grid-size)),
                rgba(0, 0, 0, 0.5) 1px
            ),
            repeating-linear-gradient(
                to bottom,
                transparent,
                transparent calc(1px - var(--grid-size)),
                rgba(0, 0, 0, 0.5) calc(1px - var(--grid-size)),
                rgba(0, 0, 0, 0.5) 1px
            );
        background-size: 1px 1px;
        background-position: 0 0;
    }

    .viewer-controls {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 8px;
        background-color: color-mix(in srgb, var(--page-color) 95%, transparent);
        backdrop-filter: blur(8px);
        padding: 10px;
        border-radius: 8px;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        box-shadow: var(--box-shadow);
    }

    .control-separator {
        width: 1px;
        height: 24px;
        background-color: color-mix(in srgb, var(--page-color) 60%, white);
        margin: 0 4px;
    }

    .viewer-controls .active {
        background-color: color-mix(in srgb, var(--page-color) 70%, white);
        color: var(--font-color);
    }

    .viewer-controls .close-btn {
        background-color: #dc2626 !important;
        border-color: #dc2626 !important;
        color: white !important;
    }

    .viewer-controls .close-btn:hover {
        background-color: #b91c1c !important;
        border-color: #b91c1c !important;
    }

    .zoom-indicator {
        font-family: 'saira', monospace;
        font-weight: 600;
        color: var(--font-color);
        min-width: 30px;
        text-align: center;
        font-size: 14px;
    }

    /* New Comment Component Styles */
    :global(.comment-form-card) {
        background: color-mix(in srgb, var(--page-color) 95%, white) !important;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white) !important;
        box-shadow: var(--box-shadow) !important;
        padding: 20px !important;
        margin-bottom: 20px;
        gap: 0 !important;
        border-radius: 0;
    }

    :global(.comment-card) {
        background: color-mix(in srgb, var(--page-color) 95%, white) !important;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white) !important;
        box-shadow: var(--box-shadow) !important;
        padding: 16px !important;
        margin-bottom: 16px;
        gap: 0 !important;
        border-radius: 0;
        transition: opacity 0.3s ease;
    }

    :global(.comment-card.pending) {
        opacity: 0.6;
        position: relative;
    }

    :global(.comment-card.pending::after) {
        content: 'Posting...';
        position: absolute;
        top: 20px;
        right: 95px;
        font-size: 10px;
        color: var(--font-link-color);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 4px 8px;
        background: color-mix(in srgb, var(--font-link-color) 15%, transparent);
        border: 1px solid var(--font-link-color);
        border-radius: 3px;
    }

    :global(.comment-card.deleting) {
        opacity: 0.6;
        position: relative;
    }

    :global(.comment-card.deleting::after) {
        content: 'Deleting...';
        position: absolute;
        top: 20px;
        right: 95px;
        font-size: 10px;
        color: var(--font-link-color);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 4px 8px;
        background: color-mix(in srgb, var(--font-link-color) 15%, transparent);
        border: 1px solid var(--font-link-color);
        border-radius: 3px;
    }

    :global(.comment-card.editing) {
        opacity: 0.6;
        position: relative;
    }

    :global(.comment-card.editing::after) {
        content: 'Editing...';
        position: absolute;
        top: 20px;
        right: 95px;
        font-size: 10px;
        color: var(--font-link-color);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 4px 8px;
        background: color-mix(in srgb, var(--font-link-color) 15%, transparent);
        border: 1px solid var(--font-link-color);
        border-radius: 3px;
    }

    :global(.reply-card) {
        background: color-mix(in srgb, var(--page-color) 90%, white) !important;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 65%, white) !important;
        box-shadow: calc(var(--box-shadow) * 0.5) !important;
        padding: 12px !important;
        margin-bottom: 12px;
        gap: 0 !important;
        border-radius: 0;
        transition: opacity 0.3s ease;
    }

    :global(.reply-card.pending) {
        opacity: 0.6;
        position: relative;
    }

    :global(.reply-card.pending::after) {
        content: 'Posting...';
        position: absolute;
        top: 18px;
        right: 95px;
        font-size: 9px;
        color: var(--font-link-color);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 3px 6px;
        background: color-mix(in srgb, var(--font-link-color) 15%, transparent);
        border: 1px solid var(--font-link-color);
        border-radius: 3px;
    }

    :global(.reply-card.deleting) {
        opacity: 0.6;
        position: relative;
    }

    :global(.reply-card.deleting::after) {
        content: 'Deleting...';
        position: absolute;
        top: 18px;
        right: 95px;
        font-size: 9px;
        color: var(--font-link-color);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 3px 6px;
        background: color-mix(in srgb, var(--font-link-color) 15%, transparent);
        border: 1px solid var(--font-link-color);
        border-radius: 3px;
    }

    :global(.reply-card.editing) {
        opacity: 0.6;
        position: relative;
    }

    :global(.reply-card.editing::after) {
        content: 'Editing...';
        position: absolute;
        top: 18px;
        right: 95px;
        font-size: 9px;
        color: var(--font-link-color);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 3px 6px;
        background: color-mix(in srgb, var(--font-link-color) 15%, transparent);
        border: 1px solid var(--font-link-color);
        border-radius: 3px;
    }

    :global(.comment-avatar) {
        width: 75px !important;
        height: 75px !important;
        flex-shrink: 0;
        image-rendering: auto;
        border-radius: 0;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white) !important;
        box-shadow: calc(3px * var(--multiply-factor)) calc(3px * var(--multiply-factor)) 0 var(--bg-color);
    }

    :global(.comment-avatar-large) {
        width: 75px !important;
        height: 75px !important;
        flex-shrink: 0;
        image-rendering: auto;
        border-radius: 0;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white) !important;
        box-shadow: calc(3px * var(--multiply-factor)) calc(3px * var(--multiply-factor)) 0 var(--bg-color);
    }

    :global(.comment-avatar-small) {
        width: 75px !important;
        height: 75px !important;
        flex-shrink: 0;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white) !important;
        box-shadow: calc(2px * var(--multiply-factor)) calc(2px * var(--multiply-factor)) 0 var(--bg-color);
        border-radius: 0;
        image-rendering: auto;
    }

    :global(.avatar-fallback),
    :global(.avatar-fallback-large),
    :global(.avatar-fallback-small) {
        background: color-mix(in srgb, var(--page-color) 50%, black) !important;
        color: var(--font-color) !important;
        font-family: 'saira' !important;
        font-weight: 800 !important;
        font-size: 28px !important;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0;
    }

    :global(.avatar-fallback-large) {
        font-size: 28px !important;
    }

    :global(.avatar-fallback-small) {
        font-size: 28px !important;
    }

    :global(.comment-textarea-modern) {
        background: color-mix(in srgb, var(--page-color) 85%, black) !important;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white) !important;
        color: var(--font-color) !important;
        font-family: 'saira' !important;
        font-size: 14px !important;
        resize: vertical;
    }

    :global(.comment-textarea-modern:focus) {
        border-color: color-mix(in srgb, var(--font-link-color) 70%, white) !important;
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--font-link-color) 30%, transparent) !important;
    }

    :global(.comment-separator) {
        background: color-mix(in srgb, var(--page-color) 70%, white) !important;
        margin: 12px 0 !important;
    }

    .comment-form-header {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        width: 100%;
    }

    .comment-input-wrapper,
    .reply-input-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .formatting-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .formatting-toolbar.edit-toolbar {
        flex-direction: column;
        align-items: flex-start;
    }

    .toolbar-buttons {
        display: flex;
        gap: 4px;
    }

    :global(.toolbar-btn) {
        background: color-mix(in srgb, var(--page-color) 80%, black) !important;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white) !important;
        color: var(--font-color) !important;
        padding: 6px 8px !important;
    }

    :global(.toolbar-btn:hover) {
        background: color-mix(in srgb, var(--page-color) 70%, black) !important;
        border-color: var(--font-link-color) !important;
    }

    /* Primary action buttons (Post Comment, Post Reply, Save) */
    .formatting-toolbar :global(button[type="button"]:not(.toolbar-btn)) {
        background: color-mix(in srgb, var(--page-color) 80%, black) !important;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white) !important;
        color: var(--font-color) !important;
        font-weight: 600 !important;
    }

    .formatting-toolbar :global(button[type="button"]:not(.toolbar-btn):hover:not(:disabled)) {
        background: color-mix(in srgb, var(--page-color) 70%, black) !important;
        border-color: var(--font-link-color) !important;
    }

    .formatting-toolbar :global(button[type="button"]:not(.toolbar-btn):disabled) {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .comment-text {
        font-family: 'saira';
        font-size: 14px;
        line-height: 1.6;
        color: var(--font-color);
        margin: 0;
        word-wrap: break-word;
    }

    .comment-text :global(strong) {
        font-weight: 800;
        color: var(--font-color);
    }

    .comment-text :global(em) {
        font-style: italic;
        color: var(--font-color);
    }

    .comment-text :global(u) {
        text-decoration: underline;
        text-decoration-color: var(--font-link-color);
    }

    .edit-form-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
    }

    /* Style primary buttons in edit/reply forms */
    .edit-form-actions :global(button:not([variant="outline"])),
    .reply-form-actions :global(button:not([variant="outline"])) {
        background: var(--font-link-color) !important;
        border: 1px solid var(--font-link-color) !important;
        color: var(--bg-color) !important;
        font-weight: 600 !important;
    }

    .edit-form-actions :global(button:not([variant="outline"]):hover:not(:disabled)),
    .reply-form-actions :global(button:not([variant="outline"]):hover:not(:disabled)) {
        background: color-mix(in srgb, var(--font-link-color) 85%, black) !important;
        border-color: color-mix(in srgb, var(--font-link-color) 85%, black) !important;
    }

    .reply-form {
        margin-top: 12px;
        padding: 12px;
        background: color-mix(in srgb, var(--page-color) 85%, black);
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
        border-radius: 0px;
    }

    .reply-form-actions {
        display: flex;
        gap: 8px;
    }

    :global(.comment-action-btn) {
        color: var(--font-color) !important;
        opacity: 0.7;
    }

    :global(.comment-action-btn:hover) {
        opacity: 1;
        color: var(--font-link-color) !important;
    }

    :global(.delete-btn:hover) {
        color: #ff4444 !important;
    }

    .comments-list {
        margin-top: 20px;
    }

    .replies-list {
        margin-top: 12px;
        padding-left: 20px;
        border-left: 3px solid color-mix(in srgb, var(--page-color) 70%, white);
    }

    .comment-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-top: 12px;
        flex-wrap: wrap;
    }

    .comment-footer-left {
        display: flex;
        gap: 12px;
        align-items: center;
    }

    .comment-footer-right {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-left: auto;
    }

    .reply-footer {
        justify-content: flex-end;
    }

    .reply-btn,
    .view-replies-btn {
        background: transparent;
        border: none;
        color: var(--font-link-color);
        font-family: 'saira';
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        padding: 4px 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: opacity 0.2s;
    }

    .reply-btn:hover,
    .view-replies-btn:hover {
        opacity: 0.8;
    }

    .like-btn,
    .report-btn {
        background: transparent;
        border: none;
        color: var(--font-color);
        font-family: 'saira';
        font-size: 13px;
        cursor: pointer;
        padding: 4px 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
        opacity: 0.7;
    }

    .like-btn:hover,
    .report-btn:hover {
        opacity: 1;
    }

    /* UPDATED LIKE COLOR */
    .like-btn.liked {
        color: var(--font-link-color);
        opacity: 1;
    }

    .like-count {
        font-size: 12px;
        font-weight: 600;
    }

    .report-btn:hover {
        color: #ff9900;
    }

    .loading-replies {
        padding: 12px;
        text-align: center;
        color: var(--font-color);
        opacity: 0.7;
        font-family: 'saira';
        font-size: 13px;
    }

    /* Responsive Design */
    @media (max-width: 1200px) {
        .sprite-viewer-container {
            width: 95%;
        }

        .details-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        }
    }

    @media (max-width: 768px) {
        .sprite-viewer-container {
            width: 100%;
            padding: 10px;
        }

        .sprite-viewer-container.is-modal {
            padding: 10px;
        }

        .sprite-content-title {
            font-size: 18px;
            padding: 8px 12px;
        }

        .sprite-sheet-section {
            padding: 15px;
        }

        .author-section {
            flex-direction: column;
            align-items: flex-start;
        }

        .details-grid {
            grid-template-columns: 1fr;
            gap: 10px;
        }

        .comment-body {
            padding-left: 0;
            margin-top: 10px;
        }

        .viewer-controls {
            flex-wrap: wrap;
            max-width: 90%;
            justify-content: center;
        }

        .comment-form-header {
            flex-direction: column;
        }

        :global(.comment-avatar),
        :global(.comment-avatar-large),
        :global(.comment-avatar-small) {
            width: 40px !important;
            height: 40px !important;
        }

        .replies-list {
            padding-left: 10px;
        }

        .formatting-toolbar {
            flex-direction: column;
            align-items: flex-start;
        }

        .toolbar-buttons {
            width: 100%;
            justify-content: flex-start;
        }
    }
</style>