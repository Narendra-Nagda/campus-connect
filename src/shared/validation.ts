import type {
  AcademicResource,
  Announcement,
  CampusEvent,
  UserRole,
} from './types.ts';

export const VALID_ROLES: readonly UserRole[] = ['student', 'faculty', 'admin'] as const;

export function canPublishContent(role: UserRole): boolean {
  return role === 'faculty' || role === 'admin';
}

export function canDeleteContent(
  role: UserRole,
  authorId: string,
  currentUserId: string
): boolean {
  if (role === 'admin') return true;
  if (role === 'faculty' && authorId === currentUserId) return true;
  return false;
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateLoginInput(
  identifier: string,
  password: string
): ValidationResult {
  if (!identifier.trim()) {
    return { valid: false, error: 'Username or email is required.' };
  }
  if (!password) {
    return { valid: false, error: 'Password is required.' };
  }
  return { valid: true };
}

export function validateRegistrationInput(input: {
  fullName: string;
  username: string;
  email: string;
  password: string;
  department: string;
  role: UserRole;
}): ValidationResult {
  if (input.fullName.trim().length < 2) {
    return { valid: false, error: 'Full name must be at least 2 characters.' };
  }
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(input.username.trim())) {
    return {
      valid: false,
      error: 'Username must be 3–32 characters using letters, numbers, dots, underscores, or hyphens.',
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  if (input.password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters.' };
  }
  if (!input.department.trim()) {
    return { valid: false, error: 'Department is required.' };
  }
  if (input.role !== 'student' && input.role !== 'faculty') {
    return {
      valid: false,
      error: 'Self-registration is restricted to Student or Faculty accounts.',
    };
  }
  return { valid: true };
}

export function filterAnnouncements(
  items: Announcement[],
  query: string,
  category: string
): Announcement[] {
  const q = query.trim().toLowerCase();
  return items
    .filter((item) => {
      if (category !== 'All' && item.category !== category) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.authorName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function filterEvents(
  items: CampusEvent[],
  query: string,
  category: string,
  onlyRsvped = false
): CampusEvent[] {
  const q = query.trim().toLowerCase();
  return items
    .filter((item) => {
      if (category !== 'All' && item.category !== category) return false;
      if (onlyRsvped && !item.isRsvped) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.organizerName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function filterResources(
  items: AcademicResource[],
  query: string,
  resourceType: string,
  department: string
): AcademicResource[] {
  const q = query.trim().toLowerCase();
  return items
    .filter((item) => {
      if (resourceType !== 'All' && item.resourceType !== resourceType) return false;
      if (department !== 'All' && item.department !== department) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.courseCode.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function formatRoleLabel(role: UserRole): string {
  if (role === 'admin') return 'Administrator';
  if (role === 'faculty') return 'Faculty';
  return 'Student';
}
