import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyUrl, openUrl } from '../external-links';
import { isPluginAvailable, getCapabilities } from '../capabilities';
import { platform, isNative, isWeb, isIOS, isAndroid } from '../runtime';
import { saveFile } from '../filesystem';

describe('Platform Runtime Layer', () => {
  it('should expose normalized platform values', () => {
    expect(['web', 'ios', 'android']).toContain(platform);
    expect(typeof isNative).toBe('boolean');
    expect(typeof isWeb).toBe('boolean');
    expect(typeof isIOS).toBe('boolean');
    expect(typeof isAndroid).toBe('boolean');
    expect(isWeb).toBe(!isNative);
  });
});

describe('Capabilities Detection', () => {
  it('should return boolean for plugin checks', () => {
    expect(typeof isPluginAvailable('Network')).toBe('boolean');
    expect(typeof isPluginAvailable('Keyboard')).toBe('boolean');
    expect(typeof isPluginAvailable('Filesystem')).toBe('boolean');
  });

  it('should return a comprehensive map of capabilities', () => {
    const caps = getCapabilities();
    expect(caps).toHaveProperty('App');
    expect(caps).toHaveProperty('Network');
    expect(caps).toHaveProperty('Keyboard');
    expect(caps).toHaveProperty('StatusBar');
    expect(caps).toHaveProperty('Filesystem');
    expect(caps).toHaveProperty('Share');
  });
});

describe('External Link Classification', () => {
  it('classifies relative paths as internal', () => {
    expect(classifyUrl('/')).toBe('internal');
    expect(classifyUrl('/admin')).toBe('internal');
    expect(classifyUrl('/panel/P123?tab=events')).toBe('internal');
    expect(classifyUrl('#section')).toBe('internal');
  });

  it('classifies trusted domain URLs as internal', () => {
    expect(classifyUrl('https://fyrlinc.com/login')).toBe('internal');
    expect(classifyUrl('https://www.fyrlinc.com/dashboard')).toBe('internal');
  });

  it('classifies external HTTPS links as external', () => {
    expect(classifyUrl('https://google.com')).toBe('external');
    expect(classifyUrl('https://firebase.google.com/docs')).toBe('external');
  });

  it('classifies system schemes as system', () => {
    expect(classifyUrl('mailto:support@fyrlinc.com')).toBe('system');
    expect(classifyUrl('tel:+1234567890')).toBe('system');
    expect(classifyUrl('sms:+1234567890')).toBe('system');
    expect(classifyUrl('maps:0,0?q=London')).toBe('system');
  });

  it('rejects unsafe schemes and arbitrary javascript', () => {
    expect(classifyUrl('javascript:alert(1)')).toBe('rejected');
    expect(classifyUrl('data:text/html,<h1>test</h1>')).toBe('rejected');
    expect(classifyUrl('ftp://ftp.example.com')).toBe('rejected');
  });
});

describe('Filesystem Save & Download Web Fallback', () => {
  it('triggers browser download on web environment safely', async () => {
    // Setup mock DOM globals for headless test runner
    const clickMock = vi.fn();
    const originalDocument = globalThis.document;
    const originalURL = globalThis.URL;

    // @ts-expect-error Mocking DOM in test
    globalThis.document = {
      createElement: vi.fn(() => ({
        set href(_val: string) {},
        set download(_val: string) {},
        style: {},
        click: clickMock,
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };
    // @ts-expect-error Mocking URL in test
    globalThis.URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    };

    try {
      const blob = new Blob(['sample,data\n1,2'], { type: 'text/csv' });
      const result = await saveFile({
        blob,
        filename: 'test.csv',
        mimeType: 'text/csv',
      });
      expect(result.success).toBe(true);
      expect(clickMock).toHaveBeenCalled();
    } finally {
      globalThis.document = originalDocument;
      globalThis.URL = originalURL;
    }
  });
});

describe('Back Button Decision Logic', () => {
  it('correctly prioritizes closing overlays before navigating back', () => {
    let modalOpen = true;
    let navBackCalled = false;

    // Handler simulating back button logic
    const handleBackButton = () => {
      if (modalOpen) {
        modalOpen = false;
        return true; // handled
      }
      navBackCalled = true;
      return false;
    };

    // First press closes modal
    const firstPressResult = handleBackButton();
    expect(firstPressResult).toBe(true);
    expect(modalOpen).toBe(false);
    expect(navBackCalled).toBe(false);

    // Second press proceeds to normal navigation
    const secondPressResult = handleBackButton();
    expect(secondPressResult).toBe(false);
    expect(navBackCalled).toBe(true);
  });
});
