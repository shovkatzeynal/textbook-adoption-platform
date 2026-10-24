const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const root = path.join(__dirname, '../..');
function environment(overrides = {}) {
 return { ...process.env, NODE_ENV: 'development', DB_HOST: '127.0.0.1', DB_PORT: '3306',
 DB_USER: 'deployment_test', DB_NAME: 'deployment_config_test', DB_PASSWORD: randomBytes(24).toString('hex'),
 JWT_SECRET: randomBytes(32).toString('hex'), PORT: '', API_HOST: '', FRONTEND_ORIGIN: '',
 TRUST_PROXY: '', DB_SSL: 'false', DB_SSL_CA_FILE: '', ...overrides };
}
function run(code, overrides) {
 return spawnSync(process.execPath, ['-e', code], { cwd: root,
 env: environment(overrides), encoding: 'utf8', timeout: 15000 });
}
const configuration = `const c = require('./backend/config');
console.log(JSON.stringify({ host: c.host, port: c.port, origin: c.frontendOrigin,
 trustProxy: c.trustProxy, ssl: c.db.ssl }));`;
test('local defaults remain loopback:5009 and localhost frontend', () => {
 const result = run(configuration);
 assert.equal(result.status, 0, result.stderr);
 assert.deepEqual(JSON.parse(result.stdout), { host: '127.0.0.1', port: 5009,
 origin: 'http://localhost:3000', trustProxy: false });
});
test('production honors platform PORT, binds all interfaces by default and allows explicit host', () => {
 const production = { NODE_ENV: 'production', PORT: '8080', FRONTEND_ORIGIN: 'https://portal.example' };
 let result = run(configuration, production);
 assert.equal(result.status, 0, result.stderr);
 assert.equal(JSON.parse(result.stdout).host, '0.0.0.0');
 assert.equal(JSON.parse(result.stdout).port, 8080);
 assert.equal(JSON.parse(result.stdout).origin, production.FRONTEND_ORIGIN);
 result = run(configuration, { ...production, API_HOST: '127.0.0.1' });
 assert.equal(JSON.parse(result.stdout).host, '127.0.0.1');
});
test('production rejects absent, wildcard, HTTP, localhost and non-origin CORS settings', () => {
 for (const origin of ['', '*', 'https://portal.example/', 'https://portal.example/path',
 'https://portal.example?query=1', 'https://user:password@portal.example',
 'http://portal.example', 'https://localhost', 'https://127.0.0.1',
 'https://one.example,https://two.example']) {
  const result = run(configuration, { NODE_ENV: 'production', FRONTEND_ORIGIN: origin });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /FRONTEND_ORIGIN/);
 }
});
test('production rejects blank/placeholder DB credentials and obvious placeholder signing keys', () => {
 const production = { NODE_ENV: 'production', FRONTEND_ORIGIN: 'https://portal.example' };
 for (const password of ['', ' ', 'replace-with-your-local-db-password']) {
  const result = run(configuration, { ...production, DB_PASSWORD: password });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /DB_PASSWORD/);
 }
 for (const secret of ['x'.repeat(64), 'replace-with-a-random-signing-key-of-32-characters']) {
  const result = run(configuration, { ...production, JWT_SECRET: secret });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /JWT_SECRET/);
 }
});
test('remote DB TLS verifies certificates/identity; proxy trust requires explicit addresses', () => {
 const result = run(configuration, { DB_SSL: 'true', TRUST_PROXY: '127.0.0.1/32,::1/128' });
 assert.equal(result.status, 0, result.stderr);
 assert.deepEqual(JSON.parse(result.stdout).ssl,
  { rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2' });
 assert.deepEqual(JSON.parse(result.stdout).trustProxy, ['127.0.0.1/32', '::1/128']);
 for (const overrides of [{ DB_SSL: 'insecure' }, { DB_SSL_CA_FILE: '/unused-ca.pem' },
 { TRUST_PROXY: 'true' }, { TRUST_PROXY: '1' }, { TRUST_PROXY: '0.0.0.0/0' }])
  assert.notEqual(run(configuration, overrides).status, 0);
});
test('actual production CORS advertises only configured origin and permits Authorization preflight', () => {
 const result = run(`(async () => {
 const assert = require('node:assert/strict');
 const app = require('./backend/app');
 const db = require('./backend/db');
 const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
 try {
  const base = 'http://127.0.0.1:' + server.address().port;
  for (const origin of ['https://portal.example', 'https://other.example']) {
   const response = await fetch(base + '/not-a-route', { headers: { Origin: origin } });
   assert.equal(response.headers.get('access-control-allow-origin'), 'https://portal.example');
   assert.equal(response.headers.get('access-control-allow-credentials'), null);
  }
  const response = await fetch(base + '/api/courses', { method: 'OPTIONS', headers: {
   Origin: 'https://portal.example', 'Access-Control-Request-Method': 'GET',
   'Access-Control-Request-Headers': 'authorization' } });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://portal.example');
  assert.match(response.headers.get('access-control-allow-headers'), /authorization/i);
 } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await db.end(); }
 })().catch(() => { console.error('Production CORS verification failed.'); process.exitCode = 1; });`,
 { NODE_ENV: 'production', FRONTEND_ORIGIN: 'https://portal.example' });
 assert.equal(result.status, 0, result.stderr);
});
test('production build fails early without an explicit public API origin', () => {
 const result = spawnSync(process.execPath, ['scripts/build-production.js'], { cwd: root,
 env: environment({ REACT_APP_API_BASE_URL: '' }), encoding: 'utf8', timeout: 15000 });
 assert.equal(result.status, 1); assert.match(result.stderr, /REACT_APP_API_BASE_URL/);
});
