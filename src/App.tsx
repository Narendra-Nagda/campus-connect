import { useEffect, useState } from 'react';
import { api, getStoredToken, setStoredToken } from './lib/api.ts';
import type { AuthSession, User } from './shared/types.ts';
import { AuthScreen } from './components/AuthScreen.tsx';
import { Sidebar, type NavSection } from './components/Sidebar.tsx';
import { TopHeader } from './components/TopHeader.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { AnnouncementsView } from './components/AnnouncementsView.tsx';
import { EventsView } from './components/EventsView.tsx';
import { ResourcesView } from './components/ResourcesView.tsx';
import { CommunicationView } from './components/CommunicationView.tsx';
import { AdminView } from './components/AdminView.tsx';
import { GuideView } from './components/GuideView.tsx';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Contextual create modal state per section
  const [createModalSection, setCreateModalSection] =
    useState<NavSection | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setCheckingSession(false);
      return;
    }

    api
      .getMe()
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => {
        setCheckingSession(false);
      });
  }, []);

  const handleAuthenticated = (session: AuthSession) => {
    setStoredToken(session.token);
    setUser(session.user);
    setActiveSection('dashboard');
  };

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    setActiveSection('dashboard');
    setCreateModalSection(null);
  };

  const handleSelectSection = (section: NavSection) => {
    setCreateModalSection(null);
    setActiveSection(section);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-medium text-slate-600">
          Loading Campus Connect…
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        user={user}
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          user={user}
          activeSection={activeSection}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onPrimaryAction={() => setCreateModalSection(activeSection)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardView user={user} onNavigate={handleSelectSection} />
          )}

          {activeSection === 'announcements' && (
            <AnnouncementsView
              user={user}
              createModalOpen={createModalSection === 'announcements'}
              onOpenCreateModal={() => setCreateModalSection('announcements')}
              onCloseCreateModal={() => setCreateModalSection(null)}
            />
          )}

          {activeSection === 'events' && (
            <EventsView
              user={user}
              createModalOpen={createModalSection === 'events'}
              onOpenCreateModal={() => setCreateModalSection('events')}
              onCloseCreateModal={() => setCreateModalSection(null)}
            />
          )}

          {activeSection === 'resources' && (
            <ResourcesView
              user={user}
              createModalOpen={createModalSection === 'resources'}
              onOpenCreateModal={() => setCreateModalSection('resources')}
              onCloseCreateModal={() => setCreateModalSection(null)}
            />
          )}

          {activeSection === 'communication' && (
            <CommunicationView
              user={user}
              createModalOpen={createModalSection === 'communication'}
              onCloseCreateModal={() => setCreateModalSection(null)}
            />
          )}

          {activeSection === 'admin' && (
            <AdminView
              currentUser={user}
              createModalOpen={createModalSection === 'admin'}
              onCloseCreateModal={() => setCreateModalSection(null)}
            />
          )}

          {activeSection === 'guide' && <GuideView user={user} />}
        </main>
      </div>
    </div>
  );
}
