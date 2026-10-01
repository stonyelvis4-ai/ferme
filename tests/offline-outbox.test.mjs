import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('../src/services/offlineOutbox.ts', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'ts', format: 'cjs', target: 'es2020' }).code;

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function loadOutbox() {
  const module = { exports: {} };
  const context = { module, exports: module.exports, localStorage: createStorage(), crypto: { randomUUID: () => 'generated-id' }, Date, Math, Set, JSON };
  vm.runInNewContext(compiled, context);
  return module.exports;
}

const scope = { userId: 4, farmId: 12 };

test('outbox is durable and isolated by user and farm', () => {
  const outbox = loadOutbox();
  outbox.enqueueOfflineOperation(scope, { id: 'create-lot', method: 'POST', path: '/lots', payload: { name: 'Lot A' } });
  assert.equal(outbox.listOfflineOperations(scope).length, 1);
  assert.equal(outbox.listOfflineOperations({ userId: 4, farmId: 99 }).length, 0);
  assert.equal(outbox.listOfflineOperations({ userId: 9, farmId: 12 }).length, 0);
});

test('dependencies block delivery until the prerequisite is confirmed', () => {
  const outbox = loadOutbox();
  outbox.enqueueOfflineOperation(scope, { id: 'create-lot', method: 'POST', path: '/lots' });
  outbox.enqueueOfflineOperation(scope, { id: 'feed-lot', method: 'POST', path: '/feedings', dependsOn: ['create-lot'] });
  assert.deepEqual(outbox.listReadyOfflineOperations(scope).map((operation) => operation.id), ['create-lot']);
  assert.equal(outbox.removeOfflineOperation(scope, 'create-lot'), true);
  assert.deepEqual(outbox.listReadyOfflineOperations(scope).map((operation) => operation.id), ['feed-lot']);
});

test('retry metadata and local-to-server id mappings persist', () => {
  const outbox = loadOutbox();
  outbox.enqueueOfflineOperation(scope, { id: 'create-stock', method: 'POST', path: '/stocks' });
  const retried = outbox.markOfflineOperationRetry(scope, 'create-stock', 'network down');
  assert.equal(retried.retryCount, 1);
  assert.equal(retried.lastError, 'network down');
  outbox.setOfflineIdMapping(scope, 'local-stock-1', 88);
  assert.equal(outbox.resolveOfflineId(scope, 'local-stock-1'), 88);
  assert.equal(outbox.resolveOfflineId(scope, 'unknown'), 'unknown');
});
