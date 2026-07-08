import styled from 'styled-components';
import theme from '../../styles/theme';

export const PageLayout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
`;

export const TopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.5rem;
  background: ${theme.colors.surface};
  border-bottom: 1px solid ${theme.colors.border};
  flex-shrink: 0;
`;

export const TopBarTitle = styled.h1`
  font-size: 1.125rem;
  font-weight: 600;
`;

export const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

export const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
`;

export const ContentGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 1000px;
  margin: 0 auto;
`;

export const StatusDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $online }) => ($online ? theme.colors.success : theme.colors.error)};
  margin-right: 0.375rem;
`;

export const StatusText = styled.span`
  font-size: 0.8125rem;
  color: ${theme.colors.textMuted};
  display: flex;
  align-items: center;
`;
