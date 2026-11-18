import type {
  AcademicResource,
  Announcement,
  AuthSession,
  CampusEvent,
  Channel,
  ChatMessage,
  DashboardSummary,
  User,
  UserRole,
  UserStatus,
} from '../shared/types.ts';

const TOKEN_STORAGE_KEY = 'campus_connect_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota issues
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, { ...init, headers });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new ApiError(
      data.error || `Request failed (${response.status})`,
      response.status
    );
  }

  return data;
}

export const api = {
  login(identifier: string, password: string): Promise<AuthSession> {
    return request<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },
  register(payload: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    department: string;
    role: 'student' | 'faculty';
  }): Promise<AuthSession> {
    return request<AuthSession>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },
  getDashboard(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/api/dashboard');
  },
  getAnnouncements(): Promise<{ announcements: Announcement[] }> {
    return request<{ announcements: Announcement[] }>('/api/announcements');
  },
  createAnnouncement(payload: {
    title: string;
    body: string;
    category: Announcement['category'];
    department: string;
    isPinned: boolean;
  }): Promise<{ announcement: Announcement }> {
    return request<{ announcement: Announcement }>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  togglePinAnnouncement(
    id: string,
    isPinned: boolean
  ): Promise<{ announcement: Announcement }> {
    return request<{ announcement: Announcement }>(`/api/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPinned }),
    });
  },
  deleteAnnouncement(id: string): Promise<{ deletedId: string }> {
    return request<{ deletedId: string }>(`/api/announcements/${id}`, {
      method: 'DELETE',
    });
  },
  getEvents(): Promise<{ events: CampusEvent[] }> {
    return request<{ events: CampusEvent[] }>('/api/events');
  },
  createEvent(payload: {
    title: string;
    description: string;
    category: CampusEvent['category'];
    location: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
  }): Promise<{ event: CampusEvent }> {
    return request<{ event: CampusEvent }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  toggleEventRsvp(id: string): Promise<{ event: CampusEvent }> {
    return request<{ event: CampusEvent }>(`/api/events/${id}/rsvp`, {
      method: 'POST',
    });
  },
  deleteEvent(id: string): Promise<{ deletedId: string }> {
    return request<{ deletedId: string }>(`/api/events/${id}`, {
      method: 'DELETE',
    });
  },
  getResources(): Promise<{ resources: AcademicResource[] }> {
    return request<{ resources: AcademicResource[] }>('/api/resources');
  },
  createResource(payload: {
    title: string;
    description: string;
    resourceType: AcademicResource['resourceType'];
    department: string;
    courseCode: string;
    fileName: string;
    contentBody: string;
  }): Promise<{ resource: AcademicResource }> {
    return request<{ resource: AcademicResource }>('/api/resources', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  recordResourceDownload(id: string): Promise<{ resource: AcademicResource }> {
    return request<{ resource: AcademicResource }>(
      `/api/resources/${id}/download`,
      { method: 'POST' }
    );
  },
  deleteResource(id: string): Promise<{ deletedId: string }> {
    return request<{ deletedId: string }>(`/api/resources/${id}`, {
      method: 'DELETE',
    });
  },
  getChannels(): Promise<{ channels: Channel[] }> {
    return request<{ channels: Channel[] }>('/api/channels');
  },
  createChannel(payload: {
    name: string;
    topic: string;
    channelType: Channel['channelType'];
    department: string;
  }): Promise<{ channel: Channel }> {
    return request<{ channel: Channel }>('/api/channels', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getMessages(channelId: string): Promise<{ messages: ChatMessage[] }> {
    return request<{ messages: ChatMessage[] }>(
      `/api/channels/${channelId}/messages`
    );
  },
  sendMessage(
    channelId: string,
    body: string
  ): Promise<{ message: ChatMessage }> {
    return request<{ message: ChatMessage }>(
      `/api/channels/${channelId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      }
    );
  },
  getAdminUsers(): Promise<{ users: User[] }> {
    return request<{ users: User[] }>('/api/admin/users');
  },
  createAdminUser(payload: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    department: string;
    role: UserRole;
  }): Promise<{ user: User }> {
    return request<{ user: User }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateAdminUser(
    id: string,
    payload: { role?: UserRole; status?: UserStatus }
  ): Promise<{ user: User }> {
    return request<{ user: User }>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteAdminUser(id: string): Promise<{ deletedId: string }> {
    return request<{ deletedId: string }>(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  },
  getBackupSnapshot(): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>('/api/admin/backup');
  },
};

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function triggerTextDownload(
  fileName: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
