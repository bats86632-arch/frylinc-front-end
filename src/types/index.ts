export type Role = 'super_admin' | 'head_office' | 'system_integrator' | 'end_user';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  groups: string[];
}

export interface Panel {
  serial: string;
  name: string;
  enabled: boolean;
  zoneCount: number;
  zones: boolean[];
  alarm: boolean;
  groupId: string;
  ipAddress?: string;
  mqttConnected: boolean;
  allowedCommands: string[];
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
