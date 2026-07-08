import styled from 'styled-components';
import theme from '../../styles/theme';
import CopyButton from './CopyButton';

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;

const Link = styled.a`
  flex: 1;
  min-width: 0;
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: ${theme.colors.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    text-decoration: underline;
  }
`;

function CopyLink({ url }) {
  return (
    <Row>
      <Link href={url} target="_blank" rel="noopener noreferrer" title={url}>
        {url}
      </Link>
      <CopyButton text={url} />
    </Row>
  );
}

export default CopyLink;
