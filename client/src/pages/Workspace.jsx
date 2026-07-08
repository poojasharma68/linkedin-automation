import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TagManager from '../components/TagManager/TagManager';
import UrlDropper from '../components/UrlDropper/UrlDropper';
import OutputPanel from '../components/OutputPanel/OutputPanel';
import { useGetHealthQuery, useGetAdminMeQuery } from '../store/api';
import { logout } from '../store/authSlice';
import { SecondaryButton } from '../components/ui/styled';
import useLocalStorageList from '../hooks/useLocalStorageList';
import {
  PageLayout,
  TopBar,
  TopBarTitle,
  TopBarActions,
  ContentArea,
  ContentGrid,
  StatusDot,
  StatusText,
} from '../components/Layout/Layout.styles';

const CATEGORIES_KEY = 'linkedin_categories';
const PROGRAMMES_KEY = 'linkedin_programmes';

function toggle(list, name) {
  return list.includes(name) ? list.filter((item) => item !== name) : [...list, name];
}

function Workspace() {
  const dispatch = useDispatch();
  const { data: meData } = useGetAdminMeQuery();
  const { data: healthData } = useGetHealthQuery();
  const username = useSelector((state) => state.auth.username) || meData?.data?.username;

  const [categories, categoryList] = useLocalStorageList(CATEGORIES_KEY);
  const [programmes, programmeList] = useLocalStorageList(PROGRAMMES_KEY);

  // Selections and results are deliberately in-memory only — a refresh clears them.
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedProgrammes, setSelectedProgrammes] = useState([]);
  const [results, setResults] = useState([]);

  const removeCategory = useCallback(
    (name) => {
      categoryList.remove(name);
      setSelectedCategories((prev) => prev.filter((item) => item !== name));
    },
    [categoryList]
  );

  const removeProgramme = useCallback(
    (name) => {
      programmeList.remove(name);
      setSelectedProgrammes((prev) => prev.filter((item) => item !== name));
    },
    [programmeList]
  );

  return (
    <PageLayout>
      <TopBar>
        <TopBarTitle>LinkedIn Post Automation</TopBarTitle>
        <TopBarActions>
          <StatusText>
            <StatusDot $online={!!healthData?.success} />
            {healthData?.success ? 'API Online' : 'API Offline'}
          </StatusText>
          {username && <StatusText>Signed in as {username}</StatusText>}
          <SecondaryButton type="button" onClick={() => dispatch(logout())}>
            Log out
          </SecondaryButton>
        </TopBarActions>
      </TopBar>

      <ContentArea>
        <ContentGrid>
          <TagManager
            title="Categories"
            subtitle='Saved in this browser. Click a chip to select it — it becomes the "classes" value.'
            placeholder="e.g. life"
            emptyHint="No categories yet. Add one above — it will still be here after a refresh."
            items={categories}
            selected={selectedCategories}
            onAdd={categoryList.add}
            onRemove={removeCategory}
            onToggle={(name) => setSelectedCategories((prev) => toggle(prev, name))}
          />

          <TagManager
            title="Programmes"
            subtitle='Saved in this browser. Click a chip to select it — it becomes the "programme" value.'
            placeholder="e.g. PGP RISE"
            emptyHint="No programmes yet. Add one above — it will still be here after a refresh."
            items={programmes}
            selected={selectedProgrammes}
            onAdd={programmeList.add}
            onRemove={removeProgramme}
            onToggle={(name) => setSelectedProgrammes((prev) => toggle(prev, name))}
          />

          <UrlDropper
            categories={selectedCategories}
            programmes={selectedProgrammes}
            onResults={setResults}
          />

          <OutputPanel
            results={results}
            categories={selectedCategories}
            programmes={selectedProgrammes}
          />
        </ContentGrid>
      </ContentArea>
    </PageLayout>
  );
}

export default Workspace;
