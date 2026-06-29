import styled from 'styled-components';
import theme from '../../styles/theme';

export const SidebarContainer = styled.aside`
  width: 260px;
  min-width: 260px;
  background: ${theme.colors.sidebar};
  color: ${theme.colors.sidebarText};
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const SidebarHeader = styled.div`
  padding: 1.5rem 1.25rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

export const SidebarLogo = styled.h1`
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
`;

export const SidebarSection = styled.div`
  padding: 1.25rem 0.75rem;
  flex: 1;
  overflow-y: auto;
`;

export const SidebarLabel = styled.p`
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${theme.colors.sidebarMuted};
  padding: 0 0.5rem;
  margin-bottom: 0.5rem;
`;

export const CategoryTab = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.625rem 0.75rem;
  margin-bottom: 0.25rem;
  border: none;
  border-radius: ${theme.radius.sm};
  background: ${({ $active }) => ($active ? theme.colors.sidebarActive : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : theme.colors.sidebarText)};
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;

  &:hover {
    background: ${({ $active }) => ($active ? theme.colors.sidebarActive : 'rgba(255,255,255,0.06)')};
  }
`;

export const CategoryDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 0.625rem;
  background: ${({ $color }) => $color || theme.colors.sidebarMuted};
  flex-shrink: 0;
`;

export const CategoryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.25rem;
`;

export const CategoryTabFlex = styled.button`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  padding: 0.625rem 0.75rem;
  border: none;
  border-radius: ${theme.radius.sm};
  background: ${({ $active }) => ($active ? theme.colors.sidebarActive : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : theme.colors.sidebarText)};
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;

  &:hover {
    background: ${({ $active }) => ($active ? theme.colors.sidebarActive : 'rgba(255,255,255,0.06)')};
  }

  span.label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const SidebarIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: ${theme.radius.sm};
  background: transparent;
  color: ${theme.colors.sidebarMuted};
  font-size: 0.6875rem;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  &.delete:hover {
    background: rgba(204, 16, 22, 0.3);
    color: #ff8a8a;
  }
`;

export const SidebarError = styled.p`
  font-size: 0.75rem;
  color: #ff8a8a;
  padding: 0.5rem;
  line-height: 1.4;
`;

export const ManageSection = styled.div`
  padding: 1rem 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

export const ManageButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: ${theme.radius.sm};
  background: ${({ $active }) => ($active ? theme.colors.sidebarActive : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : theme.colors.sidebarMuted)};
  font-size: 0.8125rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${theme.colors.sidebarActive};
    color: ${theme.colors.sidebarText};
  }
`;

export function getCategoryColor(color) {
  return color || '#0a66c2';
}
