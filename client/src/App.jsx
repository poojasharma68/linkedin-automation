import { useSelector } from 'react-redux';
import { useGetAdminMeQuery } from './store/api';
import Workspace from './pages/Workspace';
import LoginPage from './pages/LoginPage';
import { LoginPageLayout, LoadingMessage } from './pages/LoginPage.styles';

function App() {
  const token = useSelector((state) => state.auth.token);
  const { isLoading, isError, isSuccess } = useGetAdminMeQuery(undefined, {
    skip: !token,
  });

  if (!token || isError) {
    return <LoginPage />;
  }

  if (isLoading || !isSuccess) {
    return (
      <LoginPageLayout>
        <LoadingMessage>Checking session...</LoadingMessage>
      </LoginPageLayout>
    );
  }

  return <Workspace />;
}

export default App;
