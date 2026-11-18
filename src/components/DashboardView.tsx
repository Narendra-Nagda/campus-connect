import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  FileText,
  Megaphone,
  MessageSquare,
  Pin,
} from 'lucide-react';
import { api, ApiError, formatDateTime, formatShortDate } from '../lib/api.ts';
import type { DashboardSummary, User } from '../shared/types.ts';
import { formatRoleLabel } from '../shared/validation.ts';
import type { NavSection } from './Sidebar.tsx';

interface DashboardViewProps {
  user: User;
  onNavigate: (section: NavSection) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onNavigate,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboard();
      setSummary(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load campus overview.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleQuickRsvp = async (eventId: string) => {
    try {
      const { event } = await api.toggleEventRsvp(eventId);
      setSummary((prev) => {
        if (!prev) return prev;
        const delta = event.isRsvped ? 1 : -1;
        return {
          ...prev,
          counts: {
            ...prev.counts,
            myRsvps: Math.max(0, prev.counts.myRsvps + delta),
          },
          upcomingEvents: prev.upcomingEvents.map((item) =>
            item.id === event.id ? event : item
          ),
        };
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update RSVP.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-24 rounded-lg bg-white border border-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-24 rounded-lg bg-white border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-6 flex items-center justify-between gap-4"
      >
        <p className="text-sm text-red-800">{error || 'Unable to load dashboard.'}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="px-3.5 py-2 rounded-md bg-white border border-red-200 text-xs font-semibold text-red-800 hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  const statItems = [
    {
      label: 'Campus Announcements',
      value: summary.counts.announcements,
      section: 'announcements' as NavSection,
      icon: Megaphone,
    },
    {
      label: 'Upcoming Events',
      value: summary.counts.upcomingEvents,
      section: 'events' as NavSection,
      icon: Calendar,
    },
    {
      label: 'Academic Resources',
      value: summary.counts.resources,
      section: 'resources' as NavSection,
      icon: FileText,
    },
    {
      label:
        user.role === 'admin' && summary.counts.totalUsers !== undefined
          ? 'Registered Users'
          : 'Active Channels',
      value:
        user.role === 'admin' && summary.counts.totalUsers !== undefined
          ? summary.counts.totalUsers
          : summary.counts.channels,
      section:
        user.role === 'admin'
          ? ('admin' as NavSection)
          : ('communication' as NavSection),
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-blue-700">
            {formatRoleLabel(user.role)} Workspace · {user.department}
          </p>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Welcome back, {user.fullName}
          </h2>
          <p className="text-sm text-slate-600">
            You have{' '}
            <span className="font-semibold text-slate-900 tabular-nums">
              {summary.counts.myRsvps}
            </span>{' '}
            upcoming event RSVP{summary.counts.myRsvps === 1 ? '' : 's'} and access
            to{' '}
            <span className="font-semibold text-slate-900 tabular-nums">
              {summary.counts.resources}
            </span>{' '}
            academic documents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('communication')}
            className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors whitespace-nowrap"
          >
            Open Messages
          </button>
          <button
            type="button"
            onClick={() => onNavigate('guide')}
            className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            Read User Guide
          </button>
        </div>
      </section>

      {/* Summary Strip */}
      <section aria-label="Campus metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => onNavigate(stat.section)}
              className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-5 transition-colors flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                <p className="font-display text-2xl font-bold text-slate-900 tabular-nums">
                  {stat.value}
                </p>
              </div>
              <Icon className="h-5 w-5 text-slate-400 shrink-0" aria-hidden="true" />
            </button>
          );
        })}
      </section>

      {/* Two-Column Main Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Announcements */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Latest Campus Announcements
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('announcements')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="divide-y divide-slate-200">
            {summary.recentAnnouncements.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-500">
                No announcements have been published yet.
              </p>
            ) : (
              summary.recentAnnouncements.map((item) => (
                <article key={item.id} className="px-6 py-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    {item.isPinned && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 shrink-0">
                        <Pin className="h-3 w-3" aria-hidden="true" />
                        Pinned
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{item.body}</p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {item.category} · {item.department} · {item.authorName} ·{' '}
                    {formatShortDate(item.createdAt)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Upcoming Events + Quick Resources */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-slate-200 rounded-lg">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Upcoming Events
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('events')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
              >
                <span>All events</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="divide-y divide-slate-200">
              {summary.upcomingEvents.length === 0 ? (
                <p className="px-6 py-8 text-sm text-slate-500">
                  No upcoming events scheduled.
                </p>
              ) : (
                summary.upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="px-6 py-4 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {evt.title}
                      </h3>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {formatDateTime(evt.startsAt)} · {evt.location}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {evt.rsvpCount} / {evt.capacity} registered
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickRsvp(evt.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        evt.isRsvped
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {evt.isRsvped ? 'Going' : 'RSVP'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Recent Academic Resources
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('resources')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
              >
                <span>Browse</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="divide-y divide-slate-200">
              {summary.recentResources.map((res) => (
                <div key={res.id} className="px-6 py-3.5 space-y-0.5">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {res.title}
                  </p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {res.courseCode} · {res.resourceType} · {res.fileSizeLabel}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
