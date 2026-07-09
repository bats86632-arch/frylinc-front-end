import type { Timestamp } from "firebase/firestore";

export type Role =
  | "super_admin"
  | "secret_super_admin"
  | "head_office"
  | "system_integrator"
  | "end_user";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  companyId?: string;
  branchIds?: string[];
  assignments?: Record<string, string[]>;
  secret_super_admin?: boolean;
  // Extended profile fields
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  companyName?: string;
  companyRole?: string;
  employeeId?: string;
  dateOfBirth?: string;
  photoURL?: string;
}

export interface Branch {
  id: string; // Firestore document ID (used as the unique identifier)
  branchId: string; // Same as id; stored explicitly in the document
  name: string; // Human-readable branch name (SEPARATE from ID)
  companyId: string;
  bsrCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  supervisorName?: string;
  contactNumber?: string;
  emailAddress?: string;
  enabled?: boolean;
}

export interface Panel {
  serial: string;
  name: string;
  enabled: boolean;
  panelType?: "Fire Alarm" | "Security" | "GSM Module";
  zoneCount: number;
  zones: boolean[];
  alarm: boolean;
  companyId: string;
  branchId: string;
  mobileNumber?: string;
  contactNumbers?: Record<string, string>;
  ipAddress?: string;
  mqttConnected: boolean;
  allowedCommands: string[];
  manuallyMarkedOffline?: boolean;
  seenBy?: Record<string, boolean>;
  clearedBy?: Record<string, boolean>;
}

export interface CommandLog {
  id: string;
  command: string;
  status: "queued" | "sent" | "failed";
  ackStatus: "not_requested" | "pending" | "acknowledged";
}

export interface Event {
  id: string;
  panelSerial: string;
  type: string;
  timestamp?: Date;
  createdAt?: Timestamp | Date;
  details?: string;
  zoneNumber?: number;
  command?: string;
  ackPayload?: string;
  raw?: string;
  zones?: boolean[];
  alarm?: boolean;
  zone?: number;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
}

export interface CommandResponse {
  ok: boolean;
  commandId: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ── Map Zones ──────────────────────────────────────────────────────────────

export interface ZoneLayout {
  zoneId: string;    // e.g. "219111-Z3"
  label: string;     // e.g. "219111 — Zone 3"
  x: number;         // percentage (0–100) from left of container
  y: number;         // percentage (0–100) from top of container
  width: number;     // percentage of container width
  height: number;    // percentage of container height
}

export interface PanelMap {
  imageUrl: string;    // Firebase Storage download URL
  imagePath: string;   // Storage path (for deletion on replace)
  zones: ZoneLayout[]; // saved zone rectangle positions
  updatedAt: Timestamp;      // Firestore server timestamp
  updatedBy: string;   // uid of last user to save
}

// ── API Keys ────────────────────────────────────────────────────────────────

export interface ApiKeyRecord {
  id: string;
  label: string;
  role: string | null;
  key?: string; // Optional raw key for PDF generation
  last4: string | null;
  enabled: boolean;
  status: 'active' | 'suspended' | 'expired';
  companyId: string | null;
  branchIds: string[];
  webhookUrl: string | null;
  expiresAt: Timestamp | null;
  createdByUid: string | null;
  createdAt: Timestamp | null;
  lastUsedAt: Timestamp | null;
  // Legacy fields (may be present on older keys)
  userId?: string | null;
  email?: string | null;
}

export interface CreateApiKeyPayload {
  label: string;
  companyId?: string;
  branchIds?: string[];
  webhookUrl?: string;
  expiresAt?: string | null;
}

// ── Audit Logs ──────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  type: string;       // 'admin_action' | 'panel_event' | 'command'
  action: string;     // 'SEND_COMMAND' | 'DELETE_PANEL' | 'ALARM' | 'CLEAR' | etc.
  result: string;     // 'SUCCESS' | 'FAIL'
  panelId?: string | null;
  panelSerial?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  command?: string | null;
  commandId?: string | null;
  zone?: number | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  isApiKey?: boolean;
  apiKeyId?: string | null;
  timestamp: Timestamp | null;
  // Legacy
  user?: string;
  role?: string;
}
