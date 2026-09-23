import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from '../WebhookService';
import apiClient from '../axios';

vi.mock('../axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
  };
});

describe('WebhookService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches webhooks list with company filter if provided', async () => {
    const mockWebhooks = [
      {
        id: 'wh_1',
        url: 'https://example.com/webhook',
        secret: 'whsec_test123',
        companyId: 'comp_abc',
        branchIds: [],
        events: ['ALL'],
        enabled: true,
        createdAt: null,
      },
    ];

    (apiClient.get as any).mockResolvedValueOnce({ data: { webhooks: mockWebhooks } });

    const result = await WebhookService.getWebhooks('comp_abc');
    expect(apiClient.get).toHaveBeenCalledWith('/webhooks', {
      params: { companyId: 'comp_abc' },
    });
    expect(result).toEqual(mockWebhooks);
  });

  it('fetches single webhook by ID', async () => {
    const mockWebhook = {
      id: 'wh_1',
      url: 'https://example.com/webhook',
      secret: 'whsec_test123',
      companyId: null,
      branchIds: [],
      events: ['ALARM_TRIGGERED'],
      enabled: true,
      createdAt: null,
    };

    (apiClient.get as any).mockResolvedValueOnce({ data: { webhook: mockWebhook } });

    const result = await WebhookService.getWebhook('wh_1');
    expect(apiClient.get).toHaveBeenCalledWith('/webhooks/wh_1');
    expect(result).toEqual(mockWebhook);
  });

  it('creates new webhook with auto-generated secret', async () => {
    const payload = {
      url: 'https://example.com/notify',
      events: ['ALARM_TRIGGERED', 'ALARM_RESOLVED'],
      companyId: 'comp_1',
      description: 'Alarm Receiver',
    };

    const createdRecord = {
      id: 'wh_new',
      ...payload,
      secret: 'whsec_random987',
      branchIds: [],
      enabled: true,
      createdAt: null,
    };

    (apiClient.post as any).mockResolvedValueOnce({ data: { webhook: createdRecord } });

    const result = await WebhookService.createWebhook(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/webhooks', payload);
    expect(result.id).toBe('wh_new');
    expect(result.secret).toBe('whsec_random987');
  });

  it('updates webhook settings', async () => {
    (apiClient.patch as any).mockResolvedValueOnce({ data: { ok: true } });

    await WebhookService.updateWebhook('wh_1', { enabled: false, events: ['ALARM_TRIGGERED'] });
    expect(apiClient.patch).toHaveBeenCalledWith('/webhooks/wh_1', {
      enabled: false,
      events: ['ALARM_TRIGGERED'],
    });
  });

  it('deletes webhook by ID', async () => {
    (apiClient.delete as any).mockResolvedValueOnce({ data: { ok: true } });

    await WebhookService.deleteWebhook('wh_1');
    expect(apiClient.delete).toHaveBeenCalledWith('/webhooks/wh_1');
  });

  it('tests webhook endpoint with test ping and returns metrics', async () => {
    const mockResult = {
      ok: true,
      success: true,
      statusCode: 200,
      durationMs: 45,
      responseBody: '{"received":true}',
    };

    (apiClient.post as any).mockResolvedValueOnce({ data: mockResult });

    const result = await WebhookService.testWebhook('wh_1');
    expect(apiClient.post).toHaveBeenCalledWith('/webhooks/wh_1/test');
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.durationMs).toBe(45);
  });
});
