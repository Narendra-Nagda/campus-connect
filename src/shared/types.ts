export type UserRole = 'student' | 'faculty' | 'admin';

export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  status: UserStatus;
  createdAt: string;
}

export type AnnouncementCategory =
  | 'Academic'
  | 'Examination'
  | 'Campus Life'
  | 'Administration';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  department: string;
  isPinned: boolean;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
}

export type EventCategory =
  | 'Seminar'
  | 'Workshop'
  | 'Cultural'
  | 'Sports'
  | 'Career';

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  location: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  organizerId: string;
  organizerName: string;
  rsvpCount: number;
  isRsvped: boolean;
  createdAt: string;
}

export type ResourceType =
  | 'Syllabus'
  | 'Lecture Notes'
  | 'Lab Manual'
  | 'Campus Form'
  | 'Past Paper';

export interface AcademicResource {
  id: string;
  title: string;
  description: string;
  resourceType: ResourceType;
  department: string;
  courseCode: string;
  fileName: string;
  fileSizeLabel: string;
  contentBody: string;
  downloadCount: number;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
}

export type ChannelType = 'channel' | 'direct';

export interface Channel {
  id: string;
  name: string;
  topic: string;
  channelType: ChannelType;
  department: string;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  body: string;
  createdAt: string;
}

export interface DashboardSummary {
  counts: {
    announcements: number;
    upcomingEvents: number;
    resources: number;
    channels: number;
    myRsvps: number;
    totalUsers?: number;
  };
  recentAnnouncements: Announcement[];
  upcomingEvents: CampusEvent[];
  recentResources: AcademicResource[];
  recentChannels: Channel[];
}

export interface AuthSession {
  token: string;
  user: User;
}
