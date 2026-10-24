const path = require('path');
const fs = require('fs');
const net = require('net');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const production = process.env.NODE_ENV === 'production';
function required(name) {
 if (!process.env[name]) throw new Error(`Missing required configuration: ${name}. See .env.example.`);
 return process.env[name];
}
function port(name, fallback) {
 const value = Number(process.env[name] || fallback);
 if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error(`Invalid ${name}.`);
 return value;
}
function origin() {
 const value = production ? required('FRONTEND_ORIGIN') : process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
 let url;
 try { url = new URL(value); } catch { throw new Error('Invalid FRONTEND_ORIGIN.'); }
 if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value ||
  (production && (url.protocol !== 'https:' || /^(localhost|.*\.localhost|127\..*|0\.0\.0\.0|\[::1\])$/i.test(url.hostname))))
  throw new Error('Invalid FRONTEND_ORIGIN.');
 return value;
}
function databaseTls() {
 const enabled = process.env.DB_SSL || 'false';
 if (!['true', 'false'].includes(enabled)) throw new Error('Invalid DB_SSL.');
 if (enabled === 'false') {
  if (process.env.DB_SSL_CA_FILE) throw new Error('Invalid DB_SSL_CA_FILE.');
  return undefined;
 }
 let ca;
 if (process.env.DB_SSL_CA_FILE) {
  try { ca = fs.readFileSync(process.env.DB_SSL_CA_FILE, 'utf8'); }
  catch { throw new Error('Invalid DB_SSL_CA_FILE.'); }
 }
 return { rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2', ...(ca ? { ca } : {}) };
}
function trustedProxies() {
 if (!process.env.TRUST_PROXY) return false;
 const entries = process.env.TRUST_PROXY.split(',').map(value => value.trim());
 for (const entry of entries) {
  const parts = entry.split('/');
  const version = net.isIP(parts[0]);
  if (!version || parts.length > 2 || (parts.length === 2 &&
   (!/^\d+$/.test(parts[1]) || Number(parts[1]) < 1 || Number(parts[1]) > (version === 4 ? 32 : 128))))
   throw new Error('Invalid TRUST_PROXY.');
 }
 return entries;
}
const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
if (production && (/^(replace|change|your[_-]|example|demo)/i.test(jwtSecret) || /^(.)\1+$/.test(jwtSecret)))
 throw new Error('Invalid JWT_SECRET.');
if (process.env.DB_PASSWORD === undefined || (production && !process.env.DB_PASSWORD.trim()))
 throw new Error('Missing required configuration: DB_PASSWORD.');
if (production && /^(replace-|change-|your-|choose-|example)/i.test(process.env.DB_PASSWORD))
 throw new Error('Invalid DB_PASSWORD.');
const host = process.env.API_HOST || (production ? '0.0.0.0' : '127.0.0.1');
if (!host.trim() || host !== host.trim()) throw new Error('Invalid API_HOST.');
module.exports = {
 jwtSecret, port: port('PORT', 5009), host,
 frontendOrigin: origin(), trustProxy: trustedProxies(),
 db: { host: required('DB_HOST'), port: port('DB_PORT', 3306), user: required('DB_USER'),
 password: process.env.DB_PASSWORD, database: required('DB_NAME'), charset: 'utf8mb4',
 connectionLimit: 10, timezone: 'Z', ssl: databaseTls() },
};
