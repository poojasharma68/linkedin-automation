import styled from 'styled-components';
import theme from '../../styles/theme';
import { Label } from '../ui/styled';

export const AppLayout = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
`;

export const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const TopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: ${theme.colors.surface};
  border-bottom: 1px solid ${theme.colors.border};
  flex-shrink: 0;
`;

export const TopBarTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
`;

export const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const ProjectSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.sm};
  font-size: 0.875rem;
  background: ${theme.colors.surface};
  min-width: 200px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

export const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
`;

export const ContentGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1200px;
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

export const SelectGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const ProgrammeTabBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.375rem;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
`;

export const ProgrammeTab = styled.button`
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  border-radius: ${theme.radius.sm};
  cursor: pointer;
  border: 1px solid ${({ $active }) => ($active ? theme.colors.primary : 'transparent')};
  background: ${({ $active }) => ($active ? theme.colors.primaryLight : 'transparent')};
  color: ${({ $active }) => ($active ? theme.colors.primary : theme.colors.textMuted)};
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    color: ${theme.colors.primary};
    background: ${theme.colors.primaryLight};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 1px;
  }
`;
