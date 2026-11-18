import React, { useEffect, useState } from 'react';
import { Hash, Send, UserCheck, X } from 'lucide-react';
import { api, ApiError, formatDateTime } from '../lib/api.ts';
import type { Channel, ChatMessage, User } from '../shared/types.ts';
import { formatRoleLabel } from '../shared/validation.ts';

interface CommunicationViewProps {
  user: User;
  createModalOpen: boolean;
  onCloseCreateModal: () => void;
}

export const CommunicationView: React.FC<CommunicationViewProps> = ({
  user,
  createModalOpen,
  onCloseCreateModal,
}) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // Create channel form
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [channelType, setChannelType] =
    useState<Channel['channelType']>('channel');
  const [department, setDepartment] = useState(user.department);
  const [formError, setFormError] = useState<string | null>(null);

  const loadChannels = async () => {
    setLoadingChannels(true);
    setError(null);
    try {
      const data = await api.getChannels();
      setChannels(data.channels);
      if (data.channels.length > 0 && !activeChannelId) {
        setActiveChannelId(data.channels[0].id);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load channels.'
      );
    } finally {
      setLoadingChannels(false);
    }
  };

  useEffect(() => {
    loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeChannelId) return;
    let cancelled = false;
    setLoadingMessages(true);
    api
      .getMessages(activeChannelId)
      .then((data) => {
        if (!cancelled) setMessages(data.messages);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Failed to load messages.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeChannelId]);

  const activeChannel =
    channels.find((c) => c.id === activeChannelId) ?? null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannelId || !draft.trim()) return;

    setSending(true);
    setError(null);
    try {
      const { message } = await api.sendMessage(activeChannelId, draft.trim());
      setMessages((prev) => [...prev, message]);
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === activeChannelId
            ? {
                ...ch,
                messageCount: ch.messageCount + 1,
                lastMessageAt: message.createdAt,
                lastMessagePreview: message.body,
              }
            : ch
        )
      );
      setDraft('');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to send message.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (name.trim().length < 3 || topic.trim().length < 5) {
      setFormError(
        'Channel name (min 3 characters) and topic (min 5 characters) are required.'
      );
      return;
    }

    try {
      const { channel } = await api.createChannel({
        name: name.trim(),
        topic: topic.trim(),
        channelType,
        department: department.trim() || user.department,
      });
      setChannels((prev) => [channel, ...prev]);
      setActiveChannelId(channel.id);
      setName('');
      setTopic('');
      onCloseCreateModal();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Unable to create channel.'
      );
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-1 lg:grid-cols-12 min-h-[540px] overflow-hidden">
        {/* Channel List */}
        <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Campus Channels &amp; Advising
            </h2>
          </div>

          {loadingChannels ? (
            <div className="p-4 space-y-2" aria-busy="true">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="h-14 rounded bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 overflow-y-auto flex-1">
              {channels.map((ch) => {
                const isSelected = ch.id === activeChannelId;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActiveChannelId(ch.id)}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`w-full text-left px-4 py-3.5 transition-colors space-y-1 ${
                      isSelected
                        ? 'bg-blue-50/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 truncate">
                        {ch.channelType === 'direct' ? (
                          <UserCheck
                            className="h-3.5 w-3.5 text-blue-700 shrink-0"
                            aria-hidden="true"
                          />
                        ) : (
                          <Hash
                            className="h-3.5 w-3.5 text-slate-400 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <span className="truncate">{ch.name}</span>
                      </span>
                      <span className="text-xs font-mono text-slate-500 tabular-nums shrink-0">
                        {ch.messageCount}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {ch.lastMessagePreview || ch.topic}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Active Conversation Thread */}
        <section className="lg:col-span-8 flex flex-col justify-between">
          {activeChannel ? (
            <>
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="font-display text-base font-semibold text-slate-900">
                  {activeChannel.name}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeChannel.department} · {activeChannel.topic}
                </p>
              </div>

              <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[420px]">
                {loadingMessages ? (
                  <p className="text-sm text-slate-500">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No messages yet in this thread. Start the conversation below.
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className="space-y-1">
                        <div className="flex items-baseline gap-2 text-xs">
                          <span className="font-semibold text-slate-900">
                            {msg.senderName}
                            {isSelf ? ' (You)' : ''}
                          </span>
                          <span className="text-slate-500">
                            {formatRoleLabel(msg.senderRole)} ·{' '}
                            <span className="tabular-nums">
                              {formatDateTime(msg.createdAt)}
                            </span>
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 leading-relaxed">
                          {msg.body}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={handleSend}
                className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3"
              >
                <label htmlFor="chat-compose" className="sr-only">
                  Write a message
                </label>
                <input
                  id="chat-compose"
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${activeChannel.name}…`}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="p-8 text-sm text-slate-500">
              Select a channel to view conversation history.
            </div>
          )}
        </section>
      </div>

      {/* Create Channel Modal */}
      {createModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-channel-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2
                id="new-channel-title"
                className="font-display text-lg font-bold text-slate-900"
              >
                Start Campus Thread
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

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label
                  htmlFor="chn-name"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Channel or Thread Name
                </label>
                <input
                  id="chn-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., CS-304 Project Group 4"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="chn-type"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Type
                  </label>
                  <select
                    id="chn-type"
                    value={channelType}
                    onChange={(e) =>
                      setChannelType(e.target.value as Channel['channelType'])
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="channel">Course / Campus Channel</option>
                    <option value="direct">Faculty Advising Thread</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="chn-dept"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Department
                  </label>
                  <input
                    id="chn-dept"
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="chn-topic"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Topic
                </label>
                <input
                  id="chn-topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Purpose of this discussion channel"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCloseCreateModal}
                  className="px-4 py-2 rounded-md border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
                >
                  Create Thread
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
