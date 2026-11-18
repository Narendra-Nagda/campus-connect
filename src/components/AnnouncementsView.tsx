import React, { useEffect, useState } from 'react';
import { Pin, Search, Trash2, X } from 'lucide-react';
import { api, ApiError, formatShortDate } from '../lib/api.ts';
import type { Announcement, User } from '../shared/types.ts';
import {
  canDeleteContent,
  canPublishContent,
  filterAnnouncements,
  formatRoleLabel,
} from '../shared/validation.ts';

interface AnnouncementsViewProps {
  user: User;
  createModalOpen: boolean;
  onCloseCreateModal: () => void;
  onOpenCreateModal: () => void;
}

const CATEGORIES = [
  'All',
  'Academic',
  'Examination',
  'Campus Life',
  'Administration',
] as const;

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  user,
  createModalOpen,
  onCloseCreateModal,
  onOpenCreateModal,
}) => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');

  // Create form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [newCategory, setNewCategory] =
    useState<Announcement['category']>('Academic');
  const [department, setDepartment] = useState(user.department);
  const [isPinned, setIsPinned] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const canPublish = canPublishContent(user.role);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAnnouncements();
      setItems(data.announcements);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load announcements.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (title.trim().length < 3 || body.trim().length < 10) {
      setFormError(
        'Please enter a title (min 3 characters) and content (min 10 characters).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const { announcement } = await api.createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        category: newCategory,
        department: department.trim() || user.department,
        isPinned,
      });
      setItems((prev) => [announcement, ...prev]);
      setTitle('');
      setBody('');
      setIsPinned(false);
      onCloseCreateModal();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Failed to publish announcement.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (item: Announcement) => {
    try {
      const { announcement } = await api.togglePinAnnouncement(
        item.id,
        !item.isPinned
      );
      setItems((prev) =>
        prev.map((row) => (row.id === announcement.id ? announcement : row))
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to update pin state.'
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAnnouncement(id);
      setItems((prev) => prev.filter((row) => row.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to delete announcement.'
      );
    }
  };

  const filtered = filterAnnouncements(items, query, category);

  return (
    <div className="space-y-6">
      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Filter announcements by category"
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={category === cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                category === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search
            className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search announcements"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search announcements…"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="h-28 rounded-lg bg-white border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-900">
            No matching announcements found
          </p>
          <p className="text-sm text-slate-500">
            Try clearing your search query or selecting a different category.
          </p>
          {canPublish && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="px-4 py-2 rounded-md bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800"
            >
              Post Announcement
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {filtered.map((item) => {
            const allowManage = canDeleteContent(
              user.role,
              item.authorId,
              user.id
            );
            return (
              <article key={item.id} className="p-6 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="font-display text-base font-semibold text-slate-900">
                        {item.title}
                      </h2>
                      {item.isPinned && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                          <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {item.category} · {item.department} · Posted by{' '}
                      {item.authorName} ({formatRoleLabel(item.authorRole)}) ·{' '}
                      {formatShortDate(item.createdAt)}
                    </p>
                  </div>

                  {allowManage && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(item)}
                        className="px-2.5 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {item.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete announcement "${item.title}"`}
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {item.body}
                </p>
              </article>
            );
          })}
        </div>
      )}

      {/* Create Announcement Modal */}
      {createModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-announcement-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2
                id="create-announcement-title"
                className="font-display text-lg font-bold text-slate-900"
              >
                Post Campus Announcement
              </h2>
              <button
                type="button"
                aria-label="Close modal"
                onClick={onCloseCreateModal}
                className="p-1.5 rounded text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {formError && (
              <p
                role="alert"
                className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                {formError}
              </p>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label
                  htmlFor="ann-title"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Title
                </label>
                <input
                  id="ann-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., CS-301 Mid-Term Lab Schedule"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="ann-category"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="ann-category"
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as Announcement['category'])
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Examination">Examination</option>
                    <option value="Campus Life">Campus Life</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="ann-dept"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Department
                  </label>
                  <input
                    id="ann-dept"
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="ann-body"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Announcement Details
                </label>
                <textarea
                  id="ann-body"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Provide clear dates, locations, and instructions…"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Pin this announcement to the top of the feed</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCloseCreateModal}
                  className="px-4 py-2 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {submitting ? 'Publishing…' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Safety 5.2) */}
      {confirmDeleteId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-ann"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-sm p-6 space-y-4">
            <h2
              id="confirm-delete-ann"
              className="font-display text-base font-bold text-slate-900"
            >
              Delete announcement?
            </h2>
            <p className="text-sm text-slate-600">
              This action permanently removes the announcement from Campus Connect.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3.5 py-2 rounded-md border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-3.5 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
