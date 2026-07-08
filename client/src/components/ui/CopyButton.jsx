import styled from 'styled-components';
import theme from '../../styles/theme';
import useCopy from '../../hooks/useCopy';

const Button = styled.button`
  flex-shrink: 0;
  padding: ${({ $size }) => ($size === 'lg' ? '0.375rem 0.75rem' : '0.1875rem 0.5rem')};
  font-size: ${({ $size }) => ($size === 'lg' ? '0.75rem' : '0.6875rem')};
  font-weight: 600;
  border-radius: ${theme.radius.sm};
  cursor: pointer;
  border: 1px solid ${({ $copied }) => ($copied ? theme.colors.success : theme.colors.border)};
  background: ${theme.colors.surface};
  color: ${({ $copied }) => ($copied ? theme.colors.success : theme.colors.textMuted)};
  transition:
    color 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    border-color: ${({ $copied }) => ($copied ? theme.colors.success : theme.colors.primary)};
    color: ${({ $copied }) => ($copied ? theme.colors.success : theme.colors.primary)};
  }
`;

function CopyButton({ text, label = 'Copy', copiedLabel = 'Copied', size = 'sm', title }) {
  const [copied, copy] = useCopy(text);

  return (
    <Button type="button" onClick={copy} $copied={copied} $size={size} title={title}>
      {copied ? copiedLabel : label}
    </Button>
  );
}

export default CopyButton;
