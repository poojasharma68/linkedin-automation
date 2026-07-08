import { useMemo, useState } from 'react';
import {
  useProcessPostsMutation,
  useGetLinkedInSessionQuery,
  useStartLinkedInLoginMutation,
} from '../../store/api';
import getApiErrorMessage from '../../utils/getApiError';
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
import {
  SessionRow,
  SessionText,
  TextArea,
  FooterRow,
  UrlCount,
  Tally,
} from './UrlDropper.styles';

const PLACEHOLDER_PATTERNS = [/user_activity-123/i, /urn:li:activity:456/i];

function parseUrls(text) {
  return text
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function buildResultMessage({ total = 0, completed = 0, failed = 0 } = {}) {
  if (total === 0) {
    return { type: 'error', text: 'No URLs were processed. Check your input.' };
  }

  if (completed === 0) {
    return {
      type: 'error',
      text: `All ${total} post(s) failed. Check the URLs and your LinkedIn session.`,
    };
  }

  return {
    type: completed === total ? 'success' : 'error',
    text: `${completed} of ${total} post(s) captured${failed ? `, ${failed} failed` : ''}.`,
  };
}

function UrlDropper({ categories, programmes, onResults }) {
  const [urls, setUrls] = useState('');
  const [message, setMessage] = useState(null);

  const { data: sessionData, refetch: refetchSession } = useGetLinkedInSessionQuery(undefined, {
    pollingInterval: 15000,
  });
  const [processPosts, { isLoading }] = useProcessPostsMutation();
  const [startLogin, { isLoading: isConnecting }] = useStartLinkedInLoginMutation();

  const loggedIn = sessionData?.data?.loggedIn === true;
  const urlList = useMemo(() => parseUrls(urls), [urls]);
  const isReady = urlList.length > 0 && categories.length > 0 && programmes.length > 0;

  const handleConnectLinkedIn = async () => {
    setMessage({
      type: 'success',
      text: 'A Chrome window will open. Log in to LinkedIn — your session will be saved automatically.',
    });

    try {
      await startLogin().unwrap();
      await refetchSession();
      setMessage({ type: 'success', text: 'LinkedIn connected. You can now capture posts.' });
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'LinkedIn login failed') });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    onResults([]);

    if (categories.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one category above.' });
      return;
    }

    if (programmes.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one programme above.' });
      return;
    }

    if (urlList.length === 0) {
      setMessage({ type: 'error', text: 'Paste at least one real LinkedIn post URL.' });
      return;
    }

    const looksLikePlaceholder = urlList.some((url) =>
      PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(url))
    );

    if (looksLikePlaceholder) {
      setMessage({
        type: 'error',
        text: 'You pasted the example placeholder URLs. Replace them with real LinkedIn post links.',
      });
      return;
    }

    if (!loggedIn) {
      setMessage({
        type: 'success',
        text: 'Not logged in yet — a Chrome window will open for LinkedIn login, then capturing will start.',
      });
    }

    try {
      const result = await processPosts({ urls, categories, programmes }).unwrap();
      await refetchSession();
      setMessage(buildResultMessage(result.data?.summary));
      onResults(result.data?.results || []);
      if (result.data?.summary?.completed > 0) setUrls('');
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Processing failed') });
      onResults([]);
    }
  };

  return (
    <Card>
      <CardTitle>Drop LinkedIn URLs</CardTitle>
      <CardSubtitle>
        One URL per line. Each post is screenshotted once and uploaded to the CDN — the selected
        categories and programmes above are applied to every URL in this batch.
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

      {message && <Alert $variant={message.type}>{message.text}</Alert>}

      <form onSubmit={handleSubmit}>
        <FormGroup style={{ marginBottom: 0 }}>
          <Label htmlFor="urls">LinkedIn Post URLs</Label>
          <TextArea
            id="urls"
            placeholder={'https://www.linkedin.com/posts/...\nhttps://www.linkedin.com/posts/...'}
            value={urls}
            onChange={(event) => setUrls(event.target.value)}
          />
        </FormGroup>

        <FooterRow>
          <UrlCount>
            <Tally $ready={urlList.length > 0}>{urlList.length}</Tally> URL
            {urlList.length !== 1 ? 's' : ''}
            {' · '}
            <Tally $ready={categories.length > 0}>{categories.length}</Tally> categor
            {categories.length !== 1 ? 'ies' : 'y'}
            {' · '}
            <Tally $ready={programmes.length > 0}>{programmes.length}</Tally> programme
            {programmes.length !== 1 ? 's' : ''}
          </UrlCount>

          <PrimaryButton type="submit" disabled={isLoading || isConnecting || !isReady}>
            {isLoading ? 'Capturing...' : 'Capture & Build JSON'}
          </PrimaryButton>
        </FooterRow>
      </form>
    </Card>
  );
}

export default UrlDropper;
