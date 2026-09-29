import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('../src/services/fermApi.ts', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'ts', format: 'cjs', target: 'es2020' }).code;

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function loadApi({ fetchImpl, networkFailure = false, local = {}, session = {} } = {}) {
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    fetch: fetchImpl,
    localStorage: storage(local),
    sessionStorage: storage(session),
    FormData,
    Response,
    Headers,
    console,
  };
  if (networkFailure) {
    context.fetch = vm.runInNewContext('async () => { throw new TypeError(\'Failed to fetch\'); }', context);
  }
  vm.runInNewContext(compiled, context);
  return { api: module.exports, context };
}

test('legacy authentication values are replaced by the cookie-session marker', () => {
  const { api, context } = loadApi({
    local: { fermplus_token: 'plain-text-token' },
  });

  assert.equal(api.getStoredAuthToken(), 'cookie-session');
  assert.equal(context.localStorage.getItem('fermplus_token'), 'cookie-session');
  assert.equal(context.sessionStorage.getItem('fermplus_token'), 'cookie-session');
});

test('login uses same-origin cookies and never sends an authorization header', async () => {
  let request;
  const { api } = loadApi({
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ data: { user: { id: 1 } } }), {
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  await api.login({ email: 'admin@ferm.test', password: 'not-a-real-password' });

  assert.equal(request.url, '/api/v1/auth/login');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.credentials, 'include');
  assert.equal(request.options.headers.Authorization, undefined);
  assert.equal(request.options.headers['Content-Type'], 'application/json');
});

test('cookie-authenticated writes keep credentials and forward their idempotency key', async () => {
  let request;
  const { api } = loadApi({
    fetchImpl: async (_url, options) => {
      request = options;
      return new Response(JSON.stringify({ data: { id: 10 } }), {
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  await api.postJson('/tasks', { title: 'Contrôle' }, 'cookie-session', 'offline:task-1');

  assert.equal(request.credentials, 'include');
  assert.equal(request.headers.Authorization, undefined);
  assert.equal(request.headers['Idempotency-Key'], 'offline:task-1');
});

test('network failures expose a user-safe retry message', async () => {
  const { api } = loadApi({
    networkFailure: true,
  });

  await assert.rejects(
    api.login({ email: 'admin@ferm.test', password: 'not-a-real-password' }),
    /Vérifiez votre connexion et réessayez/,
  );
});
