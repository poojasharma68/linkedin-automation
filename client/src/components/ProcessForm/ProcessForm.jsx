import { useState, useMemo } from 'react';
import {
  useProcessPostsMutation,
  useRetryFailedPostsMutation,
  useGetLinkedInSessionQuery,
  useStartLinkedInLoginMutation,
} from '../../store/api';
import getApiErrorMessage from '../../utils/getApiError';
import { ALL_PROGRAMMES } from '../../constants/programmes';
import {
  Card,
  CardTitle,
  CardSubtitle,
  FormGroup,
  Label,
  PrimaryButton,
  SecondaryButton,
  Alert,
  TextArea,
  UrlCount,
  SelectedCategory,
} from './ProcessForm.styles';
import styled from 'styled-components';
import theme from '../../styles/theme';

const PLACEHOLDER_PATTERNS = [/user_activity-123/i, /urn:li:activity:456/i];

const SessionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: ${theme.radius.sm};
  background: ${({ $loggedIn }) => ($loggedIn ? theme.colors.successBg : theme.colors.warningBg)};
  border: 1px solid ${({ $loggedIn }) => ($loggedIn ? theme.colors.success : theme.colors.warning)};
`;

const SessionText = styled.p`
  font-size: 0.875rem;
  color: ${theme.colors.text};
  margin: 0;
`;

function parseUrls(text) {
  return text
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter(Boolean);
}

function buildResultMessage(data) {
  const { queue, summary } = data || {};
  const queued = queue?.queued?.length ?? 0;
  const skipped = queue?.skipped?.length ?? 0;
  const message = summary?.message;

  if (skipped > 0 && queued === 0) {
    const detail = queue?.skipped?.[0];
    const extra = detail ? ` (${detail.reason})` : '';
    return {
      type: 'error',
      text: `${skipped} URL(s) skipped${extra}. Delete the old post to add it again.`,
    };
  }

  if (queued === 0 && skipped === 0) {
    return { type: 'error', text: 'No URLs were queued. Check your input.' };
  }

  return {
    type: 'success',
    text:
      message ||
      `${queued} post(s) queued. Watch the list below — status updates every few seconds.`,
  };
}

function ProcessForm({ category, categoryName, programme, programmeName, onProcessed }) {
  const [urls, setUrls] = useState('');
  const [message, setMessage] = useState(null);

  const hasProgramme = !!programme && programme !== ALL_PROGRAMMES;

  const { data: sessionData, refetch: refetchSession } = useGetLinkedInSessionQuery(undefined, {
    pollingInterval: 15000,
  });
  const [processPosts, { isLoading }] = useProcessPostsMutation();
  const [retryFailed, { isLoading: isRetrying }] = useRetryFailedPostsMutation();
  const [startLogin, { isLoading: isConnecting }] = useStartLinkedInLoginMutation();

  const loggedIn = sessionData?.data?.loggedIn === true;
  const urlList = useMemo(() => parseUrls(urls), [urls]);

  const handleConnectLinkedIn = async () => {
    setMessage(null);
    setMessage({
      type: 'success',
      text: 'A Chrome window will open. Log in to LinkedIn — your session will be saved automatically.',
    });

    try {
      await startLogin().unwrap();
      await refetchSession();
      setMessage({ type: 'success', text: 'LinkedIn connected. You can now process posts.' });
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'LinkedIn login failed') });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (category === 'all' || !category) {
      setMessage({ type: 'error', text: 'Select a category from the sidebar first' });
      return;
    }

    if (!hasProgramme) {
      setMessage({
        type: 'error',
        text: 'Select a specific programme tab (UG, PG, Executive, or PGP Bharat) before adding posts.',
      });
      return;
    }

    if (urlList.length === 0) {
      setMessage({ type: 'error', text: 'Paste at least one real LinkedIn post URL' });
      return;
    }

    const looksLikePlaceholder = urlList.some((url) =>
      PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(url))
    );

    if (looksLikePlaceholder) {
      setMessage({
        type: 'error',
        text: 'You pasted the example placeholder URLs. Replace them with a real LinkedIn post link from your browser.',
      });
      return;
    }

    if (!loggedIn) {
      setMessage({
        type: 'success',
        text: 'Not logged in yet — a Chrome window will open for LinkedIn login, then processing will start.',
      });
    }

    try {
      const result = await processPosts({ category, programme, urls }).unwrap();
      await refetchSession();
      setMessage(buildResultMessage(result.data));
      if (result.data?.summary?.queued > 0) setUrls('');
      onProcessed?.();
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Processing failed') });
    }
  };

  const handleRetryFailed = async () => {
    setMessage(null);

    if (!loggedIn) {
      setMessage({
        type: 'success',
        text: 'Not logged in — a Chrome window will open for LinkedIn login first.',
      });
    }

    try {
      const result = await retryFailed({
        category,
        ...(hasProgramme ? { programme } : {}),
      }).unwrap();
      await refetchSession();
      const { queued = 0, message: retryMessage } = result.data || {};

      if (queued === 0 && !retryMessage) {
        setMessage({ type: 'error', text: 'No failed posts to retry in this category.' });
        return;
      }

      setMessage({
        type: 'success',
        text: retryMessage || `${queued} post(s) queued for retry. Watch the list for updates.`,
      });
      onProcessed?.();
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Retry failed') });
    }
  };

  return (
    <Card>
      <CardTitle>Process LinkedIn Posts</CardTitle>
      <CardSubtitle>
        Paste LinkedIn post URLs. On first run, a Chrome window opens for you to log in — the session
        is saved in a browser profile (no manual cookies needed).
      </CardSubtitle>

      <SessionRow $loggedIn={loggedIn}>
        <SessionText>
          LinkedIn session: <strong>{loggedIn ? 'Connected' : 'Not connected'}</strong>
        </SessionText>
        {!loggedIn && (
          <SecondaryButton type="button" onClick={handleConnectLinkedIn} disabled={isConnecting}>
            {isConnecting ? 'Waiting for login...' : 'Connect LinkedIn'}
          </SecondaryButton>
        )}
      </SessionRow>

      <SelectedCategory>
        Category: <strong>{categoryName || category}</strong>
        {' · '}
        Programme: <strong>{hasProgramme ? programmeName || programme : 'Select a programme'}</strong>
      </SelectedCategory>

      {message && <Alert $variant={message.type}>{message.text}</Alert>}

      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="urls">LinkedIn Post URLs</Label>
          <TextArea
            id="urls"
            placeholder="Paste your real LinkedIn post URL here..."
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
          />
          <UrlCount>{urlList.length} URL{urlList.length !== 1 ? 's' : ''} detected</UrlCount>
        </FormGroup>

        <FormGroup style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <PrimaryButton
            type="submit"
            disabled={isLoading || isConnecting || !category || category === 'all' || !hasProgramme}
          >
            {isLoading ? 'Processing...' : 'Process Posts'}
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={handleRetryFailed}
            disabled={isRetrying || isConnecting || !category || category === 'all'}
          >
            {isRetrying ? 'Retrying...' : 'Retry Failed'}
          </SecondaryButton>
        </FormGroup>
      </form>
    </Card>
  );
}

export default ProcessForm;

