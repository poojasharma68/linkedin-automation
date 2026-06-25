import { useState } from 'react';
import styled from 'styled-components';
import theme from '../../styles/theme';
import { Label, Input, PrimaryButton, SecondaryButton, Alert } from '../ui/styled';
import getApiErrorMessage from '../../utils/getApiError';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const Modal = styled.div`
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.lg};
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: ${theme.shadow};
`;

const Title = styled.h3`
  font-size: 1.125rem;
  margin-bottom: 1rem;
`;

const FormRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 1rem;
`;

const ColorInput = styled.input`
  width: 48px;
  height: 40px;
  padding: 2px;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.sm};
  cursor: pointer;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

function EditCategoryModal({ category, onClose, onSave }) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSave({ id: category.id, name: name.trim(), color });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update category'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>Edit Category</Title>
        {error && <Alert $variant="error">{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <FormRow>
            <div style={{ flex: 1 }}>
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="editColor">Color</Label>
              <ColorInput
                id="editColor"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </FormRow>
          <ButtonRow>
            <SecondaryButton type="button" onClick={onClose}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </PrimaryButton>
          </ButtonRow>
        </form>
      </Modal>
    </Overlay>
  );
}

export default EditCategoryModal;
