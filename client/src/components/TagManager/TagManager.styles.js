import styled from 'styled-components';
import theme from '../../styles/theme';

export const HeaderRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

export const SelectedCount = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $active }) => ($active ? theme.colors.primary : theme.colors.textMuted)};
`;

export const AddRow = styled.form`
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0 1.125rem;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const Chip = styled.div`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ $active }) => ($active ? theme.colors.primaryLight : theme.colors.surface)};
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    border-color: ${theme.colors.primary};
  }
`;

export const ChipToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.375rem 0.25rem 0.375rem 0.75rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ $active }) => ($active ? theme.colors.primary : theme.colors.textMuted)};

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 1px;
    border-radius: 999px;
  }
`;

export const ChipMark = styled.span`
  font-size: 0.6875rem;
  opacity: ${({ $active }) => ($active ? 1 : 0.5)};
`;

export const ChipRemove = styled.button`
  padding: 0.375rem 0.625rem 0.375rem 0.25rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
  color: ${theme.colors.textMuted};

  &:hover {
    color: ${theme.colors.error};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.error};
    outline-offset: 1px;
    border-radius: 999px;
  }
`;

export const EmptyHint = styled.p`
  font-size: 0.8125rem;
  color: ${theme.colors.textMuted};
`;
