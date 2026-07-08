import { useMemo } from 'react';
import { Card, CardTitle, CardSubtitle, Badge } from '../ui/styled';
import CopyButton from '../ui/CopyButton';
import CopyLink from '../ui/CopyLink';
import { buildGroups, serializeGroup, serializeGroups, countEntries } from '../../utils/buildOutput';
import {
  HeaderRow,
  Groups,
  GroupHeader,
  GroupTitle,
  GroupCount,
  Code,
  Divider,
  SectionLabel,
  CaptureList,
  CaptureRow,
  CaptureThumb,
  CaptureDetails,
  CaptureTop,
  CaptureSourceUrl,
  CaptureError,
  EmptyState,
} from './OutputPanel.styles';

function OutputPanel({ results, categories, programmes }) {
  const groups = useMemo(
    () => buildGroups({ results, categories, programmes }),
    [results, categories, programmes]
  );

  const allText = useMemo(() => serializeGroups(groups), [groups]);
  const showHeadings = groups.length > 1;
  const totalEntries = countEntries(groups);
  const failed = results.filter((result) => result.status !== 'Completed' || !result.cdnUrl);

  if (results.length === 0) {
    return (
      <Card>
        <CardTitle>Output</CardTitle>
        <CardSubtitle>
          Nothing is stored — refresh the page and this clears. Only your category and programme
          names are kept, in this browser.
        </CardSubtitle>
        <EmptyState>
          <h3>No output yet</h3>
          <p>Select categories and programmes, drop your LinkedIn URLs, then capture.</p>
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card>
      <HeaderRow>
        <CardTitle>Output</CardTitle>
        {totalEntries > 0 && (
          <CopyButton
            text={allText}
            size="lg"
            label={`Copy all (${totalEntries})`}
            copiedLabel="Copied all"
            title="Copy every group as one block"
          />
        )}
      </HeaderRow>
      <CardSubtitle>
        {totalEntries} object{totalEntries !== 1 ? 's' : ''} across {groups.length} group
        {groups.length !== 1 ? 's' : ''} · nothing is stored, refresh clears everything.
      </CardSubtitle>

      {groups.length > 0 && (
        <Groups>
          {groups.map((group) => (
            <div key={group.id}>
              <GroupHeader>
                <GroupTitle>
                  {showHeadings ? group.heading : 'JSON'}
                  <GroupCount>
                    {group.entries.length} object{group.entries.length !== 1 ? 's' : ''}
                  </GroupCount>
                </GroupTitle>
                {showHeadings && (
                  <CopyButton
                    text={serializeGroup(group, true)}
                    label="Copy group"
                    title={`Copy the "${group.heading}" block`}
                  />
                )}
              </GroupHeader>
              <Code>{serializeGroup(group, showHeadings)}</Code>
            </div>
          ))}
        </Groups>
      )}

      <Divider />

      <SectionLabel>
        Captures ({results.length - failed.length}/{results.length})
      </SectionLabel>
      <CaptureList>
        {results.map((result, index) => (
          <CaptureRow key={`${result.linkedinUrl}-${index}`}>
            {result.cdnUrl && (
              <CaptureThumb href={result.cdnUrl} target="_blank" rel="noopener noreferrer">
                <img src={result.cdnUrl} alt="Post screenshot" />
              </CaptureThumb>
            )}
            <CaptureDetails>
              <CaptureTop>
                <CaptureSourceUrl
                  href={result.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={result.linkedinUrl}
                >
                  {result.linkedinUrl}
                </CaptureSourceUrl>
                <Badge $status={result.status}>{result.status}</Badge>
              </CaptureTop>

              {result.cdnUrl ? (
                <CopyLink url={result.cdnUrl} />
              ) : (
                <CaptureError>{result.error || 'No screenshot was produced.'}</CaptureError>
              )}
            </CaptureDetails>
          </CaptureRow>
        ))}
      </CaptureList>
    </Card>
  );
}

export default OutputPanel;
