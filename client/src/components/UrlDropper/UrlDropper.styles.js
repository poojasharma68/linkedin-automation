import styled from 'styled-components';
import theme from '../../styles/theme';

export const SessionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: ${theme.radius.sm};
  background: ${({ $loggedIn }) => ($loggedIn ? theme.colors.successBg : theme.colors.warningBg)};
  border: 1px solid ${({ $loggedIn }) => ($loggedIn ? theme.colors.success : theme.colors.warning)};
`;

export const SessionText = styled.p`
  font-size: 0.875rem;
  color: ${theme.colors.text};
  margin: 0;
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 170px;
  padding: 0.75rem 0.875rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.sm};
  font-size: 0.8125rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  resize: vertical;
  line-height: 1.7;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primaryLight};
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
    font-family: inherit;
  }
`;

export const FooterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
`;

export const UrlCount = styled.p`
  font-size: 0.8125rem;
  color: ${theme.colors.textMuted};
  margin: 0;
`;

export const Tally = styled.span`
  color: ${({ $ready }) => ($ready ? theme.colors.primary : theme.colors.textMuted)};
  font-weight: 600;
`;
