export type Role = 'super_admin' | 'head_office' | 'system_integrator' | 'end_user';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  companyId?: string;
  branchIds?: string[];
}

export interface Panel {
  serial: string;
  name: string;
  enabled: boolean;
  zoneCount: number;
  zones: boolean[];
  alarm: boolean;
  companyId?: string;
  branchId?: string;
  ipAddress?: string;
  mobileNumber?: string;
  mqttConnected: boolean;
  allowedCommands: string[];
  manuallyMarkedOffline?: boolean; // User can manually mark a panel as offline
}

export interface CommandLog {
  id: string;
  command: string;
  status: 'queued' | 'sent' | 'failed';
  ackStatus: 'not_requested' | 'pending' | 'acknowledged';
}

export interface Event {
  id: string;
  panelSerial: string;
  type: string;
  timestamp: Date;
  details: string;
  zoneNumber?: number;
}

export interface Company {
  id: string;
  name: string;
  description?: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  address?: string;
  supervisorName?: string;
  contactNumber?: string;
  emailAddress?: string;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userEmail: string;
  role: string;
  action: string;
  companyId?: string;
  branchId?: string;
  panelSerial?: string;
  result: string;
}

export interface CommandResponse {
  ok: boolean;
  commandId: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
