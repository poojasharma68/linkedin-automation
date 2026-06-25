import { useState } from 'react';
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from '../../store/api';
import getApiErrorMessage from '../../utils/getApiError';
import EditCategoryModal from '../EditCategoryModal/EditCategoryModal';
import {
  Card,
  CardTitle,
  CardSubtitle,
  FormGroup,
  Label,
  Input,
  PrimaryButton,
  Alert,
} from '../ui/styled';
import styled from 'styled-components';
import theme from '../../styles/theme';

const FormRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ColorInput = styled.input`
  width: 48px;
  height: 40px;
  padding: 2px;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.sm};
  cursor: pointer;
`;

const CategoryList = styled.div`
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CategoryItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.background};
`;

const CategoryInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ColorDot = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const CategoryName = styled.span`
  font-weight: 500;
`;

const CategorySlug = styled.span`
  font-size: 0.75rem;
  color: ${theme.colors.textMuted};
  margin-left: 0.5rem;
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: ${theme.radius.sm};
  cursor: pointer;
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.surface};
  color: ${theme.colors.text};

  &:hover {
    background: ${theme.colors.primaryLight};
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};
  }
`;

const DeleteButton = styled(ActionButton)`
  &:hover {
    background: ${theme.colors.errorBg};
    border-color: ${theme.colors.error};
    color: ${theme.colors.error};
  }
`;

function CategoryManager() {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#0a66c2');
  const [editingCategory, setEditingCategory] = useState(null);
  const [message, setMessage] = useState(null);

  const { data, isLoading, isError, error } = useGetCategoriesQuery();
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const categories = data?.data || [];

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Category name is required' });
      return;
    }

    try {
      await createCategory({ name: name.trim(), color }).unwrap();
      setMessage({ type: 'success', text: `Category "${name.trim()}" created` });
      setName('');
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to create category') });
    }
  };

  const handleSaveEdit = async (payload) => {
    await updateCategory(payload).unwrap();
    setMessage({ type: 'success', text: 'Category updated' });
    setEditingCategory(null);
  };

  const handleDelete = async (category) => {
    if (
      !window.confirm(
        `Delete the "${category.name}" tab and ALL of its posts? This cannot be undone.`
      )
    ) {
      return;
    }
    setMessage(null);

    try {
      await deleteCategory(category.id).unwrap();
      setMessage({ type: 'success', text: `Category "${category.name}" deleted` });
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to delete category') });
    }
  };

  return (
    <Card>
      <CardTitle>Manage Categories</CardTitle>
      <CardSubtitle>
        Create new categories here. Use Edit / Delete on each row or in the sidebar.
      </CardSubtitle>

      {isError && (
        <Alert $variant="error">
          {getApiErrorMessage(error, 'Failed to load categories')}
        </Alert>
      )}

      {message && <Alert $variant={message.type}>{message.text}</Alert>}

      <form onSubmit={handleCreate}>
        <FormRow>
          <FormGroup style={{ flex: 1, marginBottom: 0 }}>
            <Label htmlFor="catName">New Category Name</Label>
            <Input
              id="catName"
              placeholder="e.g. Product Updates"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormGroup>
          <FormGroup style={{ marginBottom: 0 }}>
            <Label htmlFor="catColor">Color</Label>
            <ColorInput
              id="catColor"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </FormGroup>
          <PrimaryButton type="submit" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Category'}
          </PrimaryButton>
        </FormRow>
      </form>

      <CategoryList>
        {isLoading && <p>Loading categories...</p>}
        {!isLoading && !isError && categories.length === 0 && (
          <p style={{ color: theme.colors.textMuted }}>No categories yet. Create one above.</p>
        )}
        {categories.map((category) => (
          <CategoryItem key={category.id}>
            <CategoryInfo>
              <ColorDot $color={category.color} />
              <CategoryName>{category.name}</CategoryName>
              <CategorySlug>({category.slug})</CategorySlug>
            </CategoryInfo>
            <ActionGroup>
              <ActionButton type="button" onClick={() => setEditingCategory(category)}>
                Edit
              </ActionButton>
              <DeleteButton type="button" onClick={() => handleDelete(category)}>
                Delete
              </DeleteButton>
            </ActionGroup>
          </CategoryItem>
        ))}
      </CategoryList>

      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={handleSaveEdit}
        />
      )}
    </Card>
  );
}

export default CategoryManager;
