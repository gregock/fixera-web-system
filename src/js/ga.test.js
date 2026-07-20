import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gaScriptPath = path.join(__dirname, 'ga.js');
const gaScript = fs.readFileSync(gaScriptPath, 'utf8');

describe('ga.js internal traffic logic', () => {
  let mockWindow;
  let mockDocument;

  beforeEach(() => {
    const mockElement = {
      setAttribute: () => {},
      style: {},
      getAttribute: () => "",
      closest: () => null
    };

    mockDocument = {
      createElement: () => ({ ...mockElement }),
      head: {
        appendChild: () => {}
      },
      addEventListener: () => {}
    };

    mockWindow = {
      location: {
        search: '',
        hostname: 'example.com'
      },
      localStorage: {
        setItem: () => {},
        getItem: () => null,
        removeItem: () => {}
      },
      URLSearchParams: URLSearchParams,
      document: mockDocument,
      __fixeraInternalTraffic: false,
      dataLayer: [],
      gtag: () => {}
    };
  });

  const runScript = (win) => {
    // The script is an IIFE that expects window and document to be in scope
    // It's wrapped like (function(win, doc) { ... })(window, document)
    const context = vm.createContext({
      window: win,
      document: win.document,
      URLSearchParams: win.URLSearchParams,
      encodeURIComponent: encodeURIComponent,
      Date: Date
    });
    vm.runInNewContext(gaScript, context);
    // After running, the global 'window' in context should have been modified
    // if we passed the same object. However, in runInNewContext, 'window' is just a property.
    // Let's make sure win is updated.
    Object.assign(win, context.window);
  };

  it('should set __fixeraInternalTraffic to true and call setItem when ?internal=true', () => {
    mockWindow.location.search = '?internal=true';
    let setItemCalled = false;
    mockWindow.localStorage.setItem = (key, value) => {
      if (key === 'fixera_internal_traffic' && value === '1') {
        setItemCalled = true;
      }
    };

    runScript(mockWindow);

    assert.strictEqual(mockWindow.__fixeraInternalTraffic, true);
    assert.strictEqual(setItemCalled, true);
  });

  it('should still set __fixeraInternalTraffic to true if localStorage.setItem fails when ?internal=true', () => {
    mockWindow.location.search = '?internal=true';
    mockWindow.localStorage.setItem = () => {
      throw new Error('localStorage blocked');
    };

    runScript(mockWindow);

    assert.strictEqual(mockWindow.__fixeraInternalTraffic, true, 'Should set internal traffic even if localStorage fails');
  });

  it('should call removeItem when ?internal=false', () => {
    mockWindow.location.search = '?internal=false';
    let removeItemCalled = false;
    mockWindow.localStorage.removeItem = (key) => {
      if (key === 'fixera_internal_traffic') {
        removeItemCalled = true;
      }
    };

    runScript(mockWindow);

    assert.strictEqual(removeItemCalled, true);
  });

  it('should set __fixeraInternalTraffic to true if localStorage flag is present', () => {
    mockWindow.localStorage.getItem = (key) => {
      if (key === 'fixera_internal_traffic') return '1';
      return null;
    };

    runScript(mockWindow);

    assert.strictEqual(mockWindow.__fixeraInternalTraffic, true);
  });

  it('should set __fixeraInternalTraffic to true on localhost', () => {
    mockWindow.location.hostname = 'localhost';

    runScript(mockWindow);

    assert.strictEqual(mockWindow.__fixeraInternalTraffic, true);
  });
});
