import React from 'react';
import { Menu, Plus } from 'lucide-react';
import type { User } from '../shared/types.ts';
import { canPublishContent, formatRoleLabel } from '../shared/validation.ts';
import { SECTION_TITLES, type NavSection } from './Sidebar.tsx';

interface TopHeaderProps {
  user: User;
  activeSection: NavSection;
  onOpenMobileMenu: () => void;
  onPrimaryAction?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  user,
  activeSection,
  onOpenMobileMenu,
  onPrimaryAction,
}) => {
  const canPublish = canPublishContent(user.role);

  let primaryLabel: string | null = null;
  if (activeSection === 'announcements' && canPublish) {
    primaryLabel = 'Post Announcement';
  } else if (activeSection === 'events' && canPublish) {
    primaryLabel = 'Create Event';
  } else if (activeSection === 'resources' && canPublish) {
    primaryLabel = 'Share Resource';
  } else if (activeSection === 'communication') {
    primaryLabel = 'New Channel';
  } else if (activeSection === 'admin' && user.role === 'admin') {
    primaryLabel = 'Add User';
  }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline text-slate-500 whitespace-nowrap">
            Campus Connect
          </span>
          <span
            aria-hidden="true"
            className="hidden sm:inline text-slate-300"
          >
            /
          </span>
          <h1 className="font-display font-semibold text-slate-900 truncate">
            {SECTION_TITLES[activeSection]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <span className="hidden md:inline text-xs text-slate-500 whitespace-nowrap">
          {user.fullName} · {formatRoleLabel(user.role)}
        </span>

        {primaryLabel && onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{primaryLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
};
