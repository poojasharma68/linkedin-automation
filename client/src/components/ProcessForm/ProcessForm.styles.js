import styled from 'styled-components';
import theme from '../../styles/theme';
import {
  Card,
  CardTitle,
  CardSubtitle,
  FormGroup,
  Label,
  PrimaryButton,
  SecondaryButton,
  Alert,
} from '../ui/styled';

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 0.75rem 0.875rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.sm};
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  line-height: 1.6;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primaryLight};
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
  }
`;

export const UrlCount = styled.p`
  font-size: 0.8125rem;
  color: ${theme.colors.textMuted};
  margin-top: 0.5rem;
`;

export const SelectedCategory = styled.p`
  font-size: 0.875rem;
  color: ${theme.colors.textMuted};
  margin-bottom: 1rem;

  strong {
    color: ${theme.colors.primary};
    text-transform: capitalize;
  }
`;

export { Card, CardTitle, CardSubtitle, FormGroup, Label, PrimaryButton, SecondaryButton, Alert };
