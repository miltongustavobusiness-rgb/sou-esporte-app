import { useState, useCallback, useEffect } from 'react';
import api, { Post, Comment } from '../services/api';
import { useApp } from '../contexts/AppContext';
// Mock data removed - using real API only

export interface FeedState {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
}

export function useFeed(groupId?: number) {
  const { user } = useApp();
  const [state, setState] = useState<FeedState>({
    posts: [],
    loading: true,
    refreshing: false,
    error: null,
    hasMore: true,
  });
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Fetch posts from API
  const fetchPosts = useCallback(async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset;
      
      setState(prev => ({
        ...prev,
        loading: reset ? true : prev.loading,
        refreshing: reset ? true : false,
      }));

      const posts = await api.getFeed({
        groupId,
        limit,
        offset: currentOffset,
      });

      setState(prev => ({
        ...prev,
        posts: reset ? posts : [...prev.posts, ...posts],
        loading: false,
        refreshing: false,
        error: null,
        hasMore: posts.length === limit,
      }));

      if (reset) {
        setOffset(limit);
      } else {
        setOffset(currentOffset + limit);
      }
    } catch (error: any) {
      console.error('[useFeed] Error fetching posts:', error);
      
      // Show error to user
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: error.message || 'Erro ao carregar feed',
        hasMore: false,
      }));
    }
  }, [groupId, offset, limit]);

  // Initial load
  useEffect(() => {
    fetchPosts(true);
  }, [groupId]);

  // Refresh
  const refresh = useCallback(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  // Load more
  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      fetchPosts(false);
    }
  }, [state.loading, state.hasMore, fetchPosts]);

  // Like/Unlike post
  const toggleLike = useCallback(async (postId: number) => {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    setState(prev => ({
      ...prev,
      posts: prev.posts.map(p => {
        if (p.id === postId) {
          const newLikesCount = p.isLiked ? p.likesCount - 1 : p.likesCount + 1;
          const newReactions = { ...p.reactions };
          if (p.isLiked) {
            newReactions.like = Math.max(0, (newReactions.like || 0) - 1);
          } else {
            newReactions.like = (newReactions.like || 0) + 1;
          }
          return {
            ...p,
            isLiked: !p.isLiked,
            likesCount: newLikesCount,
            reactions: newReactions,
          };
        }
        return p;
      }),
    }));

    // API call
    try {
      if (post.isLiked) {
        await api.unlikePost(postId, user?.id);
      } else {
        await api.likePost(postId, 'like', user?.id);
      }
    } catch (error) {
      console.error('[useFeed] Error toggling like:', error);
      // Revert on error
      setState(prev => ({
        ...prev,
        posts: prev.posts.map(p => {
          if (p.id === postId) {
            return post; // Revert to original
          }
          return p;
        }),
      }));
    }
  }, [state.posts, user?.id]);

  // Delete post
  const deletePost = useCallback(async (postId: number) => {
    try {
      const result = await api.deletePost(postId);
      if (result.success) {
        setState(prev => ({
          ...prev,
          posts: prev.posts.filter(p => p.id !== postId),
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useFeed] Error deleting post:', error);
      return false;
    }
  }, []);

  // Create post
  const createPost = useCallback(async (data: {
    content?: string;
    groupId?: number;
    type?: 'text' | 'photo' | 'activity';
    imageUrl?: string;
    activityData?: any;
  }) => {
    try {
      const result = await api.createPost(data);
      if (result.success) {
        // Refresh to get the new post
        fetchPosts(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useFeed] Error creating post:', error);
      return false;
    }
  }, [fetchPosts]);

  // Save/Unsave post
  const toggleSave = useCallback(async (postId: number) => {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    setState(prev => ({
      ...prev,
      posts: prev.posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isSaved: !p.isSaved,
          };
        }
        return p;
      }),
    }));

    // API call
    try {
      if (post.isSaved) {
        await api.unsavePost(postId);
      } else {
        await api.savePost(postId);
      }
    } catch (error) {
      console.error('[useFeed] Error toggling save:', error);
      // Revert on error
      setState(prev => ({
        ...prev,
        posts: prev.posts.map(p => {
          if (p.id === postId) {
            return post; // Revert to original
          }
          return p;
        }),
      }));
    }
  }, [state.posts]);

  // Share post (increment counter)
  const sharePost = useCallback(async (postId: number) => {
    try {
      await api.sharePost(postId);
      // Update local state
      setState(prev => ({
        ...prev,
        posts: prev.posts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              sharesCount: (p.sharesCount || 0) + 1,
            };
          }
          return p;
        }),
      }));
      return true;
    } catch (error) {
      console.error('[useFeed] Error sharing post:', error);
      return false;
    }
  }, []);

  return {
    ...state,
    refresh,
    loadMore,
    toggleLike,
    toggleSave,
    sharePost,
    deletePost,
    createPost,
  };
}

// Hook for comments
export function useComments(postId: number) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getComments(postId);
      setComments(result);
      setError(null);
    } catch (err: any) {
      console.error('[useComments] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(async (content: string, parentId?: number) => {
    try {
      const result = await api.createComment({ postId, content, parentId });
      if (result.success) {
        fetchComments();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useComments] Error adding comment:', error);
      return false;
    }
  }, [postId, fetchComments]);

  const deleteComment = useCallback(async (commentId: number) => {
    try {
      const result = await api.deleteComment(commentId);
      if (result.success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useComments] Error deleting comment:', error);
      return false;
    }
  }, []);

  const toggleLikeComment = useCallback(async (commentId: number) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    // Optimistic update
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          isLiked: !c.isLiked,
          likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1,
        };
      }
      return c;
    }));

    try {
      if (comment.isLiked) {
        await api.unlikeComment(commentId);
      } else {
        await api.likeComment(commentId);
      }
    } catch (error) {
      console.error('[useComments] Error toggling like:', error);
      // Revert
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return comment;
        }
        return c;
      }));
    }
  }, [comments]);

  return {
    comments,
    loading,
    error,
    refresh: fetchComments,
    addComment,
    deleteComment,
    toggleLikeComment,
  };
}

// Hook for reporting content
export function useReport() {
  const [loading, setLoading] = useState(false);

  const reportContent = useCallback(async (data: {
    targetType: 'post' | 'comment' | 'user' | 'group';
    targetId: number;
    reason: 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'nudity' | 'false_information' | 'copyright' | 'other';
    description?: string;
  }) => {
    try {
      setLoading(true);
      const result = await api.reportContent(data);
      return result.success;
    } catch (error) {
      console.error('[useReport] Error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    reportContent,
  };
}
