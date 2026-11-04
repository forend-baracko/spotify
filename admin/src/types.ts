export type AdminRole = 'super_admin' | 'moderator' | 'analytics_manager' | 'auditor' | 'user';
export type UserStatus = 'active' | 'restricted' | 'suspended';
export type ContentStatus = 'published' | 'under_review' | 'restricted' | 'taken_down';
export type Severity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type PageId = 'overview' | 'users' | 'moderation' | 'analytics' | 'logs';
export type CatalogCollection = 'tracks' | 'albums' | 'artists';

export interface UserDocument {
  id?: string;
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string | null;
  role?: AdminRole;
  status?: UserStatus;
  customPermissions?: string[];
  createdAt?: { seconds?: number };
}

export interface TrackDocument {
  id: string;
  title?: string;
  name?: string;
  artistName?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  playCount?: number;
  status?: ContentStatus;
  restrictedRegions?: string[];
  createdAt?: { seconds?: number };
}

export interface AuditLogDocument {
  id: string;
  actorUid?: string;
  actorEmail?: string;
  action?: string;
  targetId?: string;
  targetCollection?: string;
  severity?: Severity;
  timestamp?: { seconds?: number };
  metadata?: Record<string, unknown>;
}

export interface AnalyticsDocument {
  id: string;
  date?: string;
  timestamp?: { seconds?: number };
  streams?: number;
  activeListeners?: number;
  regionalDistribution?: Record<string, number>;
  deviceBreakdown?: Record<string, number>;
}

export interface Claims {
  role?: AdminRole;
  admin?: boolean;
  moderator?: boolean;
  auditor?: boolean;
  analytics_manager?: boolean;
}

export const roleLabel = (role: AdminRole | undefined) =>
  role ? role.replaceAll('_', ' ') : 'user';
