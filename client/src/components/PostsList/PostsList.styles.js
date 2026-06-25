import styled from 'styled-components';
import theme from '../../styles/theme';
import { Badge } from '../ui/styled';

export const PostsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
`;

export const PostCard = styled.article`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  overflow: hidden;
  transition: box-shadow 0.15s;

  &:hover {
    box-shadow: ${theme.shadow};
  }
`;

export const PostImage = styled.div`
  height: 160px;
  background: ${theme.colors.background};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const PostImagePlaceholder = styled.div`
  color: ${theme.colors.textMuted};
  font-size: 0.8125rem;
  text-align: center;
  padding: 1rem;
`;

export const PostBody = styled.div`
  padding: 1rem;
`;

export const PostMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

export const PostCategory = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  color: ${theme.colors.primary};
`;

export const PostMetaTags = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
`;

export const PostProgramme = styled.span`
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.primaryLight};
  color: ${theme.colors.primary};
`;

export const PostUrl = styled.a`
  display: block;
  font-size: 0.8125rem;
  color: ${theme.colors.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.5rem;

  &:hover {
    color: ${theme.colors.primary};
  }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: ${theme.colors.textMuted};

  h3 {
    font-size: 1rem;
    color: ${theme.colors.text};
    margin-bottom: 0.5rem;
  }
`;

export const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${theme.colors.textMuted};
`;

export { Badge };
