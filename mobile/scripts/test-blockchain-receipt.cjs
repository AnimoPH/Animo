const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/record-blockchain-receipt/config.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const config = { exports: {} };
new Function('exports', 'require', 'module', compiled)(config.exports, require, config);
const { receiptCorsHeaders, resolvePolygonRpcUrl } = config.exports;

test('unset origin permits authenticated web preflight', () => {
  const headers = receiptCorsHeaders();
  assert.equal(headers['Access-Control-Allow-Origin'], '*');
  assert.equal(headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
  for (const header of ['authorization', 'x-client-info', 'apikey', 'content-type']) {
    assert.ok(headers['Access-Control-Allow-Headers'].includes(header));
  }
  assert.equal(headers['Access-Control-Allow-Credentials'], undefined);
});

test('explicit origin restriction is preserved', () => {
  assert.equal(receiptCorsHeaders(' https://animo.example ')['Access-Control-Allow-Origin'], 'https://animo.example');
  assert.equal(receiptCorsHeaders('   ')['Access-Control-Allow-Origin'], '*');
});

test('base URLs append the key once, with or without a trailing slash', () => {
  for (const base of ['https://polygon-amoy.g.alchemy.com/v2/', 'https://polygon-amoy.g.alchemy.com/v2']) {
    assert.equal(resolvePolygonRpcUrl(base, 'test-key'), 'https://polygon-amoy.g.alchemy.com/v2/test-key');
  }
});

test('complete URL works with no separate key and never duplicates a key', () => {
  const full = 'https://polygon-amoy.g.alchemy.com/v2/test-key';
  assert.equal(resolvePolygonRpcUrl(full), full);
  assert.equal(resolvePolygonRpcUrl(full, 'test-key'), full);
  assert.equal(resolvePolygonRpcUrl(` ${full} `, 'other-key'), full);
});

test('missing or invalid configuration fails before sending a transaction', () => {
  assert.throws(() => resolvePolygonRpcUrl(''), /POLYGON_RPC_URL/);
  assert.throws(() => resolvePolygonRpcUrl('https://polygon-amoy.g.alchemy.com/v2/'), /ALCHEMY_API_KEY/);
  assert.throws(() => resolvePolygonRpcUrl('file:///tmp/key'), /HTTP/);
});
