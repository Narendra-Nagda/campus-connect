import React, { useEffect, useState } from 'react';
import { Download, ShieldAlert, Trash2, X } from 'lucide-react';
import {
  api,
  ApiError,
  formatShortDate,
  triggerTextDownload,
} from '../lib/api.ts';
import type { User, UserRole, UserStatus } from '../shared/types.ts';

interface AdminViewProps {
  currentUser: User;
  createModalOpen: boolean;
  onCloseCreateModal: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  createModalOpen,
  onCloseCreateModal,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null);

  // Add User modal state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [role, setRole] = useState<UserRole>('student');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminUsers();
      setUsers(data.users);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load user directory.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (currentUser.role !== 'admin') {
    return (
      <div
        role="alert"
        className="bg-white border border-red-200 rounded-lg p-8 flex items-start gap-3 text-red-800"
      >
        <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold">
            Administrator Access Required (REQ-5)
          </h2>
          <p className="text-sm text-red-700">
            Your account does not hold administrator privileges to view or modify
            campus user accounts.
          </p>
        </div>
      </div>
    );
  }

  const handleRoleChange = async (id: string, nextRole: UserRole) => {
    try {
      const { user } = await api.updateAdminUser(id, { role: nextRole });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to update user role.'
      );
    }
  };

  const handleStatusToggle = async (user: User) => {
    const nextStatus: UserStatus =
      user.status === 'active' ? 'suspended' : 'active';
    try {
      const { user: updated } = await api.updateAdminUser(user.id, {
        status: nextStatus,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to update user status.'
      );
    }
  };

  const handleDeleteUser = async (user: User) => {
    try {
      await api.deleteAdminUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setConfirmDeleteUser(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to delete user.'
      );
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (
      fullName.trim().length < 2 ||
      username.trim().length < 3 ||
      !email.includes('@') ||
      password.length < 6
    ) {
      setFormError(
        'Please complete all fields (password minimum 6 characters).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await api.createAdminUser({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        department: department.trim() || 'General',
        role,
        password,
      });
      setUsers((prev) => [user, ...prev]);
      setFullName('');
      setUsername('');
      setEmail('');
      setPassword('');
      onCloseCreateModal();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Unable to add user.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportBackup = async () => {
    setBackupNotice(null);
    setError(null);
    try {
      const snapshot = await api.getBackupSnapshot();
      const stamp = new Date().toISOString().slice(0, 10);
      triggerTextDownload(
        `campus-connect-backup-${stamp}.json`,
        JSON.stringify(snapshot, null, 2),
        'application/json;charset=utf-8'
      );
      setBackupNotice(`Database backup exported (${stamp}).`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to generate backup.'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Safety & Backup Strip (SRS Section 5.2) */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Data Safety &amp; Database Backup
          </h2>
          <p className="text-sm text-slate-600">
            Export a full JSON snapshot of users, announcements, events,
            resources, and communication threads to prevent accidental data loss.
          </p>
          {backupNotice && (
            <p className="text-xs font-medium text-emerald-700">
              {backupNotice}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleExportBackup}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-900 whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Export JSON Backup</span>
        </button>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {/* User Directory Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Campus User Accounts ({users.length})
          </h2>
          <span className="text-xs text-slate-500">
            Manage user roles and account status
          </span>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading user directory…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {users.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">
                          {u.fullName}
                          {isSelf ? ' (You)' : ''}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {u.username} · {u.email}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {u.department}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          aria-label={`Role for ${u.fullName}`}
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value as UserRole)
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 disabled:opacity-60"
                        >
                          <option value="student">Student</option>
                          <option value="faculty">Faculty</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium whitespace-nowrap">
                        <span
                          className={
                            u.status === 'active'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }
                        >
                          {u.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatShortDate(u.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleStatusToggle(u)}
                            className="px-3 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            aria-label={`Delete user ${u.fullName}`}
                            onClick={() => setConfirmDeleteUser(u)}
                            className="p-2 rounded border border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50 disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add User Modal */}
      {createModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2
                id="add-user-title"
                className="font-display text-lg font-bold text-slate-900"
              >
                Add Campus Account
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

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label
                  htmlFor="adm-fullname"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="adm-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="adm-username"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Username
                  </label>
                  <input
                    id="adm-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="adm-role"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Role
                  </label>
                  <select
                    id="adm-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="adm-email"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Email
                </label>
                <input
                  id="adm-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="adm-dept"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Department
                  </label>
                  <input
                    id="adm-dept"
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="adm-pass"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Initial Password
                  </label>
                  <input
                    id="adm-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
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
                  disabled={submitting}
                  className="px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {submitting ? 'Adding…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {confirmDeleteUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-del-user"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-sm p-6 space-y-4">
            <h2
              id="confirm-del-user"
              className="font-display text-base font-bold text-slate-900"
            >
              Remove user account?
            </h2>
            <p className="text-sm text-slate-600">
              Permanently remove{' '}
              <span className="font-semibold text-slate-900">
                {confirmDeleteUser.fullName}
              </span>{' '}
              ({confirmDeleteUser.email}) from Campus Connect?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="px-3.5 py-2 rounded-md border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(confirmDeleteUser)}
                className="px-3.5 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Remove User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
