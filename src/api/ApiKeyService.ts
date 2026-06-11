import apiClient from './axios';

export interface ApiKeyRecord {
  id: string;
  userId: string | null;
  email: string | null;
  role: string | null;
  label: string | null;
  last4: string | null;
  enabled: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
}

export const ApiKeyService = {
  async getApiKeys(): Promise<ApiKeyRecord[]> {
    const response = await apiClient.get('/api-keys');
    return response.data.apiKeys;
  },

  async createApiKey(data: { uid?: string; email?: string; label?: string }): Promise<{ apiKey: string; apiKeyId: string; last4: string }> {
    const response = await apiClient.post('/api-keys', data);
    return response.data;
  },

  async deleteApiKey(keyId: string): Promise<void> {
    await apiClient.delete(`/api-keys/${keyId}`);
  }
};
