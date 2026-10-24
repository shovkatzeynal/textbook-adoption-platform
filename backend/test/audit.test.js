// Regression tests replacing the audit's assertions of unsafe behavior.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { submission, id, text } = require('../validation');
const valid = { courseId: 11, title: 'Textbook', author: 'Author', publisher: 'Press', quantity: '20' };
test('validates all required fields and normalizes optional fields', () => {
 assert.deepEqual(submission(valid), { ...valid, quantity: 20, isbn: '', edition: '', otherMaterials: '' });
 for (const field of ['title', 'author', 'publisher'])
  for (const value of [undefined, null, '', '  ', 1, {}, [], 'x'.repeat(256)])
   assert.throws(() => submission({ ...valid, [field]: value }), { status: 400 });
});
test('IDs and quantities reject malformed, fractional, nonpositive and out-of-range values', () => {
 for (const value of [undefined, null, true, {}, [], '', ' 1', '1.1', '1e2', '01', 0, -1, 1.5, Infinity, 4294967296])
  assert.throws(() => id(value), { status: 400 });
 for (const quantity of [0, -1, 1.5, 'NaN', 2147483648])
  assert.throws(() => submission({ ...valid, quantity }), { status: 400 });
});
test('malformed rejection feedback produces an intentional 400', () => {
 for (const value of [undefined, null, 123, {}, [], '', '  '])
  assert.throws(() => text(value, 'Rejection feedback', 10000), { status: 400 });
 assert.equal(text('Please verify the ISBN', 'Rejection feedback', 10000), 'Please verify the ISBN');
});
test('startup rejects absent signing key, even with a local dotenv file', () => {
 const result = spawnSync(process.execPath, ['backend/server.js'], {
  cwd: require('path').join(__dirname, '../..'),
  env: { ...process.env, JWT_SECRET: '' }, encoding: 'utf8',
 });
 assert.equal(result.status, 1);
 assert.match(result.stderr, /Missing required configuration: JWT_SECRET/);
 assert.doesNotMatch(result.stdout, /API ready/);
});
