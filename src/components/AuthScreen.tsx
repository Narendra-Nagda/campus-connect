import React, { useState } from 'react';
import { Eye, EyeOff, GraduationCap, ShieldAlert } from 'lucide-react';
import { api, ApiError } from '../lib/api.ts';
import type { AuthSession } from '../shared/types.ts';
import {
  validateLoginInput,
  validateRegistrationInput,
} from '../shared/validation.ts';

interface AuthScreenProps {
  onAuthenticated: (session: AuthSession) => void;
}

const DEMO_ACCOUNTS = [
  {
    label: 'Student',
    name: 'Arju Prajapati',
    identifier: 'arju@campus.edu',
    password: 'student123',
    summary: 'View notices, RSVP events, access resources, message faculty',
  },
  {
    label: 'Faculty',
    name: 'Prof. Nandani Prajapat',
    identifier: 'nandani@campus.edu',
    password: 'faculty123',
    summary: 'Publish announcements, organize events, share course materials',
  },
  {
    label: 'Administrator',
    name: 'Narendra Nagda',
    identifier: 'admin@campus.edu',
    password: 'admin123',
    summary: 'Manage users & roles, moderate content, export database backups',
  },
] as const;

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [regRole, setRegRole] = useState<'student' | 'faculty'>('student');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const check = validateLoginInput(identifier, password);
    if (!check.valid) {
      setError(check.error || 'Please enter valid credentials.');
      return;
    }

    setSubmitting(true);
    try {
      const session = await api.login(identifier, password);
      onAuthenticated(session);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to reach Campus Connect server. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const check = validateRegistrationInput({
      fullName,
      username,
      email,
      password,
      department,
      role: regRole,
    });
    if (!check.valid) {
      setError(check.error || 'Please check your registration details.');
      return;
    }

    setSubmitting(true);
    try {
      const session = await api.register({
        fullName,
        username,
        email,
        password,
        department,
        role: regRole,
      });
      onAuthenticated(session);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to create account right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const applyDemoAccount = (demoIdentifier: string, demoPassword: string) => {
    setMode('login');
    setError(null);
    setIdentifier(demoIdentifier);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              Campus Connect
            </span>
          </div>
          <p className="hidden sm:block text-sm text-slate-600">
            Unified Academic Information &amp; Communication Portal
          </p>
        </div>
      </header>

      <main className="flex-1 flex items-center py-10 px-6">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Institutional Overview & Role Matrix */}
          <section className="lg:col-span-7 space-y-8">
            <div className="space-y-3">
              <p className="text-xs font-medium text-blue-700 tracking-wide">
                Academic Portal · Role-Based Access
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 max-w-xl text-balance">
                One platform for campus announcements, events, resources, and advising.
              </h1>
              <p className="text-base text-slate-600 max-w-xl leading-relaxed">
                Campus Connect brings students, faculty members, and campus
                administrators into a single authenticated workspace with clear
                role permissions and real-time updates.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
              <div className="px-5 py-3.5 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  Quick-Fill Demo Accounts
                </h2>
                <span className="text-xs text-slate-500">
                  Select a role to prefill credentials
                </span>
              </div>
              {DEMO_ACCOUNTS.map((acct) => (
                <div
                  key={acct.identifier}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span>{acct.name}</span>
                      <span aria-hidden="true" className="text-slate-400">
                        ·
                      </span>
                      <span className="text-blue-700 font-medium">
                        {acct.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{acct.summary}</p>
                    <p className="text-xs font-mono text-slate-500 tabular-nums">
                      {acct.identifier} / {acct.password}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      applyDemoAccount(acct.identifier, acct.password)
                    }
                    className="px-3.5 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    Use {acct.label}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Right Auth Form Card */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
            <div
              role="tablist"
              aria-label="Authentication mode"
              className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md mb-6"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`py-2 text-sm font-medium rounded transition-colors whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`py-2 text-sm font-medium rounded transition-colors whitespace-nowrap ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Register Account
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
              >
                <ShieldAlert
                  className="h-4 w-4 text-red-600 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{error}</span>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Username or Email
                  </label>
                  <input
                    id="login-identifier"
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="arju@campus.edu"
                    className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-800"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-md bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  {submitting ? 'Verifying credentials…' : 'Sign In to Dashboard'}
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleRegisterSubmit}
                noValidate
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="reg-fullname"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="reg-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Priya Verma"
                    className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-username"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Username
                    </label>
                    <input
                      id="reg-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="priya.verma"
                      className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reg-role"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Account Role
                    </label>
                    <select
                      id="reg-role"
                      value={regRole}
                      onChange={(e) =>
                        setRegRole(e.target.value as 'student' | 'faculty')
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Campus Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@campus.edu"
                    className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-department"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Department
                    </label>
                    <input
                      id="reg-department"
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reg-password"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Password
                    </label>
                    <input
                      id="reg-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-md bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  {submitting ? 'Creating account…' : 'Create Campus Account'}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Campus Connect · Software Requirements Specification Implementation</span>
          <span>
            Prepared by Arju Prajapati, Nandani Prajapat, Narendra Nagda &amp; Shukh Vansh Bhatiya
          </span>
        </div>
      </footer>
    </div>
  );
};
