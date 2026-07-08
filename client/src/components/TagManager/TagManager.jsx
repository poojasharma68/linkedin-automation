import { useState } from 'react';
import { Card, CardTitle, CardSubtitle, Input, PrimaryButton, Alert } from '../ui/styled';
import {
  HeaderRow,
  SelectedCount,
  AddRow,
  ChipRow,
  Chip,
  ChipToggle,
  ChipMark,
  ChipRemove,
  EmptyHint,
} from './TagManager.styles';

/**
 * Create / delete / select a list of names. Used for both the categories row and
 * the programmes row — the names themselves live in localStorage, the selection
 * does not.
 */
function TagManager({
  title,
  subtitle,
  placeholder,
  emptyHint,
  items,
  selected,
  onAdd,
  onRemove,
  onToggle,
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);

  const handleAdd = (event) => {
    event.preventDefault();

    const failure = onAdd(draft);
    setError(failure);
    if (!failure) setDraft('');
  };

  const handleRemove = (name) => {
    setError(null);
    onRemove(name);
  };

  return (
    <Card>
      <HeaderRow>
        <CardTitle>{title}</CardTitle>
        <SelectedCount $active={selected.length > 0}>
          {selected.length} selected
        </SelectedCount>
      </HeaderRow>
      <CardSubtitle>{subtitle}</CardSubtitle>

      {error && <Alert $variant="error">{error}</Alert>}

      <AddRow onSubmit={handleAdd}>
        <Input
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label={title}
        />
        <PrimaryButton type="submit">Add</PrimaryButton>
      </AddRow>

      {items.length === 0 ? (
        <EmptyHint>{emptyHint}</EmptyHint>
      ) : (
        <ChipRow>
          {items.map((name) => {
            const isSelected = selected.includes(name);

            return (
              <Chip key={name} $active={isSelected}>
                <ChipToggle
                  type="button"
                  $active={isSelected}
                  aria-pressed={isSelected}
                  onClick={() => onToggle(name)}
                >
                  <ChipMark $active={isSelected}>{isSelected ? '✓' : '+'}</ChipMark>
                  {name}
                </ChipToggle>
                <ChipRemove
                  type="button"
                  title={`Delete "${name}"`}
                  aria-label={`Delete ${name}`}
                  onClick={() => handleRemove(name)}
                >
                  ×
                </ChipRemove>
              </Chip>
            );
          })}
        </ChipRow>
      )}
    </Card>
  );
}

export default TagManager;
