export type Role =
  | "super_admin"
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
  address?: string;
  supervisorName?: string;
  contactNumber?: string;
  emailAddress?: string;
  enabled?: boolean;
}

export interface Panel {
  serial: string;
  name: string;
  enabled: boolean;
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
  timestamp: Date;
  details: string;
  zoneNumber?: number;
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
