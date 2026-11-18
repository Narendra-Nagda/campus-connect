import React from 'react';
import {
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { User } from '../shared/types.ts';
import { formatRoleLabel } from '../shared/validation.ts';

export type NavSection =
  | 'dashboard'
  | 'announcements'
  | 'events'
  | 'resources'
  | 'communication'
  | 'admin'
  | 'guide';

interface SidebarProps {
  user: User;
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'resources', label: 'Resources', icon: FileText },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'admin', label: 'Admin Console', icon: ShieldCheck, adminOnly: true },
  { id: 'guide', label: 'User Guide', icon: HelpCircle },
];

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeSection,
  onSelectSection,
  onLogout,
  mobileOpen,
  onCloseMobile,
}) => {
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user.role === 'admin'
  );

  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const content = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100 w-64">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-700 text-white shrink-0">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-white">
            Campus Connect
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <nav
        aria-label="Primary campus navigation"
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="h-9 w-9 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 shrink-0"
          >
            {initials || 'CC'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user.fullName}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {formatRoleLabel(user.role)} · {user.department}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block shrink-0 border-r border-slate-800 sticky top-0 h-screen">
        {content}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};

export const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  announcements: 'Announcements',
  events: 'Campus Events',
  resources: 'Academic Resources',
  communication: 'Communication',
  admin: 'Admin Console',
  guide: 'User Documentation',
};

export { BookOpen };
