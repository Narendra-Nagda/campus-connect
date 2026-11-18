import crypto from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import express, { type NextFunction, type Request, type Response } from 'express';
import { hashPassword, signToken, verifyPassword, verifyToken } from './auth.ts';
import type {
  AcademicResource,
  Announcement,
  CampusEvent,
  Channel,
  ChatMessage,
  DashboardSummary,
  User,
  UserRole,
  UserStatus,
} from '../shared/types.ts';
import {
  canDeleteContent,
  validateLoginInput,
  validateRegistrationInput,
} from '../shared/validation.ts';

interface AuthenticatedRequest extends Request {
  user?: User;
}

interface DbUserRow {
  id: string;
  username: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: UserRole;
  department: string;
  status: UserStatus;
  created_at: string;
}

function mapUser(row: DbUserRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    department: row.department,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function createApiApp(db: DatabaseSync): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const requireAuth = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : '';

    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({
        error: 'Authentication required. Please sign in to access Campus Connect.',
      });
      return;
    }

    const row = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(payload.sub) as DbUserRow | undefined;

    if (!row) {
      res.status(401).json({ error: 'Account not found. Please sign in again.' });
      return;
    }
    if (row.status !== 'active') {
      res.status(403).json({
        error: 'Your account is currently suspended. Contact an administrator.',
      });
      return;
    }

    req.user = mapUser(row);
    next();
  };

  const requireRole =
    (...roles: UserRole[]) =>
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      if (!roles.includes(req.user.role)) {
        res.status(403).json({
          error: `Access denied. This action requires ${roles.join(' or ')} privileges.`,
        });
        return;
      }
      next();
    };

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // REQ-1, REQ-2, REQ-3: Login
  app.post('/api/auth/login', (req, res) => {
    const identifier = String(req.body?.identifier ?? '').trim();
    const password = String(req.body?.password ?? '');

    const check = validateLoginInput(identifier, password);
    if (!check.valid) {
      res.status(400).json({ error: check.error });
      return;
    }

    const row = db
      .prepare(
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)'
      )
      .get(identifier, identifier) as DbUserRow | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({
        error: 'Invalid username/email or password. Please verify your credentials.',
      });
      return;
    }

    if (row.status !== 'active') {
      res.status(403).json({
        error: 'This account has been suspended by an administrator.',
      });
      return;
    }

    const user = mapUser(row);
    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user });
  });

  // Section 2.2: Registration
  app.post('/api/auth/register', (req, res) => {
    const fullName = String(req.body?.fullName ?? '').trim();
    const username = String(req.body?.username ?? '').trim().toLowerCase();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const department = String(req.body?.department ?? '').trim();
    const role = (req.body?.role ?? 'student') as UserRole;

    const check = validateRegistrationInput({
      fullName,
      username,
      email,
      password,
      department,
      role,
    });
    if (!check.valid) {
      res.status(400).json({ error: check.error });
      return;
    }

    const duplicate = db
      .prepare(
        'SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)'
      )
      .get(email, username) as { id: string } | undefined;

    if (duplicate) {
      res.status(409).json({
        error: 'An account with this email or username already exists.',
      });
      return;
    }

    const id = `usr-${crypto.randomUUID().slice(0, 8)}`;
    const createdAt = new Date().toISOString();
    const passwordHash = hashPassword(password);

    db.prepare(
      `INSERT INTO users (id, username, email, full_name, password_hash, role, department, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`
    ).run(id, username, email, fullName, passwordHash, role, department, createdAt);

    const user: User = {
      id,
      username,
      email,
      fullName,
      role,
      department,
      status: 'active',
      createdAt,
    };
    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ token, user });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // Dashboard Summary
  app.get('/api/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
    const currentUser = req.user!;

    const announcementsCount = (
      db.prepare('SELECT COUNT(*) as c FROM announcements').get() as { c: number }
    ).c;
    const eventsCount = (
      db.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number }
    ).c;
    const resourcesCount = (
      db.prepare('SELECT COUNT(*) as c FROM resources').get() as { c: number }
    ).c;
    const channelsCount = (
      db.prepare('SELECT COUNT(*) as c FROM channels').get() as { c: number }
    ).c;
    const myRsvpsCount = (
      db
        .prepare('SELECT COUNT(*) as c FROM event_rsvps WHERE user_id = ?')
        .get(currentUser.id) as { c: number }
    ).c;

    const recentAnnouncements = fetchAnnouncements(db).slice(0, 4);
    const upcomingEvents = fetchEvents(db, currentUser.id).slice(0, 3);
    const recentResources = fetchResources(db).slice(0, 4);
    const recentChannels = fetchChannels(db).slice(0, 3);

    const summary: DashboardSummary = {
      counts: {
        announcements: announcementsCount,
        upcomingEvents: eventsCount,
        resources: resourcesCount,
        channels: channelsCount,
        myRsvps: myRsvpsCount,
        ...(currentUser.role === 'admin'
          ? {
              totalUsers: (
                db.prepare('SELECT COUNT(*) as c FROM users').get() as {
                  c: number;
                }
              ).c,
            }
          : {}),
      },
      recentAnnouncements,
      upcomingEvents,
      recentResources,
      recentChannels,
    };

    res.json(summary);
  });

  // Announcements
  app.get('/api/announcements', requireAuth, (_req, res) => {
    res.json({ announcements: fetchAnnouncements(db) });
  });

  app.post(
    '/api/announcements',
    requireAuth,
    requireRole('faculty', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const title = String(req.body?.title ?? '').trim();
      const body = String(req.body?.body ?? '').trim();
      const category = String(req.body?.category ?? 'Academic').trim();
      const department = String(
        req.body?.department ?? req.user!.department
      ).trim();
      const isPinned = Boolean(req.body?.isPinned);

      if (title.length < 3 || body.length < 10) {
        res.status(400).json({
          error:
            'Announcement title (min 3 chars) and detailed content (min 10 chars) are required.',
        });
        return;
      }

      const id = `ann-${crypto.randomUUID().slice(0, 8)}`;
      const createdAt = new Date().toISOString();

      db.prepare(
        `INSERT INTO announcements (id, title, body, category, department, is_pinned, author_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        title,
        body,
        category,
        department,
        isPinned ? 1 : 0,
        req.user!.id,
        createdAt
      );

      const created = fetchAnnouncements(db).find((a) => a.id === id);
      res.status(201).json({ announcement: created });
    }
  );

  app.patch(
    '/api/announcements/:id',
    requireAuth,
    requireRole('faculty', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const { id } = req.params;
      const existing = db
        .prepare('SELECT * FROM announcements WHERE id = ?')
        .get(id) as { id: string; author_id: string; is_pinned: number } | undefined;

      if (!existing) {
        res.status(404).json({ error: 'Announcement not found.' });
        return;
      }
      if (!canDeleteContent(req.user!.role, existing.author_id, req.user!.id)) {
        res.status(403).json({
          error: 'You may only edit announcements you created unless you are an administrator.',
        });
        return;
      }

      if (typeof req.body?.isPinned === 'boolean') {
        db.prepare('UPDATE announcements SET is_pinned = ? WHERE id = ?').run(
          req.body.isPinned ? 1 : 0,
          id
        );
      }
      if (typeof req.body?.title === 'string' && req.body.title.trim()) {
        db.prepare('UPDATE announcements SET title = ? WHERE id = ?').run(
          req.body.title.trim(),
          id
        );
      }
      if (typeof req.body?.body === 'string' && req.body.body.trim()) {
        db.prepare('UPDATE announcements SET body = ? WHERE id = ?').run(
          req.body.body.trim(),
          id
        );
      }

      const updated = fetchAnnouncements(db).find((a) => a.id === id);
      res.json({ announcement: updated });
    }
  );

  app.delete(
    '/api/announcements/:id',
    requireAuth,
    requireRole('faculty', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const { id } = req.params;
      const existing = db
        .prepare('SELECT author_id FROM announcements WHERE id = ?')
        .get(id) as { author_id: string } | undefined;

      if (!existing) {
        res.status(404).json({ error: 'Announcement not found.' });
        return;
      }
      if (!canDeleteContent(req.user!.role, existing.author_id, req.user!.id)) {
        res.status(403).json({
          error: 'You do not have permission to delete this announcement.',
        });
        return;
      }

      db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
      res.json({ deletedId: id });
    }
  );

  // Events & RSVP
  app.get('/api/events', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ events: fetchEvents(db, req.user!.id) });
  });

  app.post(
    '/api/events',
    requireAuth,
    requireRole('faculty', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const title = String(req.body?.title ?? '').trim();
      const description = String(req.body?.description ?? '').trim();
      const category = String(req.body?.category ?? 'Seminar').trim();
      const location = String(req.body?.location ?? '').trim();
      const startsAt = String(req.body?.startsAt ?? '').trim();
      const endsAt = String(req.body?.endsAt ?? '').trim();
      const capacity = Number(req.body?.capacity ?? 100);

      if (title.length < 3 || description.length < 10 || !location || !startsAt) {
        res.status(400).json({
          error: 'Event title, description, location, and start time are required.',
        });
        return;
      }

      const safeEndsAt =
        endsAt ||
        new Date(new Date(startsAt).getTime() + 2 * 3600 * 1000).toISOString();
      const id = `evt-${crypto.randomUUID().slice(0, 8)}`;
      const createdAt = new Date().toISOString();

      db.prepare(
        `INSERT INTO events (id, title, description, category, location, starts_at, ends_at, capacity, organizer_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        title,
        description,
        category,
        location,
        startsAt,
        safeEndsAt,
        Number.isFinite(capacity) && capacity > 0 ? Math.floor(capacity) : 100,
        req.user!.id,
        createdAt
      );

      const created = fetchEvents(db, req.user!.id).find((e) => e.id === id);
      res.status(201).json({ event: created });
    }
  );

  app.post('/api/events/:id/rsvp', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const eventRow = db
      .prepare('SELECT id, capacity FROM events WHERE id = ?')
      .get(id) as { id: string; capacity: number } | undefined;

    if (!eventRow) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }

    const existing = db
      .prepare('SELECT 1 FROM event_rsvps WHERE event_id = ? AND user_id = ?')
      .get(id, req.user!.id);

    if (existing) {
      db.prepare('DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?').run(
        id,
        req.user!.id
      );
    } else {
      const currentCount = (
        db
          .prepare('SELECT COUNT(*) as c FROM event_rsvps WHERE event_id = ?')
          .get(id) as { c: number }
      ).c;
      if (currentCount >= eventRow.capacity) {
        res.status(400).json({ error: 'This event has reached capacity.' });
        return;
      }
      db.prepare(
        'INSERT INTO event_rsvps (event_id, user_id, created_at) VALUES (?, ?, ?)'
      ).run(id, req.user!.id, new Date().toISOString());
    }

    const updated = fetchEvents(db, req.user!.id).find((e) => e.id === id);
    res.json({ event: updated });
  });

  app.delete(
    '/api/events/:id',
    requireAuth,
    requireRole('faculty', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const { id } = req.params;
      const existing = db
        .prepare('SELECT organizer_id FROM events WHERE id = ?')
        .get(id) as { organizer_id: string } | undefined;

      if (!existing) {
        res.status(404).json({ error: 'Event not found.' });
        return;
      }
      if (!canDeleteContent(req.user!.role, existing.organizer_id, req.user!.id)) {
        res.status(403).json({ error: 'You do not have permission to delete this event.' });
        return;
      }
      db.prepare('DELETE FROM events WHERE id = ?').run(id);
      res.json({ deletedId: id });
    }
  );

  // Academic Resources
  app.get('/api/resources', requireAuth, (_req, res) => {
    res.json({ resources: fetchResources(db) });
  });

  app.post(
    '/api/resources',
    requireAuth,
    requireRole('faculty', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const title = String(req.body?.title ?? '').trim();
      const description = String(req.body?.description ?? '').trim();
      const resourceType = String(req.body?.resourceType ?? 'Lecture Notes').trim();
      const department = String(
        req.body?.department ?? req.user!.department
      ).trim();
      const courseCode = String(req.body?.courseCode ?? 'GEN-100').trim();
      const fileName = String(
        req.body?.fileName ??
          `${courseCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-notes.txt`
      ).trim();
      const contentBody = String(req.body?.contentBody ?? '').trim();

      if (title.length < 3 || description.length < 10 || contentBody.length < 10) {
        res.status(400).json({
          error:
            'Resource title, description, and document content are required.',
        });
        return;
      }

      const bytes = Buffer.byteLength(contentBody, 'utf8');
      const fileSizeLabel =
        bytes >= 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${bytes} B`;
      const id = `res-${crypto.randomUUID().slice(0, 8)}`;
      const createdAt = new Date().toISOString();

      db.prepare(
        `INSERT INTO resources (
          id, title, description, resource_type, department, course_code,
          file_name, file_size_label, content_body, download_count, uploaded_by_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      ).run(
        id,
        title,
        description,
        resourceType,
        department,
        courseCode,
        fileName,
        fileSizeLabel,
        contentBody,
        req.user!.id,
        createdAt
      );

      const created = fetchResources(db).find((r) => r.id === id);
      res.status(201).json({ resource: created });
    }
  );

  app.post('/api/resources/:id/download', requireAuth, (req, res) => {
    const { id } = req.params;
    const existing = db
      .prepare('SELECT id FROM resources WHERE id = ?')
      .get(id) as { id: string } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Resource not found.' });
      return;
    }
    db.prepare(
      'UPDATE resources SET download_count = download_count + 1 WHERE id = ?'
    ).run(id);
    const updated = fetchResources(db).find((r) => r.id === id);
    res.json({ resource: updated });
  });

  app.delete(
    '/api/resources/:id',
    requireAuth,
    requireRole('faculty', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const { id } = req.params;
      const existing = db
        .prepare('SELECT uploaded_by_id FROM resources WHERE id = ?')
        .get(id) as { uploaded_by_id: string } | undefined;

      if (!existing) {
        res.status(404).json({ error: 'Resource not found.' });
        return;
      }
      if (!canDeleteContent(req.user!.role, existing.uploaded_by_id, req.user!.id)) {
        res.status(403).json({
          error: 'You do not have permission to delete this resource.',
        });
        return;
      }
      db.prepare('DELETE FROM resources WHERE id = ?').run(id);
      res.json({ deletedId: id });
    }
  );

  // Communication Channels & Messages
  app.get('/api/channels', requireAuth, (_req, res) => {
    res.json({ channels: fetchChannels(db) });
  });

  app.post('/api/channels', requireAuth, (req: AuthenticatedRequest, res) => {
    const name = String(req.body?.name ?? '').trim();
    const topic = String(req.body?.topic ?? '').trim();
    const channelType = req.body?.channelType === 'direct' ? 'direct' : 'channel';
    const department = String(
      req.body?.department ?? req.user!.department
    ).trim();

    if (name.length < 3 || topic.length < 5) {
      res.status(400).json({
        error: 'Channel name (min 3 chars) and topic (min 5 chars) are required.',
      });
      return;
    }

    const id = `chn-${crypto.randomUUID().slice(0, 8)}`;
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO channels (id, name, topic, channel_type, department, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name, topic, channelType, department, createdAt);

    const created = fetchChannels(db).find((c) => c.id === id);
    res.status(201).json({ channel: created });
  });

  app.get('/api/channels/:id/messages', requireAuth, (req, res) => {
    const { id } = req.params;
    const channel = db
      .prepare('SELECT id FROM channels WHERE id = ?')
      .get(id) as { id: string } | undefined;

    if (!channel) {
      res.status(404).json({ error: 'Conversation channel not found.' });
      return;
    }

    const messages = fetchMessages(db, id);
    res.json({ messages });
  });

  app.post(
    '/api/channels/:id/messages',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const { id } = req.params;
      const body = String(req.body?.body ?? '').trim();
      if (!body) {
        res.status(400).json({ error: 'Message text cannot be empty.' });
        return;
      }

      const channel = db
        .prepare('SELECT id FROM channels WHERE id = ?')
        .get(id) as { id: string } | undefined;
      if (!channel) {
        res.status(404).json({ error: 'Conversation channel not found.' });
        return;
      }

      const msgId = `msg-${crypto.randomUUID().slice(0, 8)}`;
      const createdAt = new Date().toISOString();

      db.prepare(
        `INSERT INTO messages (id, channel_id, sender_id, body, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(msgId, id, req.user!.id, body, createdAt);

      const message = fetchMessages(db, id).find((m) => m.id === msgId);
      res.status(201).json({ message });
    }
  );

  // Admin Console Routes (REQ-4, REQ-5, Safety 5.2)
  app.get(
    '/api/admin/users',
    requireAuth,
    requireRole('admin'),
    (_req, res) => {
      const rows = db
        .prepare('SELECT * FROM users ORDER BY created_at DESC')
        .all() as unknown as DbUserRow[];
      res.json({ users: rows.map(mapUser) });
    }
  );

  app.post(
    '/api/admin/users',
    requireAuth,
    requireRole('admin'),
    (req, res) => {
      const fullName = String(req.body?.fullName ?? '').trim();
      const username = String(req.body?.username ?? '').trim().toLowerCase();
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      const department = String(req.body?.department ?? '').trim();
      const role = String(req.body?.role ?? 'student') as UserRole;

      if (!['student', 'faculty', 'admin'].includes(role)) {
        res.status(400).json({ error: 'Invalid role selected.' });
        return;
      }
      if (fullName.length < 2 || username.length < 3 || !email.includes('@') || password.length < 6 || !department) {
        res.status(400).json({
          error: 'All fields are required and password must be at least 6 characters.',
        });
        return;
      }

      const duplicate = db
        .prepare(
          'SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)'
        )
        .get(email, username) as { id: string } | undefined;
      if (duplicate) {
        res.status(409).json({
          error: 'A user with this username or email already exists.',
        });
        return;
      }

      const id = `usr-${crypto.randomUUID().slice(0, 8)}`;
      const createdAt = new Date().toISOString();
      db.prepare(
        `INSERT INTO users (id, username, email, full_name, password_hash, role, department, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`
      ).run(
        id,
        username,
        email,
        fullName,
        hashPassword(password),
        role,
        department,
        createdAt
      );

      const created = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(id) as unknown as DbUserRow;
      res.status(201).json({ user: mapUser(created) });
    }
  );

  app.patch(
    '/api/admin/users/:id',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const { id } = req.params;
      const existing = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(id) as DbUserRow | undefined;

      if (!existing) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      const nextRole = req.body?.role as UserRole | undefined;
      const nextStatus = req.body?.status as UserStatus | undefined;

      if (id === req.user!.id && nextStatus === 'suspended') {
        res.status(400).json({
          error: 'You cannot suspend your own active administrator account.',
        });
        return;
      }

      if (nextRole && ['student', 'faculty', 'admin'].includes(nextRole)) {
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(nextRole, id);
      }
      if (nextStatus && ['active', 'suspended'].includes(nextStatus)) {
        db.prepare('UPDATE users SET status = ? WHERE id = ?').run(nextStatus, id);
      }

      const updated = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(id) as unknown as DbUserRow;
      res.json({ user: mapUser(updated) });
    }
  );

  app.delete(
    '/api/admin/users/:id',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const { id } = req.params;
      if (id === req.user!.id) {
        res.status(400).json({
          error: 'You cannot delete your own administrator account.',
        });
        return;
      }
      const existing = db
        .prepare('SELECT id FROM users WHERE id = ?')
        .get(id) as { id: string } | undefined;
      if (!existing) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      res.json({ deletedId: id });
    }
  );

  // Safety Requirement 5.2: Regular data backup snapshot
  app.get(
    '/api/admin/backup',
    requireAuth,
    requireRole('admin'),
    (_req, res) => {
      const users = (
        db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as unknown as DbUserRow[]
      ).map(mapUser);
      const announcements = fetchAnnouncements(db);
      const events = db.prepare('SELECT * FROM events ORDER BY starts_at ASC').all();
      const resources = fetchResources(db);
      const channels = fetchChannels(db);
      const messages = db
        .prepare('SELECT * FROM messages ORDER BY created_at ASC')
        .all();

      res.json({
        exportedAt: new Date().toISOString(),
        system: 'Campus Connect',
        tables: {
          users,
          announcements,
          events,
          resources,
          channels,
          messages,
        },
      });
    }
  );

  return app;
}

function fetchAnnouncements(db: DatabaseSync): Announcement[] {
  const rows = db
    .prepare(
      `SELECT a.*, u.full_name as author_name, u.role as author_role
       FROM announcements a
       JOIN users u ON u.id = a.author_id
       ORDER BY a.is_pinned DESC, a.created_at DESC`
    )
    .all() as Array<{
    id: string;
    title: string;
    body: string;
    category: Announcement['category'];
    department: string;
    is_pinned: number;
    author_id: string;
    author_name: string;
    author_role: UserRole;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    category: r.category,
    department: r.department,
    isPinned: Boolean(r.is_pinned),
    authorId: r.author_id,
    authorName: r.author_name,
    authorRole: r.author_role,
    createdAt: r.created_at,
  }));
}

function fetchEvents(db: DatabaseSync, currentUserId: string): CampusEvent[] {
  const rows = db
    .prepare(
      `SELECT e.*,
              u.full_name as organizer_name,
              (SELECT COUNT(*) FROM event_rsvps r WHERE r.event_id = e.id) as rsvp_count,
              EXISTS(SELECT 1 FROM event_rsvps r WHERE r.event_id = e.id AND r.user_id = ?) as is_rsvped
       FROM events e
       JOIN users u ON u.id = e.organizer_id
       ORDER BY e.starts_at ASC`
    )
    .all(currentUserId) as Array<{
    id: string;
    title: string;
    description: string;
    category: CampusEvent['category'];
    location: string;
    starts_at: string;
    ends_at: string;
    capacity: number;
    organizer_id: string;
    organizer_name: string;
    rsvp_count: number;
    is_rsvped: number;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    location: r.location,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    capacity: r.capacity,
    organizerId: r.organizer_id,
    organizerName: r.organizer_name,
    rsvpCount: Number(r.rsvp_count),
    isRsvped: Boolean(r.is_rsvped),
    createdAt: r.created_at,
  }));
}

function fetchResources(db: DatabaseSync): AcademicResource[] {
  const rows = db
    .prepare(
      `SELECT r.*, u.full_name as uploaded_by_name
       FROM resources r
       JOIN users u ON u.id = r.uploaded_by_id
       ORDER BY r.created_at DESC`
    )
    .all() as Array<{
    id: string;
    title: string;
    description: string;
    resource_type: AcademicResource['resourceType'];
    department: string;
    course_code: string;
    file_name: string;
    file_size_label: string;
    content_body: string;
    download_count: number;
    uploaded_by_id: string;
    uploaded_by_name: string;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    resourceType: r.resource_type,
    department: r.department,
    courseCode: r.course_code,
    fileName: r.file_name,
    fileSizeLabel: r.file_size_label,
    contentBody: r.content_body,
    downloadCount: Number(r.download_count),
    uploadedById: r.uploaded_by_id,
    uploadedByName: r.uploaded_by_name,
    createdAt: r.created_at,
  }));
}

function fetchChannels(db: DatabaseSync): Channel[] {
  const rows = db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM messages m WHERE m.channel_id = c.id) as message_count,
              (SELECT m.created_at FROM messages m WHERE m.channel_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at,
              (SELECT m.body FROM messages m WHERE m.channel_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_preview
       FROM channels c
       ORDER BY COALESCE(last_message_at, c.created_at) DESC`
    )
    .all() as Array<{
    id: string;
    name: string;
    topic: string;
    channel_type: Channel['channelType'];
    department: string;
    message_count: number;
    last_message_at: string | null;
    last_message_preview: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    topic: r.topic,
    channelType: r.channel_type,
    department: r.department,
    messageCount: Number(r.message_count),
    lastMessageAt: r.last_message_at,
    lastMessagePreview: r.last_message_preview,
  }));
}

function fetchMessages(db: DatabaseSync, channelId: string): ChatMessage[] {
  const rows = db
    .prepare(
      `SELECT m.*, u.full_name as sender_name, u.role as sender_role
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.channel_id = ?
       ORDER BY m.created_at ASC`
    )
    .all(channelId) as Array<{
    id: string;
    channel_id: string;
    sender_id: string;
    sender_name: string;
    sender_role: UserRole;
    body: string;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    channelId: r.channel_id,
    senderId: r.sender_id,
    senderName: r.sender_name,
    senderRole: r.sender_role,
    body: r.body,
    createdAt: r.created_at,
  }));
}
