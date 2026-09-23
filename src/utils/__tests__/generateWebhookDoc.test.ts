import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWebhookDoc } from '../generateWebhookDoc';
import { WebhookRecord } from '../../types';

describe('generateWebhookDoc', () => {
  let mockWindow: any;

  beforeEach(() => {
    mockWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
    };
    (globalThis as any).window = {
      open: vi.fn().mockReturnValue(mockWindow),
    };
  });

  it('generates HTML document containing webhook details and security documentation', () => {
    const webhook: WebhookRecord = {
      id: 'wh_test_123',
      url: 'https://security.acme.com/fyrlinc-hook',
      secret: 'whsec_secretabcdef123456',
      companyId: 'company_acme',
      branchIds: ['branch_main'],
      events: ['ALARM_TRIGGERED', 'ALARM_RESOLVED'],
      enabled: true,
      description: 'Acme Central Monitoring',
      createdAt: null,
    };

    generateWebhookDoc(webhook, 'Acme Corporation', webhook.secret);

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockWindow.document.write).toHaveBeenCalledTimes(1);
    expect(mockWindow.document.close).toHaveBeenCalledTimes(1);

    const writtenHtml = mockWindow.document.write.mock.calls[0][0];

    // Check title
    expect(writtenHtml).toContain('Fyrlinc_Webhook_Manual_Acme_Central_Monitoring');
    // Check organization and URL
    expect(writtenHtml).toContain('Acme Corporation');
    expect(writtenHtml).toContain('https://security.acme.com/fyrlinc-hook');
    // Check secret
    expect(writtenHtml).toContain('whsec_secretabcdef123456');
    // Check HMAC verification headers
    expect(writtenHtml).toContain('x-fyrlinc-signature');
    expect(writtenHtml).toContain('x-fyrlinc-event');
    expect(writtenHtml).toContain('x-fyrlinc-timestamp');
    // Check code snippets for verification
    expect(writtenHtml).toContain('crypto.createHmac');
    expect(writtenHtml).toContain('hmac.new(SECRET');
    expect(writtenHtml).toContain('hash_hmac(\'sha256\'');
    // Check event types
    expect(writtenHtml).toContain('ALARM_TRIGGERED');
    expect(writtenHtml).toContain('ALARM_RESOLVED');
    expect(writtenHtml).toContain('TELEMETRY_UPDATE');
    expect(writtenHtml).toContain('PANEL_STATUS_CHANGED');
    // Check real-time vs polling comparison
    expect(writtenHtml).toContain('Real-Time Push vs REST API Polling');
  });

  it('handles blocked popup gracefully without throwing', () => {
    (globalThis as any).window.open = vi.fn().mockReturnValue(null);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const webhook: WebhookRecord = {
      id: 'wh_test_456',
      url: 'https://example.com/wh',
      secret: 'whsec_test',
      companyId: null,
      branchIds: [],
      events: ['ALL'],
      enabled: true,
      createdAt: null,
    };

    expect(() => generateWebhookDoc(webhook, 'Global Scope')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith('Popup blocked. Could not open print window.');
    consoleSpy.mockRestore();
  });
});
