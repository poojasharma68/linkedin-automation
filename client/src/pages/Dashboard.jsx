import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from '../components/Sidebar/Sidebar';
import ProcessForm from '../components/ProcessForm/ProcessForm';
import PostsList from '../components/PostsList/PostsList';
import CategoryManager from '../components/CategoryManager/CategoryManager';
import { useGetHealthQuery, useGetCategoriesQuery, useGetAdminMeQuery } from '../store/api';
import { logout } from '../store/authSlice';
import { SecondaryButton } from '../components/ui/styled';
import { PROGRAMMES, getProgrammeLabel, ALL_PROGRAMMES } from '../constants/programmes';
import {
  AppLayout,
  MainContent,
  TopBar,
  TopBarTitle,
  TopBarActions,
  ContentArea,
  ContentGrid,
  StatusDot,
  StatusText,
  ProgrammeTabBar,
  ProgrammeTab,
} from '../components/Layout/Layout.styles';

function getTitle(activeView, categories) {
  if (activeView === 'all') return 'All Posts';
  if (activeView === 'manage') return 'Manage Categories';
  const cat = categories.find((c) => c.slug === activeView);
  return cat ? cat.name : activeView;
}

function Dashboard() {
  const dispatch = useDispatch();
  const { data: meData } = useGetAdminMeQuery(undefined, { skip: false });
  const username = useSelector((state) => state.auth.username) || meData?.data?.username;
  const [activeView, setActiveView] = useState('all');
  const [activeProgramme, setActiveProgramme] = useState(ALL_PROGRAMMES);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: healthData } = useGetHealthQuery();
  const { data: categoriesData } = useGetCategoriesQuery();
  const categories = categoriesData?.data || [];

  const isCategoryView = activeView !== 'all' && activeView !== 'manage';
  const activeCategory = isCategoryView ? activeView : 'all';

  const handleViewChange = useCallback((view) => {
    setActiveView(view);
    setActiveProgramme(ALL_PROGRAMMES);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <AppLayout>
      <Sidebar activeView={activeView} onViewChange={handleViewChange} />

      <MainContent>
        <TopBar>
          <TopBarTitle>{getTitle(activeView, categories)}</TopBarTitle>
          <TopBarActions>
            <StatusText>
              <StatusDot $online={!!healthData?.success} />
              {healthData?.success ? 'API Online' : 'API Offline'}
            </StatusText>
            {username && <StatusText>Signed in as {username}</StatusText>}
            <SecondaryButton type="button" onClick={handleLogout}>
              Log out
            </SecondaryButton>
          </TopBarActions>
        </TopBar>

        <ContentArea>
          <ContentGrid>
            {activeView === 'manage' && <CategoryManager />}

            {activeView === 'all' && (
              <PostsList key={refreshKey} activeCategory="all" />
            )}

            {isCategoryView && (
              <>
                <ProgrammeTabBar role="tablist" aria-label="Programmes">
                  {PROGRAMMES.map((programme) => (
                    <ProgrammeTab
                      key={programme.id}
                      type="button"
                      role="tab"
                      aria-selected={activeProgramme === programme.id}
                      $active={activeProgramme === programme.id}
                      onClick={() => setActiveProgramme(programme.id)}
                    >
                      {programme.label}
                    </ProgrammeTab>
                  ))}
                </ProgrammeTabBar>

                <ProcessForm
                  category={activeCategory}
                  categoryName={categories.find((c) => c.slug === activeCategory)?.name}
                  programme={activeProgramme}
                  programmeName={getProgrammeLabel(activeProgramme)}
                  onProcessed={() => setRefreshKey((k) => k + 1)}
                />
                <PostsList
                  key={refreshKey}
                  activeCategory={activeCategory}
                  activeProgramme={activeProgramme}
                />
              </>
            )}
          </ContentGrid>
        </ContentArea>
      </MainContent>
    </AppLayout>
  );
}

export default Dashboard;
