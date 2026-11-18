import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Search, Trash2, Users, X } from 'lucide-react';
import { api, ApiError, formatDateTime } from '../lib/api.ts';
import type { CampusEvent, User } from '../shared/types.ts';
import {
  canDeleteContent,
  canPublishContent,
  filterEvents,
} from '../shared/validation.ts';

interface EventsViewProps {
  user: User;
  createModalOpen: boolean;
  onCloseCreateModal: () => void;
  onOpenCreateModal: () => void;
}

const EVENT_CATEGORIES = [
  'All',
  'Seminar',
  'Workshop',
  'Career',
  'Cultural',
  'Sports',
] as const;

export const EventsView: React.FC<EventsViewProps> = ({
  user,
  createModalOpen,
  onCloseCreateModal,
  onOpenCreateModal,
}) => {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [onlyRsvped, setOnlyRsvped] = useState(false);

  // Create form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newCategory, setNewCategory] =
    useState<CampusEvent['category']>('Seminar');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('2026-11-22T10:00');
  const [capacity, setCapacity] = useState(100);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canPublish = canPublishContent(user.role);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEvents();
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleToggleRsvp = async (id: string) => {
    try {
      const { event } = await api.toggleEventRsvp(id);
      setEvents((prev) => prev.map((row) => (row.id === event.id ? event : row)));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to update event RSVP.'
      );
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (title.trim().length < 3 || description.trim().length < 10 || !location.trim()) {
      setFormError(
        'Event title, description (min 10 chars), and location are required.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const startIso = new Date(startsAt).toISOString();
      const endIso = new Date(
        new Date(startsAt).getTime() + 2 * 3600 * 1000
      ).toISOString();

      const { event } = await api.createEvent({
        title: title.trim(),
        description: description.trim(),
        category: newCategory,
        location: location.trim(),
        startsAt: startIso,
        endsAt: endIso,
        capacity,
      });
      setEvents((prev) => [...prev, event]);
      setTitle('');
      setDescription('');
      setLocation('');
      onCloseCreateModal();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Failed to create event.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await api.deleteEvent(id);
      setEvents((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to delete event.'
      );
    }
  };

  const filtered = filterEvents(events, query, category, onlyRsvped);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="Filter events by category"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md"
          >
            {EVENT_CATEGORIES.map((cat) => (
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

          <button
            type="button"
            aria-pressed={onlyRsvped}
            onClick={() => setOnlyRsvped((prev) => !prev)}
            className={`px-3 py-2 rounded-md border text-xs font-semibold transition-colors whitespace-nowrap ${
              onlyRsvped
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            My RSVPs Only
          </button>
        </div>

        <div className="relative w-full xl:w-72">
          <Search
            className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search campus events"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events or locations…"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-48 rounded-lg bg-white border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-900">
            No matching events scheduled
          </p>
          <p className="text-sm text-slate-500">
            Adjust your filter criteria or check back for upcoming campus sessions.
          </p>
          {canPublish && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="px-4 py-2 rounded-md bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800"
            >
              Create Event
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((evt) => {
            const allowManage = canDeleteContent(
              user.role,
              evt.organizerId,
              user.id
            );
            return (
              <article
                key={evt.id}
                className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-blue-700">
                        {evt.category} · Hosted by {evt.organizerName}
                      </p>
                      <h2 className="font-display text-base font-semibold text-slate-900">
                        {evt.title}
                      </h2>
                    </div>

                    {allowManage && (
                      <button
                        type="button"
                        aria-label={`Delete event "${evt.title}"`}
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {evt.description}
                  </p>

                  <div className="pt-1 space-y-1 text-xs text-slate-600 tabular-nums">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span>{formatDateTime(evt.startsAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span>{evt.location}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 tabular-nums">
                    <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>
                      {evt.rsvpCount} / {evt.capacity} attendees
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleRsvp(evt.id)}
                    className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      evt.isRsvped
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-blue-700 text-white hover:bg-blue-800'
                    }`}
                  >
                    {evt.isRsvped ? 'Going (Cancel)' : 'RSVP to Event'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      {createModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-event-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2
                id="create-event-title"
                className="font-display text-lg font-bold text-slate-900"
              >
                Create Campus Event
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

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label
                  htmlFor="evt-title"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Event Title
                </label>
                <input
                  id="evt-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Cloud Systems Architecture Workshop"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="evt-category"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="evt-category"
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as CampusEvent['category'])
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="Seminar">Seminar</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Career">Career</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Sports">Sports</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="evt-capacity"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Capacity
                  </label>
                  <input
                    id="evt-capacity"
                    type="number"
                    min={5}
                    max={2000}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="evt-location"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Location / Venue
                  </label>
                  <input
                    id="evt-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Auditorium B"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="evt-starts"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Date &amp; Time
                  </label>
                  <input
                    id="evt-starts"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="evt-desc"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="evt-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

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
                  {submitting ? 'Scheduling…' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
