import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { openDatabase } from './db.ts';
import { createApiApp } from './app.ts';

async function withServer(
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const db = openDatabase(':memory:');
  const app = createApiApp(db);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
  }
}

test('API enforces REQ-1..REQ-5 authentication, invalid login error, and role permissions', async () => {
  await withServer(async (baseUrl) => {
    // REQ-5: Unauthenticated request blocked
    const unauth = await fetch(`${baseUrl}/api/announcements`);
    assert.equal(unauth.status, 401);

    // REQ-3: Invalid password returns clear error
    const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'arju@campus.edu', password: 'wrong' }),
    });
    assert.equal(badLogin.status, 401);
    const badJson = (await badLogin.json()) as { error: string };
    assert.match(badJson.error, /Invalid/i);

    // REQ-1 & REQ-2: Valid student login succeeds
    const studentLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'arju@campus.edu',
        password: 'student123',
      }),
    });
    assert.equal(studentLogin.status, 200);
    const { token: studentToken } = (await studentLogin.json()) as {
      token: string;
    };

    // REQ-4 & REQ-5: Student cannot post announcement or access admin users
    const forbiddenAnn = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Unauthorized',
        body: 'Should fail for student role.',
      }),
    });
    assert.equal(forbiddenAnn.status, 403);

    const forbiddenAdmin = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(forbiddenAdmin.status, 403);

    // Faculty login & create announcement
    const facultyLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'nandani@campus.edu',
        password: 'faculty123',
      }),
    });
    assert.equal(facultyLogin.status, 200);
    const { token: facultyToken } = (await facultyLogin.json()) as {
      token: string;
    };

    const createdAnn = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({
        title: 'Lab Demo Schedule',
        body: 'Software Engineering lab demonstrations begin Monday at 10:00.',
        category: 'Academic',
        department: 'Computer Science',
        isPinned: true,
      }),
    });
    assert.equal(createdAnn.status, 201);

    // Admin login & backup export
    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@campus.edu',
        password: 'admin123',
      }),
    });
    assert.equal(adminLogin.status, 200);
    const { token: adminToken } = (await adminLogin.json()) as {
      token: string;
    };

    const backupRes = await fetch(`${baseUrl}/api/admin/backup`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(backupRes.status, 200);
    const backup = (await backupRes.json()) as {
      system: string;
      tables: { users: unknown[]; announcements: unknown[] };
    };
    assert.equal(backup.system, 'Campus Connect');
    assert.ok(backup.tables.users.length >= 5);
    assert.ok(backup.tables.announcements.length >= 5);
  });
});
