const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { jwtSecret } = require('./config');
const { requireAuth, requireRole } = require('./middleware/auth');
const service = require('./services/requestService');
const { HttpError, id, text, submission } = require('./validation');
const router = express.Router();
const run = handler => (req, res, next) => Promise.resolve().then(() => handler(req, res)).catch(next);
const faculty = requireRole(['Instructor', 'Head of Department']);
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100,
 standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many attempts. Please try again later.' } });

router.get('/api/health', (req, res) => res.json({ status: 'ok' }));

router.post('/api/signup', authLimit, run(async (req, res) => {
 const body = req.body;
 // HoD and Bookstore access is provisioned by the institution, not public registration.
 if (body.role !== 'Instructor') throw new HttpError(403, 'Only Instructor accounts can be self-registered.');
 const first = text(body.firstName, 'First name', 100), last = text(body.lastName, 'Last name', 100);
 const email = text(body.email, 'Email', 255).toLowerCase();
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Invalid email address.');
 const phone = text(body.phone, 'Phone', 30, true);
 const department = id(body.departmentId, 'Department ID');
 if (typeof body.password !== 'string' || body.password.length < 8 || Buffer.byteLength(body.password) > 72)
  throw new HttpError(400, 'Password must be at least 8 characters and at most 72 bytes.');
 const [departments] = await db.execute('SELECT department_id FROM departments WHERE department_id = ?', [department]);
 if (!departments.length) throw new HttpError(400, 'Invalid department.');
 const hash = await bcrypt.hash(body.password, 10);
 await db.execute(`INSERT INTO users (first_name,last_name,email,phone,role,password_hash,department_id)
 VALUES (?, ?, ?, ?, 'Instructor', ?, ?)`, [first, last, email, phone, hash, department]);
 res.status(201).json({ message: 'Account created. Please sign in.' });
}));
router.post('/api/login', authLimit, run(async (req, res) => {
 const email = text(req.body.email, 'Email', 255).toLowerCase();
 if (typeof req.body.password !== 'string' || !req.body.password || Buffer.byteLength(req.body.password) > 72)
  throw new HttpError(400, 'A valid password is required.');
 const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
 const user = users[0];
 if (!user || !await bcrypt.compare(req.body.password, user.password_hash))
  throw new HttpError(401, 'Invalid email or password.');
 const token = jwt.sign({ userId: user.user_id, role: user.role }, jwtSecret, { algorithm: 'HS256', expiresIn: '7d' });
 res.json({ token, userId: user.user_id, role: user.role, firstName: user.first_name, lastName: user.last_name });
}));
router.get('/api/departments', run(async (req, res) => res.json({ departments: await service.listDepartments() })));
router.get('/api/hods', requireAuth, faculty, run(async (req, res) => res.json({ hods: await service.listHods(req.user) })));
router.get('/api/courses', requireAuth, faculty, run(async (req, res) => res.json({ courses: await service.listCoursesByInstructor(req.user) })));
router.post('/api/add-course', requireAuth, faculty, run(async (req, res) => {
 const data = { courseNumber: text(req.body.courseNumber, 'Course number', 50),
 courseName: text(req.body.courseName, 'Course name', 255), term: text(req.body.term, 'Term', 50) };
 const courseId = await service.addCourse(data, req.user);
 res.status(201).json({ message: 'Course added successfully!', courseId });
}));
router.get('/api/textbooks/:courseId', requireAuth, faculty, run(async (req, res) =>
 res.json({ course: await service.getCourseWithLatestTextbook(id(req.params.courseId, 'Course ID'), req.user) })));
router.post('/api/submit-form', requireAuth, faculty, run(async (req, res) => {
 const result = await service.submitRequest(submission(req.body), req.user);
 res.status(201).json({ message: 'Form submitted successfully!', ...result });
}));
router.get('/api/hod-forms', requireAuth, requireRole('Head of Department'), run(async (req, res) =>
 res.json({ forms: await service.fetchHodForms(req.user) })));
router.patch('/api/approve-form/:id', requireAuth, requireRole('Head of Department'), run(async (req, res) => {
 await service.reviewRequest(id(req.params.id), req.user, 'Approved');
 res.json({ message: 'Form approved successfully!' });
}));
router.patch('/api/reject-form/:id', requireAuth, requireRole('Head of Department'), run(async (req, res) => {
 const comment = text(req.body.rejectionComments, 'Rejection feedback', 10000);
 await service.reviewRequest(id(req.params.id), req.user, 'Rejected', comment);
 res.json({ message: 'Form rejected successfully!' });
}));
router.get('/api/instructor-submissions', requireAuth, faculty, run(async (req, res) =>
 res.json({ submissions: await service.fetchInstructorSubmissions(req.user) })));
router.get('/api/bookstore/forms', requireAuth, requireRole('Bookstore'), run(async (req, res) =>
 res.json({ forms: await service.fetchBookstoreForms() })));
router.patch('/api/bookstore/forms/:id/update-status', requireAuth, requireRole('Bookstore'), run(async (req, res) => {
 await service.updateRequestStatus(id(req.params.id), text(req.body.newStatus, 'Status', 50));
 res.json({ message: 'Status updated successfully.' });
}));
// Preserve the existing URL, but archive completed orders instead of destroying faculty history.
router.delete('/api/bookstore/forms/:id/delete', requireAuth, requireRole('Bookstore'), run(async (req, res) => {
 await service.archiveRequest(id(req.params.id));
 res.json({ message: 'Completed order archived. Submission history is preserved.' });
}));
module.exports = router;
