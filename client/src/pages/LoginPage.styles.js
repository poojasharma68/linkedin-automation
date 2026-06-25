import styled from 'styled-components';
import theme from '../styles/theme';
import { Card, PrimaryButton } from '../components/ui/styled';
export const LoginPageLayout = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: linear-gradient(160deg, ${theme.colors.sidebar} 0%, #0a1628 55%, ${theme.colors.primaryDark} 100%);
`;

export const LoginCard = styled(Card)`
  width: 100%;
  max-width: 420px;
  padding: 2rem;
`;

export const LoginBrand = styled.div`
  margin-bottom: 1.5rem;
`;

export const LoginTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.375rem;
`;

export const LoginSubtitle = styled.p`
  font-size: 0.9375rem;
  color: ${theme.colors.textMuted};
`;

export const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const LoginButton = styled(PrimaryButton)`
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
`;

export const LoadingMessage = styled.p`
  color: ${theme.colors.sidebarText};
  font-size: 0.9375rem;
`;