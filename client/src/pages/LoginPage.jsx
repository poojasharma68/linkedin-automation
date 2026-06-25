import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { FormGroup, Label, Input, Alert } from '../components/ui/styled';
import { useLoginMutation } from '../store/api';
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
} from './LoginPage.styles';

function LoginPage() {
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [login, { isLoading }] = useLoginMutation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      const result = await login({ username, password }).unwrap();
      dispatch(
        setCredentials({
          token: result.data.token,
          username: result.data.username,
        })
      );
    } catch (error) {
      setPassword('');
      setErrorMessage(getApiErrorMessage(error, 'Login failed'));
    }
  };

  return (
    <LoginPageLayout>
      <LoginCard>
        <LoginBrand>
          <LoginTitle>Admin Panel</LoginTitle>
          <LoginSubtitle>Sign in to manage LinkedIn post screenshots.</LoginSubtitle>
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </FormGroup>

          <LoginButton type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </LoginButton>
        </LoginForm>
      </LoginCard>
    </LoginPageLayout>
  );
}

export default LoginPage;
