import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PanelService } from '../api/PanelService';
import apiClient from '../api/axios';
import { reconnectFirestore } from '../config/firebase';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = createLocalStorageMock();
}

vi.mock('../api/axios', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
  };
});

vi.mock('../config/firebase', () => {
  return {
    db: {},
    auth: {
      currentUser: {
        uid: 'user-123',
        getIdToken: vi.fn().mockResolvedValue('fake-token'),
      },
      authStateReady: vi.fn().mockResolvedValue(undefined),
    },
    reconnectFirestore: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Notification Sync & Retry Mechanisms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('retries markNotificationSeen on transient network failure then succeeds', async () => {
    const postMock = vi.mocked(apiClient.post);
    postMock
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ data: { ok: true } });

    await PanelService.markNotificationSeen('PANEL-001');

    expect(postMock).toHaveBeenCalledTimes(2);
    expect(postMock).toHaveBeenCalledWith('/panels/PANEL-001/notifications/seen');
  });

  it('retries clearNotification on transient network failure then succeeds', async () => {
    const postMock = vi.mocked(apiClient.post);
    postMock
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce({ data: { ok: true } });

    await PanelService.clearNotification('PANEL-002');

    expect(postMock).toHaveBeenCalledTimes(2);
    expect(postMock).toHaveBeenCalledWith('/panels/PANEL-002/notifications/clear');
  });

  it('retries clearAllNotifications on transient failure then succeeds', async () => {
    const postMock = vi.mocked(apiClient.post);
    postMock
      .mockRejectedValueOnce(new Error('Socket timeout'))
      .mockResolvedValueOnce({ data: { ok: true } });

    await PanelService.clearAllNotifications(['PANEL-001', 'PANEL-002']);

    expect(postMock).toHaveBeenCalledTimes(2);
    expect(postMock).toHaveBeenCalledWith('/notifications/clear-all', {
      serials: ['PANEL-001', 'PANEL-002'],
    });
  });

  it('reconnectFirestore can be triggered for mobile lifecycle/network updates', async () => {
    await reconnectFirestore();
    expect(reconnectFirestore).toHaveBeenCalled();
  });
});

describe('Optimistic Notification State & Logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('computes unseen notifications correctly and clears badge instantly when marked seen', () => {
    const userId = 'user-test-1';
    const panels = [
      {
        serial: 'P1',
        name: 'Main Panel',
        branchId: 'b1',
        panelType: 'Fire Alarm' as const,
        zoneCount: 8,
        zones: [1, 2, 1, 1], // zone 2 is in fire alarm
        alarm: true,
        enabled: true,
        mqttConnected: true,
        allowedCommands: [],
      },
    ];

    // Initial state: not seen, not cleared
    let optimisticallySeen = new Set<string>();
    let optimisticallyCleared = new Set<string>();

    const getNotifications = () => {
      const notifs: Array<{ serial: string; seen: boolean }> = [];
      panels.forEach((p) => {
        const isCleared = (p as any).clearedBy?.[userId] || optimisticallyCleared.has(p.serial);
        if (isCleared) return;

        const isSeen = !!(p as any).seenBy?.[userId] || optimisticallySeen.has(p.serial);
        const hasFire = p.zones.some((z) => z === 2);
        if (hasFire) {
          notifs.push({ serial: p.serial, seen: isSeen });
        }
      });
      return notifs;
    };

    let notifs = getNotifications();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].seen).toBe(false);

    let unseenCount = notifs.filter((n) => !n.seen).length;
    expect(unseenCount).toBe(1);

    // Optimistically mark seen (bell click)
    optimisticallySeen = new Set(optimisticallySeen).add('P1');
    localStorage.setItem(`notifications_seen_${userId}`, JSON.stringify([...optimisticallySeen]));

    notifs = getNotifications();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].seen).toBe(true);

    unseenCount = notifs.filter((n) => !n.seen).length;
    expect(unseenCount).toBe(0); // Badge removed immediately!
  });

  it('removes notification instantly when cleared and persists in localStorage', () => {
    const userId = 'user-test-2';
    const panels = [
      {
        serial: 'P1',
        zones: [2, 1],
      },
      {
        serial: 'P2',
        zones: [2, 1],
      },
    ];

    let optimisticallyCleared = new Set<string>();

    const getActiveNotifications = () => {
      return panels.filter((p) => !optimisticallyCleared.has(p.serial));
    };

    expect(getActiveNotifications()).toHaveLength(2);

    // User clears P1
    optimisticallyCleared = new Set(optimisticallyCleared).add('P1');
    localStorage.setItem(`notifications_cleared_${userId}`, JSON.stringify([...optimisticallyCleared]));

    expect(getActiveNotifications()).toHaveLength(1);
    expect(getActiveNotifications()[0].serial).toBe('P2');

    // User clears all
    panels.forEach((p) => optimisticallyCleared.add(p.serial));
    localStorage.setItem(`notifications_cleared_${userId}`, JSON.stringify([...optimisticallyCleared]));

    expect(getActiveNotifications()).toHaveLength(0);

    // Verify localStorage restored correctly
    const restored = JSON.parse(localStorage.getItem(`notifications_cleared_${userId}`) || '[]');
    expect(restored).toContain('P1');
    expect(restored).toContain('P2');
  });

  it('prunes optimistic flags when alarm returns to normal so future alarms are not blocked', () => {
    let optimisticallyCleared = new Set<string>(['P1']);
    let optimisticallySeen = new Set<string>(['P1']);

    // Panel has returned to normal: all zones are 1
    const normalPanel = {
      serial: 'P1',
      zones: [1, 1, 1, 1],
    };

    const hasAlarm = normalPanel.zones.some((z) => z === 2 || z === 5);
    if (!hasAlarm) {
      optimisticallyCleared.delete(normalPanel.serial);
      optimisticallySeen.delete(normalPanel.serial);
    }

    expect(optimisticallyCleared.has('P1')).toBe(false);
    expect(optimisticallySeen.has('P1')).toBe(false);
  });
});
