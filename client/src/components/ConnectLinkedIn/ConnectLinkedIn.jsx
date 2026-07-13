import { useState } from 'react';
import {
  useGetAdminMeQuery,
  useGetLinkedInSessionQuery,
  useDisconnectLinkedInMutation,
} from '../../store/api';
import { Card, CardTitle, CardSubtitle, SecondaryButton, Alert } from '../ui/styled';
import {
  StatusLine,
  StatusDot,
  Steps,
  CopyField,
  CopyInput,
  DisconnectRow,
} from './ConnectLinkedIn.styles';

function CopyRow({ value }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  };

  return (
    <CopyField>
      <CopyInput readOnly value={value} onFocus={(e) => e.target.select()} />
      <SecondaryButton type="button" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </SecondaryButton>
    </CopyField>
  );
}

function formatWhen(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return null;
  }
}

function ConnectLinkedIn() {
  const { data: meData } = useGetAdminMeQuery();
  const { data: sessionData } = useGetLinkedInSessionQuery(undefined, { pollingInterval: 15000 });
  const [disconnect, { isLoading: isDisconnecting }] = useDisconnectLinkedInMutation();
  const [message, setMessage] = useState(null);

  const extensionKey = meData?.data?.extensionKey || '';
  const connected = sessionData?.data?.connected === true;
  const connectedAt = formatWhen(sessionData?.data?.connectedAt);
  const serverUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleDisconnect = async () => {
    setMessage(null);
    try {
      await disconnect().unwrap();
      setMessage({ type: 'success', text: 'Disconnected. Reconnect anytime from the extension.' });
    } catch {
      setMessage({ type: 'error', text: 'Could not disconnect. Try again.' });
    }
  };

  return (
    <Card>
      <CardTitle>LinkedIn Connection</CardTitle>
      <CardSubtitle>
        Each person connects their own LinkedIn once, using the browser extension. Screenshots then
        run under your own account.
      </CardSubtitle>

      <StatusLine $connected={connected}>
        <StatusDot $connected={connected} />
        {connected
          ? `Connected${connectedAt ? ` · since ${connectedAt}` : ''}`
          : 'Not connected yet'}
      </StatusLine>

      {message && <Alert $variant={message.type}>{message.text}</Alert>}

      <Steps>
        <li>
          Install the <strong>UnionStack — LinkedIn Connector</strong> extension in Chrome or Edge
          (one-time).
        </li>
        <li>
          Make sure you are logged in to <strong>linkedin.com</strong> in this browser.
        </li>
        <li>
          Open the extension and paste your <strong>Server URL</strong>:
          <CopyRow value={serverUrl} />
        </li>
        <li>
          …and your personal <strong>key</strong> (do not share it):
          <CopyRow value={extensionKey} />
        </li>
        <li>
          Click <strong>Connect LinkedIn</strong> in the extension. This panel turns green within a
          few seconds.
        </li>
      </Steps>

      {connected && (
        <DisconnectRow>
          <SecondaryButton type="button" onClick={handleDisconnect} disabled={isDisconnecting}>
            {isDisconnecting ? 'Disconnecting…' : 'Disconnect LinkedIn'}
          </SecondaryButton>
        </DisconnectRow>
      )}
    </Card>
  );
}

export default ConnectLinkedIn;
