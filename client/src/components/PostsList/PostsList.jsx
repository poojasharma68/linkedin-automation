import { useState } from 'react';
import { useGetAllPostsQuery, useDeletePostMutation, useRetryPostMutation } from '../../store/api';
import getApiErrorMessage from '../../utils/getApiError';
import { ALL_PROGRAMMES, getProgrammeLabel } from '../../constants/programmes';
import { Card, CardTitle, CardSubtitle } from '../ui/styled';
import styled from 'styled-components';
import theme from '../../styles/theme';
import {
  PostsGrid,
  PostCard,
  PostImage,
  PostImagePlaceholder,
  PostBody,
  PostMeta,
  PostMetaTags,
  PostCategory,
  PostProgramme,
  PostUrl,
  EmptyState,
  LoadingState,
  Badge,
} from './PostsList.styles';

const ErrorText = styled.p`
  font-size: 0.75rem;
  color: ${theme.colors.error};
  margin-top: 0.5rem;
  line-height: 1.4;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
`;

const ActionBtn = styled.button`
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: ${theme.radius.sm};
  cursor: pointer;
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.surface};

  &:hover {
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};
  }

  &.delete:hover {
    border-color: ${theme.colors.error};
    color: ${theme.colors.error};
  }
`;

function PostsList({ activeCategory, activeProgramme }) {
  // No polling: the list re-fetches on its own when a post is processed,
  // retried, or deleted (RTK Query 'Posts' tag invalidation). Use the Refresh
  // button below for an on-demand reload.
  const { data, isLoading, isError, error, isFetching, refetch } = useGetAllPostsQuery({
    category: activeCategory,
    programme: activeProgramme,
  });
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const [retryPost, { isLoading: isRetrying }] = useRetryPostMutation();
  const [actionId, setActionId] = useState(null);

  const posts = data?.data || [];

  const handleDelete = async (post) => {
    const postId = post.id || post._id;
    if (!postId) {
      alert('Post ID is missing. Refresh the page and try again.');
      return;
    }

    if (!window.confirm('Delete this post? You can add the same URL again after.')) return;

    setActionId(postId);
    try {
      await deletePost(postId).unwrap();
      refetch();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to delete post'));
    } finally {
      setActionId(null);
    }
  };

  const handleRetry = async (post) => {
    const postId = post.id || post._id;
    if (!postId) {
      alert('Post ID is missing. Refresh the page and try again.');
      return;
    }

    setActionId(postId);
    try {
      await retryPost(postId).unwrap();
      refetch();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to retry post'));
    } finally {
      setActionId(null);
    }
  };

  return (
    <Card>
      <TitleRow>
        <CardTitle>Posts {isFetching && !isLoading ? '(updating...)' : ''}</CardTitle>
        <ActionBtn type="button" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </ActionBtn>
      </TitleRow>
      <CardSubtitle>
        {activeCategory === 'all' ? 'All categories' : `Category: ${activeCategory}`}
        {' · '}
        {!activeProgramme || activeProgramme === ALL_PROGRAMMES
          ? 'All programmes'
          : `Programme: ${getProgrammeLabel(activeProgramme)}`}
        {' · '}
        {posts.length} post{posts.length !== 1 ? 's' : ''}
      </CardSubtitle>

      {isLoading && <LoadingState>Loading posts...</LoadingState>}

      {isError && (
        <EmptyState>
          <h3>Failed to load posts</h3>
          <p>{error?.data?.message || 'Something went wrong'}</p>
        </EmptyState>
      )}

      {!isLoading && !isError && posts.length === 0 && (
        <EmptyState>
          <h3>No posts yet</h3>
          <p>Select a category, paste LinkedIn URLs, and click Process.</p>
        </EmptyState>
      )}

      {!isLoading && posts.length > 0 && (
        <PostsGrid>
          {posts.map((post) => (
            <PostCard key={post.id}>
              <PostImage>
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="LinkedIn post screenshot" />
                ) : (
                  <PostImagePlaceholder>
                    {post.status === 'Pending'
                      ? 'Queued...'
                      : post.status === 'Processing'
                        ? 'Capturing screenshot...'
                        : 'No screenshot'}
                  </PostImagePlaceholder>
                )}
              </PostImage>
              <PostBody>
                <PostMeta>
                  <PostMetaTags>
                    <PostCategory>{post.category}</PostCategory>
                    {post.programme && (
                      <PostProgramme>{getProgrammeLabel(post.programme)}</PostProgramme>
                    )}
                  </PostMetaTags>
                  <Badge $status={post.status}>{post.status}</Badge>
                </PostMeta>
                <PostUrl href={post.linkedinUrl} target="_blank" rel="noopener noreferrer">
                  {post.linkedinUrl}
                </PostUrl>
                {post.status === 'Failed' && post.errorMessage && (
                  <ErrorText>{post.errorMessage}</ErrorText>
                )}
                <ActionRow>
                  {(post.status === 'Failed' ||
                    post.status === 'Processing' ||
                    post.status === 'Completed') && (
                    <ActionBtn
                      type="button"
                      onClick={() => handleRetry(post)}
                      disabled={isRetrying || isDeleting}
                    >
                      {actionId === (post.id || post._id) && isRetrying ? 'Retrying...' : 'Retry'}
                    </ActionBtn>
                  )}
                  <ActionBtn
                    type="button"
                    className="delete"
                    onClick={() => handleDelete(post)}
                    disabled={isRetrying || isDeleting}
                  >
                    {actionId === (post.id || post._id) && isDeleting ? 'Deleting...' : 'Delete'}
                  </ActionBtn>
                </ActionRow>
              </PostBody>
            </PostCard>
          ))}
        </PostsGrid>
      )}
    </Card>
  );
}

export default PostsList;
