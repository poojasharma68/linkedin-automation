import styled from 'styled-components';
import theme from '../../styles/theme';

export const Card = styled.section`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadow};
  padding: 1.5rem;
`;

export const CardTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

export const CardSubtitle = styled.p`
  font-size: 0.875rem;
  color: ${theme.colors.textMuted};
  margin-bottom: 1.25rem;
`;

export const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

export const Label = styled.label`
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  margin-bottom: 0.375rem;
  color: ${theme.colors.text};
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.sm};
  font-size: 0.9375rem;
  background: ${theme.colors.surface};
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primaryLight};
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
  }
`;

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.125rem;
  border-radius: ${theme.radius.sm};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 0.15s, opacity 0.15s;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const PrimaryButton = styled(Button)`
  background: ${theme.colors.primary};
  color: #fff;

  &:hover:not(:disabled) {
    background: ${theme.colors.primaryDark};
  }
`;

export const SecondaryButton = styled(Button)`
  background: ${theme.colors.surface};
  color: ${theme.colors.primary};
  border: 1px solid ${theme.colors.primary};

  &:hover:not(:disabled) {
    background: ${theme.colors.primaryLight};
  }
`;

export const Alert = styled.div`
  padding: 0.75rem 1rem;
  border-radius: ${theme.radius.sm};
  font-size: 0.875rem;
  margin-bottom: 1rem;
  background: ${({ $variant }) => {
    if ($variant === 'error') return theme.colors.errorBg;
    if ($variant === 'success') return theme.colors.successBg;
    return theme.colors.primaryLight;
  }};
  color: ${({ $variant }) => {
    if ($variant === 'error') return theme.colors.error;
    if ($variant === 'success') return theme.colors.success;
    return theme.colors.primaryDark;
  }};
`;

export const Badge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $status }) => {
    if ($status === 'Completed') return theme.colors.successBg;
    if ($status === 'Failed') return theme.colors.errorBg;
    if ($status === 'Processing') return theme.colors.primaryLight;
    return theme.colors.warningBg;
  }};
  color: ${({ $status }) => {
    if ($status === 'Completed') return theme.colors.success;
    if ($status === 'Failed') return theme.colors.error;
    if ($status === 'Processing') return theme.colors.primary;
    return theme.colors.warning;
  }};
`;
