import apiClient from './axios';
import { WebhookRecord, CreateWebhookPayload, WebhookTestResult } from '../types';

export const WebhookService = {
  async getWebhooks(companyId?: string): Promise<WebhookRecord[]> {
    const params = companyId ? { companyId } : {};
    const response = await apiClient.get('/webhooks', { params });
    return response.data.webhooks || [];
  },

  async getWebhook(id: string): Promise<WebhookRecord> {
    const response = await apiClient.get(`/webhooks/${id}`);
    return response.data.webhook || response.data;
  },

  async createWebhook(data: CreateWebhookPayload): Promise<WebhookRecord> {
    const response = await apiClient.post('/webhooks', data);
    return response.data.webhook || response.data;
  },

  async updateWebhook(id: string, data: Partial<CreateWebhookPayload>): Promise<void> {
    await apiClient.patch(`/webhooks/${id}`, data);
  },

  async deleteWebhook(id: string): Promise<void> {
    await apiClient.delete(`/webhooks/${id}`);
  },

  async testWebhook(id: string): Promise<WebhookTestResult> {
    const response = await apiClient.post(`/webhooks/${id}/test`);
    return response.data;
  }
};
