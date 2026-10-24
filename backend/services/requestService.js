const db = require('../db');
const { HttpError } = require('../validation');
const FULFILLMENT = ['Approved', 'Ready to be ordered', 'Ordered', 'Arrived', 'Ready to pick up', 'Picked up'];

async function transaction(work) {
 const connection = await db.getConnection();
 try {
  await connection.beginTransaction();
  const result = await work(connection);
  await connection.commit();
  return result;
 } catch (error) {
  await connection.rollback();
  throw error;
 } finally { connection.release(); }
}
async function rows(sql, params = [], connection = db) {
 const [result] = await connection.execute(sql, params);
 return result;
}
async function listDepartments() {
 return rows('SELECT department_id, department_name, department_code FROM departments ORDER BY department_name');
}
async function listHods(user) {
 return rows("SELECT user_id, first_name, last_name FROM users WHERE role = 'Head of Department' AND department_id = ?", [user.departmentId]);
}
async function listCoursesByInstructor(user) {
 return rows(`SELECT c.course_id, c.course_number, c.course_name, c.term, c.department_id, d.hod_id
 FROM courses c JOIN departments d ON d.department_id = c.department_id
 WHERE c.instructor_id = ? AND c.department_id = ? ORDER BY c.created_at DESC, c.course_id DESC`,
 [user.userId, user.departmentId]);
}
async function departmentReviewer(user, connection = db) {
 const result = await rows(`SELECT d.hod_id FROM departments d JOIN users h ON h.user_id = d.hod_id
 AND h.department_id = d.department_id AND h.role = 'Head of Department'
 WHERE d.department_id = ? FOR SHARE`, [user.departmentId], connection);
 if (!result.length) throw new HttpError(409, 'Your department has no valid Head of Department assigned.');
 return result[0].hod_id;
}
async function addCourse(data, user) {
 return transaction(async connection => {
  await departmentReviewer(user, connection);
  const [result] = await connection.execute(`INSERT INTO courses
   (course_number, course_name, term, instructor_id, department_id) VALUES (?, ?, ?, ?, ?)`,
   [data.courseNumber, data.courseName, data.term, user.userId, user.departmentId]);
  return result.insertId;
 });
}
async function getCourseWithLatestTextbook(courseId, user) {
 const result = await rows(`SELECT c.course_id, c.course_number, c.course_name, c.term,
 t.publisher, t.title, t.author, t.isbn, t.edition, t.quantity, t.other_materials
 FROM courses c LEFT JOIN textbooks t ON t.textbook_id = (
  SELECT t2.textbook_id FROM textbooks t2 WHERE t2.course_id = c.course_id
  ORDER BY t2.created_at DESC, t2.textbook_id DESC LIMIT 1)
 WHERE c.course_id = ? AND c.instructor_id = ? AND c.department_id = ?`,
 [courseId, user.userId, user.departmentId]);
 if (!result.length) throw new HttpError(404, 'Course not found.');
 return result[0];
}
async function submitRequest(data, user) {
 return transaction(async connection => {
  const courses = await rows(`SELECT course_id FROM courses WHERE course_id = ?
   AND instructor_id = ? AND department_id = ? FOR UPDATE`,
   [data.courseId, user.userId, user.departmentId], connection);
  if (!courses.length) throw new HttpError(404, 'Course not found.');
  const hodId = await departmentReviewer(user, connection);
  const self = user.role === 'Head of Department';
  if (self && hodId !== user.userId) throw new HttpError(403, 'You are not the designated HoD for this department.');
  const [book] = await connection.execute(`INSERT INTO textbooks
   (course_id, publisher, title, author, isbn, edition, quantity, other_materials)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
   [data.courseId, data.publisher, data.title, data.author, data.isbn, data.edition, data.quantity, data.otherMaterials]);
  const status = self ? 'Approved' : 'Pending';
  const [request] = await connection.execute(`INSERT INTO requests
   (course_id, textbook_id, requested_by, assigned_hod_id, approved_by, status, approval_date)
   VALUES (?, ?, ?, ?, ?, ?, IF(? = 'Approved', UTC_TIMESTAMP(), NULL))`,
   [data.courseId, book.insertId, user.userId, hodId, self ? user.userId : null, status, status]);
  return { requestId: request.insertId, status };
 });
}
// One response shape retains every historical textbook field across all dashboards.
const details = `SELECT r.request_id, r.created_at, r.status, r.rejection_comments,
 r.requested_by, r.assigned_hod_id, r.approved_by, r.approval_date, r.archived_at,
 c.course_id, c.course_number, c.course_name, c.term, c.department_id,
 t.title, t.author, t.publisher, t.isbn, t.edition, t.quantity, t.other_materials AS otherMaterials,
 CONCAT(u.first_name, ' ', u.last_name) AS instructor_name,
 CONCAT(h.first_name, ' ', h.last_name) AS reviewer_name
 FROM requests r JOIN courses c ON c.course_id = r.course_id
 JOIN textbooks t ON t.textbook_id = r.textbook_id
 JOIN users u ON u.user_id = r.requested_by JOIN users h ON h.user_id = r.assigned_hod_id`;
async function fetchInstructorSubmissions(user) {
 return rows(details + ' WHERE r.requested_by = ? ORDER BY r.created_at DESC, r.request_id DESC', [user.userId]);
}
async function fetchHodForms(user) {
 return rows(details + ` WHERE r.assigned_hod_id = ? AND c.department_id = ?
 AND u.department_id = ? AND u.role = 'Instructor' AND r.requested_by != ?
 ORDER BY r.created_at DESC, r.request_id DESC`, [user.userId, user.departmentId, user.departmentId, user.userId]);
}
async function reviewRequest(requestId, user, decision, comment = null) {
 return transaction(async connection => {
  const result = await rows(`SELECT r.status FROM requests r
   JOIN courses c ON c.course_id = r.course_id JOIN users u ON u.user_id = r.requested_by
   WHERE r.request_id = ? AND r.assigned_hod_id = ? AND c.department_id = ?
   AND u.department_id = ? AND u.role = 'Instructor' AND r.requested_by != ? FOR UPDATE`,
   [requestId, user.userId, user.departmentId, user.departmentId, user.userId], connection);
  if (!result.length) throw new HttpError(404, 'Request not found.');
  if (result[0].status !== 'Pending') throw new HttpError(409, 'Only Pending Instructor requests may be reviewed.');
  const approved = decision === 'Approved';
  await connection.execute(`UPDATE requests SET status = ?, approved_by = ?,
   approval_date = IF(? = 'Approved', UTC_TIMESTAMP(), NULL), rejection_comments = ?
   WHERE request_id = ? AND status = 'Pending'`,
   [decision, approved ? user.userId : null, decision, approved ? null : comment, requestId]);
 });
}
const eligible = `r.approved_by IS NOT NULL AND r.approval_date IS NOT NULL
 AND r.status IN ('Approved','Ready to be ordered','Ordered','Arrived','Ready to pick up','Picked up')`;
async function fetchBookstoreForms() {
 return rows(details + ' WHERE ' + eligible + ' AND r.archived_at IS NULL ORDER BY r.created_at DESC, r.request_id DESC');
}
async function updateRequestStatus(requestId, newStatus) {
 if (!FULFILLMENT.includes(newStatus)) throw new HttpError(400, 'Invalid fulfillment status.');
 return transaction(async connection => {
  const result = await rows('SELECT r.status FROM requests r WHERE r.request_id = ? AND ' + eligible +
   ' AND r.archived_at IS NULL FOR UPDATE', [requestId], connection);
  if (!result.length) throw new HttpError(404, 'Approved request not found.');
  const current = FULFILLMENT.indexOf(result[0].status);
  if (FULFILLMENT[current + 1] !== newStatus) throw new HttpError(409, 'Only the next fulfillment stage is allowed.');
  await connection.execute('UPDATE requests SET status = ? WHERE request_id = ? AND status = ?',
   [newStatus, requestId, result[0].status]);
 });
}
async function archiveRequest(requestId) {
 const [result] = await db.execute(`UPDATE requests SET archived_at = UTC_TIMESTAMP()
 WHERE request_id = ? AND status = 'Picked up' AND approved_by IS NOT NULL
 AND approval_date IS NOT NULL AND archived_at IS NULL`, [requestId]);
 if (!result.affectedRows) throw new HttpError(409, 'Only an unarchived Picked up request can be archived.');
}
module.exports = { listDepartments, listHods, listCoursesByInstructor, addCourse,
 getCourseWithLatestTextbook, submitRequest, fetchInstructorSubmissions,
 fetchHodForms, reviewRequest, fetchBookstoreForms, updateRequestStatus, archiveRequest };
