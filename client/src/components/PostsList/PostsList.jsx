import { useGetAllPostsQuery } from '../../store/api';
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

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

const RefreshButton = styled.button`
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
`;

function PostsList({ activeCategory, activeProgramme }) {
  const { data, isLoading, isError, error, isFetching, refetch } = useGetAllPostsQuery({
    category: activeCategory,
    programme: activeProgramme,
  });

  const posts = data?.data || [];

  return (
    <Card>
      <TitleRow>
        <CardTitle>Posts {isFetching && !isLoading ? '(updating...)' : ''}</CardTitle>
        <RefreshButton type="button" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </RefreshButton>
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
                  <PostImagePlaceholder>No screenshot</PostImagePlaceholder>
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
              </PostBody>
            </PostCard>
          ))}
        </PostsGrid>
      )}
    </Card>
  );
}

export default PostsList;
