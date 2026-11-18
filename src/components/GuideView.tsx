import React from 'react';
import type { User } from '../shared/types.ts';
import { formatRoleLabel } from '../shared/validation.ts';

interface GuideViewProps {
  user: User;
}

const GLOSSARY = [
  { term: 'SRS', meaning: 'Software Requirements Specification' },
  {
    term: 'User',
    meaning: 'A student, faculty member, or administrator using Campus Connect',
  },
  {
    term: 'Administrator',
    meaning: 'Person responsible for managing the Campus Connect system',
  },
  { term: 'Authentication', meaning: "Process of verifying a user's identity" },
  { term: 'Database', meaning: 'Storage system used to store application data' },
  {
    term: 'Dashboard',
    meaning: 'Main screen showing important information and features',
  },
  {
    term: 'API',
    meaning:
      'Application Programming Interface used for communication between software components',
  },
  {
    term: 'HTTPS',
    meaning: 'Secure protocol used to transfer data over the internet',
  },
];

export const GuideView: React.FC<GuideViewProps> = ({ user }) => {
  return (
    <div className="space-y-6 max-w-4xl">
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-2">
        <p className="text-xs font-medium text-blue-700">
          Section 2.6 · User &amp; Administrator Documentation
        </p>
        <h2 className="font-display text-xl font-bold text-slate-900">
          Campus Connect Guide
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Signed in as{' '}
          <span className="font-semibold text-slate-900">{user.fullName}</span>{' '}
          ({formatRoleLabel(user.role)}). This documentation explains how to
          register, authenticate, access campus features, and administer the
          platform.
        </p>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        <div className="p-6 space-y-1.5">
          <h3 className="font-display text-base font-semibold text-slate-900">
            01. Registration &amp; Authentication
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            New students and faculty members can create an account from the
            Register tab using a unique username, campus email, department, and
            password. Existing users sign in with their username or email and
            password. Invalid credentials display a clear verification error and
            block access to protected features.
          </p>
        </div>

        <div className="p-6 space-y-1.5">
          <h3 className="font-display text-base font-semibold text-slate-900">
            02. Announcements &amp; Campus Events
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Use the Announcements tab to read pinned notices and filter updates
            by Academic, Examination, Campus Life, or Administration categories.
            In Events, students and faculty can browse upcoming seminars and
            workshops, filter by category, and click RSVP to reserve a seat.
            Faculty and Administrators can publish new announcements and create
            events.
          </p>
        </div>

        <div className="p-6 space-y-1.5">
          <h3 className="font-display text-base font-semibold text-slate-900">
            03. Academic Resources &amp; Communication
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Academic Resources provides syllabi, lecture notes, lab manuals, and
            campus forms. Preview any document directly in the browser or
            download a copy. In Communication, select a course channel or
            faculty advising thread to exchange messages with authorized campus
            members.
          </p>
        </div>

        <div className="p-6 space-y-1.5">
          <h3 className="font-display text-base font-semibold text-slate-900">
            04. Administrator Guide &amp; Data Safety
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Administrators have access to the Admin Console to create accounts,
            assign Student, Faculty, or Administrator roles, suspend or
            reactivate accounts, and export full JSON database backups to prevent
            accidental data loss.
          </p>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-display text-base font-semibold text-slate-900">
            System Glossary
          </h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-2.5 px-6 w-44">Term</th>
              <th className="py-2.5 px-6">Meaning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {GLOSSARY.map((row) => (
              <tr key={row.term}>
                <td className="py-3 px-6 font-semibold text-slate-900">
                  {row.term}
                </td>
                <td className="py-3 px-6 text-slate-600">{row.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-1">
        <h3 className="font-display text-sm font-semibold text-slate-900">
          Project Team Credits
        </h3>
        <p className="text-sm text-slate-600">
          Arju Prajapati · Nandani Prajapat · Narendra Nagda · Shukh Vansh Bhatiya
        </p>
      </section>
    </div>
  );
};
