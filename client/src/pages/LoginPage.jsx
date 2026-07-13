import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { FormGroup, Label, Input, Alert } from '../components/ui/styled';
import { useLoginMutation, useSignupMutation } from '../store/api';
import { setCredentials } from '../store/authSlice';
import { getApiErrorMessage } from '../utils/getApiError';
import {
  LoginPageLayout,
  LoginCard,
  LoginBrand,
  LoginTitle,
  LoginSubtitle,
  LoginForm,
  LoginButton,
  ToggleRow,
  ToggleLink,
} from './LoginPage.styles';

function LoginPage() {
  const dispatch = useDispatch();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [signup, { isLoading: isSigningUp }] = useSignupMutation();

  const isSignup = mode === 'signup';
  const isLoading = isLoggingIn || isSigningUp;

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup');
    setErrorMessage(null);
    setPassword('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      const action = isSignup
        ? signup({ username, password, inviteCode })
        : login({ username, password });
      const result = await action.unwrap();
      dispatch(
        setCredentials({
          token: result.data.token,
          username: result.data.username,
        })
      );
    } catch (error) {
      setPassword('');
      setErrorMessage(getApiErrorMessage(error, isSignup ? 'Sign-up failed' : 'Login failed'));
    }
  };

  return (
    <LoginPageLayout>
      <LoginCard>
        <LoginBrand>
          <LoginTitle>{isSignup ? 'Create your account' : 'Welcome back'}</LoginTitle>
          <LoginSubtitle>
            {isSignup
              ? 'Pick a username and password, and enter your team invite code.'
              : 'Sign in to manage LinkedIn post screenshots.'}
          </LoginSubtitle>
        </LoginBrand>

        <LoginForm onSubmit={handleSubmit}>
          {errorMessage && <Alert $variant="error">{errorMessage}</Alert>}

          <FormGroup>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? 'At least 8 characters' : 'Enter password'}
              required
            />
          </FormGroup>

          {isSignup && (
            <FormGroup>
              <Label htmlFor="inviteCode">Invite code</Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Ask your admin for this"
                required
              />
            </FormGroup>
          )}

          <LoginButton type="submit" disabled={isLoading}>
            {isLoading
              ? isSignup
                ? 'Creating account...'
                : 'Signing in...'
              : isSignup
                ? 'Create account'
                : 'Sign in'}
          </LoginButton>
        </LoginForm>

        <ToggleRow>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
          <ToggleLink type="button" onClick={switchMode}>
            {isSignup ? 'Log in' : 'Create one'}
          </ToggleLink>
        </ToggleRow>
      </LoginCard>
    </LoginPageLayout>
  );
}

export default LoginPage;
