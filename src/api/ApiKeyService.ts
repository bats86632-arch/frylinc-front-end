import apiClient from './axios';
import { ApiKeyRecord, CreateApiKeyPayload } from '../types';

export const ApiKeyService = {
  async getApiKeys(companyId?: string): Promise<ApiKeyRecord[]> {
    const params = companyId ? { companyId } : {};
    const response = await apiClient.get('/api-keys', { params });
    return response.data.apiKeys;
  },

  async getApiKey(keyId: string): Promise<ApiKeyRecord> {
    const response = await apiClient.get(`/api-keys/${keyId}`);
    return response.data;
  },

  async createApiKey(data: CreateApiKeyPayload): Promise<{ apiKey: string; apiKeyId: string; username: string | null; last4: string }> {
    const response = await apiClient.post('/api-keys', data);
    return response.data;
  },

  async updateApiKey(keyId: string, data: {
    enabled?: boolean;
    label?: string;
    username?: string;
    webhookUrl?: string;
    expiresAt?: string | null;
    branchIds?: string[];
  }): Promise<void> {
    await apiClient.patch(`/api-keys/${keyId}`, data);
  },

  async suspendApiKey(keyId: string): Promise<void> {
    await apiClient.patch(`/api-keys/${keyId}`, { enabled: false });
  },

  async resumeApiKey(keyId: string): Promise<void> {
    await apiClient.patch(`/api-keys/${keyId}`, { enabled: true });
  },

  async deleteApiKey(keyId: string): Promise<void> {
    await apiClient.delete(`/api-keys/${keyId}`);
  }
};
