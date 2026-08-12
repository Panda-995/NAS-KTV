import assert from 'node:assert/strict';

const values = new Map<string, string>();

Object.assign(globalThis, {
  isTauri: true,
  localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
  window: {
    __TAURI_INTERNALS__: {
      invoke: async () => {
        throw new Error('simulated unavailable app data directory');
      },
    },
  },
});

const { loadBackendConfig, saveBackendConfig } = await import('../src/lib/backend-config.ts');
const { getDeviceId } = await import('../src/lib/device.ts');

const expected = {
  apiUrl: 'http://192.168.1.10:3000',
  wsUrl: 'ws://192.168.1.10:3000',
};

await saveBackendConfig(expected.apiUrl);
const loaded = await loadBackendConfig();

assert.deepEqual(loaded, expected);

const firstDeviceId = await getDeviceId();
const secondDeviceId = await getDeviceId();
assert.equal(secondDeviceId, firstDeviceId);

console.info('backend config and device ID survive the Tauri localStorage fallback');
