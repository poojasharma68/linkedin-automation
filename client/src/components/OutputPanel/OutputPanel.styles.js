import styled from 'styled-components';
import theme from '../../styles/theme';

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

export const Groups = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

export const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

export const GroupTitle = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: ${theme.colors.textMuted};
`;

export const GroupCount = styled.span`
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  color: ${theme.colors.textMuted};
  margin-left: 0.5rem;
`;

export const Code = styled.pre`
  margin: 0;
  padding: 0.875rem 1rem;
  border-radius: ${theme.radius.sm};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.sidebar};
  color: ${theme.colors.sidebarText};
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  line-height: 1.65;
  overflow-x: auto;
  max-height: 380px;
  overflow-y: auto;
  white-space: pre;
  tab-size: 4;
`;

export const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${theme.colors.border};
  margin: 1.5rem 0 1.25rem;
`;

export const SectionLabel = styled.h3`
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: ${theme.colors.textMuted};
  margin-bottom: 0.75rem;
`;

export const CaptureList = styled.div`
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  overflow: hidden;
`;

export const CaptureRow = styled.div`
  display: flex;
  gap: 0.875rem;
  padding: 0.75rem 0.875rem;
  border-bottom: 1px solid ${theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

export const CaptureThumb = styled.a`
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: ${theme.radius.sm};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.background};
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
    display: block;
  }
`;

export const CaptureDetails = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

export const CaptureTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

export const CaptureSourceUrl = styled.a`
  flex: 1;
  min-width: 0;
  font-size: 0.75rem;
  color: ${theme.colors.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    color: ${theme.colors.primary};
  }
`;

export const CaptureError = styled.p`
  font-size: 0.75rem;
  color: ${theme.colors.error};
  margin: 0;
`;

export const EmptyState = styled.div`
  padding: 2.5rem 1rem;
  text-align: center;
  color: ${theme.colors.textMuted};

  h3 {
    font-size: 0.9375rem;
    font-weight: 600;
    color: ${theme.colors.text};
    margin-bottom: 0.375rem;
  }

  p {
    font-size: 0.8125rem;
  }
`;
