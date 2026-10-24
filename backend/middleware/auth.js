const jwt = require('jsonwebtoken');
const db = require('../db');
const { jwtSecret } = require('../config');
async function requireAuth(req, res, next) {
 const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
 if (!match) return res.status(401).json({ message: 'Please log in.' });
 let payload;
 try {
  payload = jwt.verify(match[1], jwtSecret, { algorithms: ['HS256'] });
  if (!Number.isSafeInteger(payload.userId) || payload.userId < 1) throw new Error('Invalid identity');
 } catch { return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' }); }
 try {
  // Read current role/department rather than trusting stale role claims.
  const [rows] = await db.execute('SELECT user_id AS userId, role, department_id AS departmentId FROM users WHERE user_id = ?', [payload.userId]);
  if (!rows.length) return res.status(401).json({ message: 'Account no longer exists.' });
  req.user = rows[0]; next();
 } catch (error) { next(error); }
}
function requireRole(roles) {
 const allowed = Array.isArray(roles) ? roles : [roles];
 return (req, res, next) => allowed.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Forbidden.' });
}
module.exports = { requireAuth, requireRole };
