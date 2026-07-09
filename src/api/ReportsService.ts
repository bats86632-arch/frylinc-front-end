import apiClient from './axios';
import { AuditLog } from '../types';

export interface AuditLogFilters {
  companyId?: string;
  branchId?: string;
  panelId?: string;
  type?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  pageToken?: string;
}

export const ReportsService = {
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<{ logs: AuditLog[]; nextPageToken: string | null }> {
    const params: Record<string, string | number> = {};
    if (filters.companyId) params.companyId = filters.companyId;
    if (filters.branchId) params.branchId = filters.branchId;
    if (filters.panelId) params.panelId = filters.panelId;
    if (filters.type) params.type = filters.type;
    if (filters.action) params.action = filters.action;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.limit) params.limit = filters.limit;
    if (filters.pageToken) params.pageToken = filters.pageToken;

    const response = await apiClient.get('/audit-logs', { params });
    return response.data;
  }
};
