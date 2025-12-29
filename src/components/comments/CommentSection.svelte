<script>
  // Import Svelte utilities
  import { untrack } from 'svelte';

  // Import shadcn components
  import { AlertDialog } from '$lib/components';
  import ReportDialog from '$lib/components/ui/layout/ReportDialog.svelte';

  // Import Lucide icons
  import { MessageSquare } from 'lucide-svelte';

  // Import child components
  import Comment from './Comment.svelte';
  import CommentForm from './CommentForm.svelte';

  // Import toast notifications
  import { toast } from 'svelte-sonner';

  // Props
  let {
    spriteId,
    user = null
  } = $props();

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

  // --- LIKES PERSISTENCE LOGIC ---

  // Helper to get IDs from a list of comments (including nested replies)
  function getCommentIds(list) {
    if (!list || !Array.isArray(list)) return [];
    const ids = [];
    for (const c of list) {
      if (c.id) ids.push(c.id);
      // Also get reply IDs if they exist
      if (c.replies && Array.isArray(c.replies)) {
        for (const r of c.replies) {
          if (r.id) ids.push(r.id);
        }
      }
    }
    return ids;
  }

  // Check if current user has liked the loaded comments
  async function checkLikesForComments(commentsToCheck) {
    if (!user || !commentsToCheck || commentsToCheck.length === 0) return;

    const ids = getCommentIds(commentsToCheck);
    if (ids.length === 0) return;

    try {
      // Query all comment likes for this user
      // Note: Payload doesn't support querying nested polymorphic fields with [in] operator
      // So we fetch all comment likes for the user and filter client-side
      const url = `${API_BASE_URL}/likes?where[user][equals]=${user.id}&limit=1000&depth=0`;

      const response = await fetch(url, { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();

        // Create a Set of comment IDs that the user has liked
        // Filter to only include comments (not other liked items) and only the IDs we're checking
        const idsSet = new Set(ids);
        const likedCommentIds = new Set(
          data.docs
            .filter(like => {
              // Only include likes for comments
              if (like.likedItem?.relationTo !== 'comments') return false;
              // Extract the comment ID
              const commentId = typeof like.likedItem.value === 'object' ? like.likedItem.value.id : like.likedItem.value;
              // Only include if it's one of the comments we're checking
              return idsSet.has(commentId);
            })
            .map(like => {
              return typeof like.likedItem.value === 'object' ? like.likedItem.value.id : like.likedItem.value;
            })
        );

        // Update comments state to set userHasLiked property
        comments = comments.map(c => {
          let updatedC = { ...c };

          // Check top-level comment - explicitly set true or false
          updatedC.userHasLiked = likedCommentIds.has(c.id);

          // Check replies if they exist within this comment structure
          if (c.replies && Array.isArray(c.replies)) {
            updatedC.replies = c.replies.map(r => ({
              ...r,
              userHasLiked: likedCommentIds.has(r.id)
            }));
          }
          return updatedC;
        });
      } else {
        const errorText = await response.text();
        console.error('[checkLikesForComments] API Error:', response.status, response.statusText, errorText);
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
      await checkLikesForComments(comments);

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

      // Matches Step 2 of Ideal API Flow: Replies to specific parent
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[loadReplies] Error response body:', errorText);
        throw new Error('Failed to load replies');
      }

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[loadReplies] Failed to parse response as JSON:', e);
        throw new Error('Invalid response from server');
      }

      const loadedReplies = data.docs || [];

      // Update the specific comment with its replies
      comments = comments.map(comment => {
        if (comment.id === parentCommentId) {
          return { ...comment, replies: loadedReplies };
        }
        return comment;
      });

      expandedComments = { ...expandedComments, [parentCommentId]: true };

      // Check if user liked any of these replies
      if (user && loadedReplies.length > 0) {
        const replyIds = loadedReplies.map(r => r.id).filter(Boolean);
        if (replyIds.length > 0) {
          try {
            // Query all comment likes for this user and filter client-side
            const likesResponse = await fetch(
              `${API_BASE_URL}/likes?where[user][equals]=${user.id}&limit=1000&depth=0`,
              { credentials: 'include' }
            );
            if (likesResponse.ok) {
              const likesData = await likesResponse.json();
              const replyIdsSet = new Set(replyIds);
              const likedReplyIds = new Set(
                likesData.docs
                  .filter(like => {
                    if (like.likedItem?.relationTo !== 'comments') return false;
                    const commentId = typeof like.likedItem.value === 'object' ? like.likedItem.value.id : like.likedItem.value;
                    return replyIdsSet.has(commentId);
                  })
                  .map(like => {
                    return typeof like.likedItem.value === 'object' ? like.likedItem.value.id : like.likedItem.value;
                  })
              );

              // Update replies with like status - explicitly set true or false
              comments = comments.map(comment => {
                if (comment.id === parentCommentId && comment.replies) {
                  return {
                    ...comment,
                    replies: comment.replies.map(r => ({
                      ...r,
                      userHasLiked: likedReplyIds.has(r.id)
                    }))
                  };
                }
                return comment;
              });
            }
          } catch (e) {
            console.error("Failed to check likes for replies:", e);
          }
        }
      }

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
    if (!user) {
      toast.error('Please log in to comment');
      return;
    }
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
      replyCount: 0,
      isPending: true, // Flag to show pending state
    };

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

      const response = await fetch(`${API_BASE_URL}/comments?depth=2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

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

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('[submitComment] Failed to parse success response as JSON:', e);
        throw new Error('Invalid response from server');
      }

      // Handle case where Payload wraps response in { doc: ... } or returns doc directly
      const newComment = responseData.doc || responseData;

      // Ensure author is fully populated - preserve from optimistic if needed
      if (!newComment.author || typeof newComment.author === 'string' || typeof newComment.author === 'number') {
        newComment.author = user;
      }

      // Replace optimistic comment with real one from server
      comments = comments.map(c => c.id === tempId ? { ...newComment, replies: [], replyCount: 0 } : c);

    } catch (err) {
      console.error('[submitComment] Error:', err);
      console.error('[submitComment] Error stack:', err instanceof Error ? err.stack : 'N/A');

      // ROLLBACK: Remove the optimistic comment on error
      comments = comments.filter(c => c.id !== tempId);

      // Restore the text so user doesn't lose their comment
      newCommentText = commentText;

      toast.error('Failed to post comment', {
        description: err instanceof Error ? err.message : String(err)
      });
    } finally {
      submittingComment = false;
    }
  }

  async function submitReply(parentCommentId) {
    if (!user) {
      toast.error('Please log in to reply');
      return;
    }
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

      const response = await fetch(`${API_BASE_URL}/comments?depth=2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

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

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('[submitReply] Failed to parse success response as JSON:', e);
        throw new Error('Invalid response from server');
      }

      const newReply = responseData.doc || responseData;

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

      toast.error('Failed to post reply', {
        description: err instanceof Error ? err.message : String(err)
      });
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

    // OPTIMISTIC UPDATE: Immediately update the text and mark as editing (shows "Updating..." overlay)
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
      const response = await fetch(`${API_BASE_URL}/comments/${commentId}?depth=2`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          text: newText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[updateComment] API Error Response:', errorData);
        throw new Error(errorData.message || `Failed to update comment (${response.status})`);
      }

      const responseData = await response.json();

      // Handle Payload's response format
      const updatedComment = responseData.doc || responseData;

      // Ensure author is fully populated - preserve from local state if needed
      if (!updatedComment.author || typeof updatedComment.author === 'string' || typeof updatedComment.author === 'number') {
        // Find the original comment to get the author
        const originalComment = comments.find(c => c.id === commentId) ||
          comments.flatMap(c => c.replies || []).find(r => r.id === commentId);
        if (originalComment?.author) {
          updatedComment.author = originalComment.author;
        }
      }

      // Replace with server response and remove isEditing flag
      comments = comments.map(comment => {
        if (comment.id === commentId) {
          // Preserve replies and other local state
          return {
            ...updatedComment,
            isEditing: false,
            replies: comment.replies,
            replyCount: comment.replyCount,
            userHasLiked: comment.userHasLiked
          };
        }
        // Also check replies
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply =>
              reply.id === commentId
                ? { ...updatedComment, isEditing: false, userHasLiked: reply.userHasLiked }
                : reply
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
      toast.error('Failed to update comment', {
        description: err instanceof Error ? err.message : String(err)
      });
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

    // OPTIMISTIC UPDATE: Immediately mark comment as deleting (shows "Deleting..." overlay)
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
      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

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
      toast.error('Failed to delete comment', {
        description: err instanceof Error ? err.message : String(err)
      });
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

  // Like/Unlike a comment with optimistic UI updates
  async function likeComment(commentId, isReply = false, parentCommentId = null) {
    if (!user) {
      toast.error('Please log in to like comments');
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

    // Store previous state for potential rollback (use JSON for better browser compatibility)
    const previousComments = JSON.parse(JSON.stringify(comments));

    // Determine the optimistic update
    const wasLiked = currentComment.userHasLiked || false;
    const newLikeStatus = !wasLiked;
    const likeChange = newLikeStatus ? 1 : -1;

    // OPTIMISTIC UPDATE: Immediately update UI before API call
    if (isReply && parentCommentId) {
      comments = comments.map(c => {
        if (c.id === parentCommentId && c.replies) {
          return {
            ...c,
            replies: c.replies.map(r =>
              r.id === commentId
                ? { ...r, likeCount: Math.max(0, (r.likeCount || 0) + likeChange), userHasLiked: newLikeStatus }
                : r
            )
          };
        }
        return c;
      });
    } else {
      comments = comments.map(c =>
        c.id === commentId
          ? { ...c, likeCount: Math.max(0, (c.likeCount || 0) + likeChange), userHasLiked: newLikeStatus }
          : c
      );
    }

    // Now perform the actual API call in the background
    try {
      // Check current server status to determine what action to take
      // Query all likes for this user and filter client-side
      const checkResponse = await fetch(
        `${API_BASE_URL}/likes?where[user][equals]=${user.id}&limit=1000&depth=0`,
        { credentials: 'include' }
      );

      if (!checkResponse.ok) {
        throw new Error(`Failed to check like status: ${checkResponse.status} ${checkResponse.statusText}`);
      }

      const checkData = await checkResponse.json();

      // Find if this specific comment is liked
      const existingLike = checkData.docs.find(like => {
        if (like.likedItem?.relationTo !== 'comments') return false;
        const likedCommentId = typeof like.likedItem.value === 'object' ? like.likedItem.value.id : like.likedItem.value;
        return likedCommentId === commentId;
      });

      const isLikedOnServer = !!existingLike;

      // Perform the action that matches our optimistic update
      if (newLikeStatus && !isLikedOnServer) {
        // We want to like it and it's not liked on server - POST
        const response = await fetch(`${API_BASE_URL}/likes`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: user.id,
            likedItem: {
              relationTo: 'comments',
              value: commentId
            }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`Failed to like comment: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
        }

      } else if (!newLikeStatus && isLikedOnServer) {
        // We want to unlike it and it's liked on server - DELETE
        const likeId = existingLike.id;
        const response = await fetch(`${API_BASE_URL}/likes/${likeId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`Failed to unlike comment: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
        }

      } else if (newLikeStatus && isLikedOnServer) {
        // Server already shows it as liked - local state was out of sync
        // Keep the optimistic update (no API call needed, state is now correct)

      } else if (!newLikeStatus && !isLikedOnServer) {
        // Server already shows it as not liked - local state was out of sync
        // Keep the optimistic update (no API call needed, state is now correct)
      }

    } catch (err) {
      // ROLLBACK: Revert to previous state on error
      comments = previousComments;

      console.error('Error toggling like:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to ${newLikeStatus ? 'like' : 'unlike'} comment`, {
        description: errorMessage
      });
    }
  }

  function reportComment(commentId) {
    if (!user) {
      toast.error('Please log in to report');
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

      const response = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

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

      await response.text();
      toast.success('Comment reported successfully', {
        description: 'Thank you for helping keep our community safe.'
      });

    } catch (err) {
      console.error('[executeReport] Error:', err);
      console.error('[executeReport] Error stack:', err instanceof Error ? err.stack : 'N/A');
      toast.error('Failed to report comment', {
        description: err instanceof Error ? err.message : String(err)
      });
    }
  }

  // Load comments when component mounts or spriteId changes
  $effect(() => {
    if (spriteId) {
      loadComments();
    }
  });

  // Track previous user to detect when user becomes available
  let previousUser = $state(user);

  // Re-check likes when user changes (e.g., user logs in or auth loads)
  $effect(() => {
    // Track user dependency only
    const currentUser = user;

    // Only re-check likes if user changed from null/undefined to a user object
    // This prevents re-checking on every comment update
    if (currentUser && !previousUser) {
      // Use untrack to access comments without creating a reactive dependency
      const currentComments = untrack(() => comments);
      if (currentComments.length > 0) {
        checkLikesForComments(currentComments);
      }
    }

    previousUser = currentUser;
  });
</script>

<div class="sprite-comments-section">
  <div class="sprite-comments-title">
    <MessageSquare class="h-5 w-5" style="display: inline-block; vertical-align: middle; margin-right: 8px;" />
    Comments ({comments.length})
  </div>
  <div class="sprite-comments-content">
    <!-- Comment Form -->
    {#if user}
      <CommentForm
        bind:value={newCommentText}
        onSubmit={submitComment}
        isSubmitting={submittingComment}
        {user}
        textareaId="new-comment-textarea"
      />
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
    {:else}
      <div class="comments-list">
        {#each comments as comment (comment.id)}
          <Comment
            {comment}
            {user}
            onEdit={startEdit}
            onDelete={deleteComment}
            onLike={likeComment}
            onReport={reportComment}
            onReply={startReply}
            onToggleReplies={toggleReplies}
            onSubmitReply={submitReply}
            onUpdateComment={updateComment}
            onCancelReply={cancelReply}
            onCancelEdit={cancelEdit}
            expanded={expandedComments[comment.id]}
            loadingReplies={loadingReplies[comment.id]}
            {replyingTo}
            bind:replyText
            {editingComment}
            bind:editText
            {submittingComment}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>

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
