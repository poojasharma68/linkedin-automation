import styled from 'styled-components';
import theme from '../../styles/theme';

export const StatusLine = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  border-radius: ${theme.radius.sm};
  background: ${({ $connected }) => ($connected ? theme.colors.successBg : theme.colors.warningBg)};
  color: ${({ $connected }) => ($connected ? theme.colors.success : theme.colors.warning)};
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1.25rem;
`;

export const StatusDot = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ $connected }) => ($connected ? theme.colors.success : theme.colors.warning)};
`;

export const Steps = styled.ol`
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: ${theme.colors.text};
`;

export const CopyField = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.375rem;
`;

export const CopyInput = styled.input`
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.sm};
  font-size: 0.8125rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: ${theme.colors.bg || theme.colors.surface};
  color: ${theme.colors.text};
`;

export const DisconnectRow = styled.div`
  margin-top: 1.25rem;
  display: flex;
  justify-content: flex-end;
`;
