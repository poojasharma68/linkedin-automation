import { useState } from 'react';
import {
  useGetCategoriesQuery,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from '../../store/api';
import getApiErrorMessage from '../../utils/getApiError';
import {
  SidebarContainer,
  SidebarHeader,
  SidebarLogo,
  SidebarSection,
  SidebarLabel,
  CategoryTab,
  CategoryDot,
  CategoryRow,
  CategoryTabFlex,
  SidebarIconButton,
  SidebarError,
  ManageSection,
  ManageButton,
  getCategoryColor,
} from './Sidebar.styles';
import EditCategoryModal from '../EditCategoryModal/EditCategoryModal';

function Sidebar({ activeView, onViewChange }) {
  const [editingCategory, setEditingCategory] = useState(null);

  const { data, isError, error } = useGetCategoriesQuery();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const categories = data?.data || [];

  const handleDelete = async (category, e) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Delete the "${category.name}" tab and ALL of its posts? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteCategory(category.id).unwrap();
      if (activeView === category.slug) onViewChange('all');
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to delete category'));
    }
  };

  const handleEdit = (category, e) => {
    e.stopPropagation();
    setEditingCategory(category);
  };

  const handleSaveEdit = async ({ id, name, color }) => {
    await updateCategory({ id, name, color }).unwrap();
    setEditingCategory(null);
  };

  return (
    <SidebarContainer>
      <SidebarHeader>
        <SidebarLogo>LinkedIn Automation</SidebarLogo>
      </SidebarHeader>

      <SidebarSection>
        <SidebarLabel>Posts</SidebarLabel>
        <CategoryTab
          type="button"
          $active={activeView === 'all'}
          onClick={() => onViewChange('all')}
        >
          <CategoryDot $color="#8b949e" />
          All Posts
        </CategoryTab>

        <SidebarLabel style={{ marginTop: '1.25rem' }}>Categories</SidebarLabel>

        {isError && (
          <SidebarError>
            {getApiErrorMessage(error, 'Failed to load categories')}
          </SidebarError>
        )}

        {categories.map((category) => (
          <CategoryRow key={category.id}>
            <CategoryTabFlex
              type="button"
              $active={activeView === category.slug}
              onClick={() => onViewChange(category.slug)}
            >
              <CategoryDot $color={getCategoryColor(category.slug, category.color)} />
              <span className="label">{category.name}</span>
            </CategoryTabFlex>
            <SidebarIconButton
              type="button"
              title="Edit category"
              onClick={(e) => handleEdit(category, e)}
            >
              ✎
            </SidebarIconButton>
            <SidebarIconButton
              type="button"
              className="delete"
              title="Delete category"
              onClick={(e) => handleDelete(category, e)}
            >
              ✕
            </SidebarIconButton>
          </CategoryRow>
        ))}
      </SidebarSection>

      <ManageSection>
        <ManageButton
          type="button"
          $active={activeView === 'manage'}
          onClick={() => onViewChange('manage')}
        >
          + Manage Categories
        </ManageButton>
      </ManageSection>

      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={handleSaveEdit}
        />
      )}
    </SidebarContainer>
  );
}

export default Sidebar;
