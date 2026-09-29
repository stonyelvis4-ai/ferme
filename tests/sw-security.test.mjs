import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
function harness(fetcher = async () => { throw new Error('offline'); }) {
  const handlers = {};
  const stored = [];
  const deleted = [];
  const cache = { match: async () => undefined, put: async (...args) => stored.push(args), addAll: async () => {} };
  vm.runInNewContext(source, {
    self: { location: { origin: 'https://ferm.test' }, addEventListener: (name, callback) => { handlers[name] = callback; } },
    URL, Response, fetch: fetcher,
    caches: { open: async () => cache, keys: async () => ['another-app', 'ferm-plus-shell-v1'], delete: async (key) => deleted.push(key) },
  });
  return { handlers, stored, deleted };
}

test('private, API, external and non-GET requests are never intercepted', () => {
  const { handlers } = harness();
  for (const [url, method] of [
    ['https://ferm.test/api/v1/finances', 'GET'],
    ['https://ferm.test/private/report.pdf', 'GET'],
    ['https://google.test/assets/app.js', 'GET'],
    ['https://ferm.test/assets/app.js?token=secret', 'GET'],
    ['https://ferm.test/', 'POST'],
  ]) {
    handlers.fetch({ request: { url, method }, respondWith: () => assert.fail(url) });
  }
});

test('activation preserves unrelated application caches', async () => {
  const { handlers, deleted } = harness();
  let work;
  handlers.activate({ waitUntil: (promise) => { work = promise; } });
  await work;
  assert.deepEqual(deleted, ['ferm-plus-shell-v1']);
});

test('missing JavaScript never receives an HTML fallback', async () => {
  const { handlers } = harness();
  let result;
  handlers.fetch({ request: { url: 'https://ferm.test/assets/app.js', method: 'GET', mode: 'cors' }, respondWith: (promise) => { result = promise; } });
  assert.equal((await result).type, 'error');
});

test('private responses are not cached', async () => {
  const response = { ok: true, type: 'basic', redirected: false, headers: new Headers({ 'Cache-Control': 'private, no-store' }) };
  const { handlers, stored } = harness(async () => response);
  let result;
  handlers.fetch({ request: { url: 'https://ferm.test/assets/app.js', method: 'GET' }, respondWith: (promise) => { result = promise; } });
  assert.equal(await result, response);
  assert.equal(stored.length, 0);
});
