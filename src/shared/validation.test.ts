import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canDeleteContent,
  canManageUsers,
  canPublishContent,
  filterAnnouncements,
  filterEvents,
  filterResources,
  validateLoginInput,
  validateRegistrationInput,
} from './validation.ts';
import type { AcademicResource, Announcement, CampusEvent } from './types.ts';

test('RBAC permissions enforce REQ-4 and REQ-5 role boundaries', () => {
  assert.equal(canPublishContent('student'), false);
  assert.equal(canPublishContent('faculty'), true);
  assert.equal(canPublishContent('admin'), true);

  assert.equal(canManageUsers('student'), false);
  assert.equal(canManageUsers('faculty'), false);
  assert.equal(canManageUsers('admin'), true);

  assert.equal(canDeleteContent('student', 'u1', 'u1'), false);
  assert.equal(canDeleteContent('faculty', 'u1', 'u1'), true);
  assert.equal(canDeleteContent('faculty', 'u2', 'u1'), false);
  assert.equal(canDeleteContent('admin', 'u2', 'u1'), true);
});

test('validateLoginInput rejects empty identifier or password (REQ-3)', () => {
  assert.equal(validateLoginInput('', 'secret123').valid, false);
  assert.equal(validateLoginInput('   ', 'secret123').valid, false);
  assert.equal(validateLoginInput('arju@campus.edu', '').valid, false);
  assert.equal(validateLoginInput('arju@campus.edu', 'campus123').valid, true);
});

test('validateRegistrationInput validates email, username, password, and blocks admin self-signup', () => {
  const valid = validateRegistrationInput({
    fullName: 'Riya Sharma',
    username: 'riya.sharma',
    email: 'riya@campus.edu',
    password: 'password123',
    department: 'Computer Science',
    role: 'student',
  });
  assert.equal(valid.valid, true);

  const badEmail = validateRegistrationInput({
    fullName: 'Riya Sharma',
    username: 'riya.sharma',
    email: 'invalid-email',
    password: 'password123',
    department: 'Computer Science',
    role: 'student',
  });
  assert.equal(badEmail.valid, false);

  const adminAttempt = validateRegistrationInput({
    fullName: 'Test Admin',
    username: 'test.admin',
    email: 'test@campus.edu',
    password: 'password123',
    department: 'Administration',
    role: 'admin',
  });
  assert.equal(adminAttempt.valid, false);
});

test('filterAnnouncements prioritizes pinned items and filters by category and query', () => {
  const sample: Announcement[] = [
    {
      id: 'a1',
      title: 'Regular Notice',
      body: 'Library closes at 9 PM',
      category: 'Campus Life',
      department: 'General',
      isPinned: false,
      authorId: 'u2',
      authorName: 'Faculty',
      authorRole: 'faculty',
      createdAt: '2026-11-15T10:00:00.000Z',
    },
    {
      id: 'a2',
      title: 'Mid-Term Exam Schedule',
      body: 'CS-301 exam on Friday',
      category: 'Examination',
      department: 'Computer Science',
      isPinned: true,
      authorId: 'u2',
      authorName: 'Faculty',
      authorRole: 'faculty',
      createdAt: '2026-11-14T10:00:00.000Z',
    },
  ];

  const all = filterAnnouncements(sample, '', 'All');
  assert.equal(all[0].id, 'a2');

  const filtered = filterAnnouncements(sample, 'library', 'Campus Life');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'a1');
});

test('filterEvents and filterResources filter accurately', () => {
  const events: CampusEvent[] = [
    {
      id: 'e1',
      title: 'SE Symposium',
      description: 'SRS walkthrough',
      category: 'Seminar',
      location: 'Auditorium A',
      startsAt: '2026-11-20T10:00:00.000Z',
      endsAt: '2026-11-20T12:00:00.000Z',
      capacity: 100,
      organizerId: 'u2',
      organizerName: 'Prof. Nandani',
      rsvpCount: 12,
      isRsvped: true,
      createdAt: '2026-11-10T10:00:00.000Z',
    },
    {
      id: 'e2',
      title: 'Hackathon',
      description: 'Campus build sprint',
      category: 'Workshop',
      location: 'Lab 2',
      startsAt: '2026-11-18T09:00:00.000Z',
      endsAt: '2026-11-18T17:00:00.000Z',
      capacity: 60,
      organizerId: 'u2',
      organizerName: 'Prof. Nandani',
      rsvpCount: 25,
      isRsvped: false,
      createdAt: '2026-11-10T10:00:00.000Z',
    },
  ];

  assert.equal(filterEvents(events, '', 'All')[0].id, 'e2');
  assert.equal(filterEvents(events, '', 'All', true).length, 1);

  const resources: AcademicResource[] = [
    {
      id: 'r1',
      title: 'SE Lab Manual',
      description: 'SRS documentation guide',
      resourceType: 'Lab Manual',
      department: 'Computer Science',
      courseCode: 'CS-301',
      fileName: 'cs301-lab-manual.txt',
      fileSizeLabel: '14 KB',
      contentBody: 'Experiment 2',
      downloadCount: 5,
      uploadedById: 'u2',
      uploadedByName: 'Prof. Nandani',
      createdAt: '2026-11-12T10:00:00.000Z',
    },
  ];

  assert.equal(filterResources(resources, 'CS-301', 'Lab Manual', 'Computer Science').length, 1);
  assert.equal(filterResources(resources, 'CS-301', 'Syllabus', 'Computer Science').length, 0);
});
