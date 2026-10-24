// Real HTTP + MySQL integration tests. Uses only a dedicated *_test database.
// Initializes schema/seed only when empty; never resets or drops a populated database.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
process.env.DB_NAME = process.env.TEST_DB_NAME || 'textbook_adoption_test';
if (!/^[a-zA-Z0-9_]+_test$/.test(process.env.DB_NAME)) throw new Error('TEST_DB_NAME must end in _test');
const config = require('../config');
const mysql = require('mysql2/promise');
const db = require('../db');
const app = require('../app');
let server, base;
const tokens = {};
const password = 'DemoTextbooks!2026';
const unique = Date.now();
const body = { courseId: 11, title: 'Integration Textbook', author: 'Audit Author',
 publisher: 'Test Press', isbn: '9780262033848', edition: '3rd', quantity: 20, otherMaterials: 'Lab manual' };
async function api(route, { user, method = 'GET', data, status = 200, token } = {}) {
 const response = await fetch(base + '/api' + route, { method,
  headers: { 'Content-Type': 'application/json', ...(user || token ? { Authorization: 'Bearer ' + (token || tokens[user]) } : {}) },
  ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
 const result = await response.json();
 assert.equal(response.status, status, method + ' ' + route + ': ' + JSON.stringify(result));
 return result;
}
async function submit(user = 'ia', changes = {}) {
 return api('/submit-form', { method: 'POST', user, data: { ...body, ...changes }, status: 201 });
}
before(async () => {
 const connection = await mysql.createConnection({ ...config.db, multipleStatements: true });
 try {
  const [tables] = await connection.query('SHOW TABLES');
  if (!tables.length) {
   await connection.query(fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8'));
   await connection.query(fs.readFileSync(path.join(__dirname, '../../database/seed.sql'), 'utf8'));
  }
 } finally { await connection.end(); }
 server = await new Promise((resolve, reject) => {
  const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  listener.once('error', reject);
 });
 base = 'http://127.0.0.1:' + server.address().port;
 for (const [key, email] of Object.entries({ ia:'alice.carter@example.test', ib:'sarah.mitchell@example.test',
  ha:'david.brooks@example.test', hb:'michael.reed@example.test', bs:'bookstore@example.test' }))
  tokens[key] = (await api('/login', { method:'POST', data:{email,password} })).token;
});
after(async () => {
 if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
 await db.end();
});
test('A: Instructor -> assigned HoD -> Approved history -> Bookstore, with repeat review blocked', async () => {
 const courses = await api('/courses?userId=102', { user:'ia' });
 assert.ok(courses.courses.some(c => c.course_id === 11));
 assert.ok(courses.courses.every(c => c.department_id === 1));
 const { requestId, status } = await submit();
 assert.equal(status, 'Pending');
 let forms = (await api('/hod-forms', { user:'ha' })).forms;
 assert.equal(forms.find(f => f.request_id === requestId).assigned_hod_id, 201);
 assert.ok(!(await api('/bookstore/forms', { user:'bs' })).forms.some(f => f.request_id === requestId));
 const outcomes = await Promise.all([0,1].map(() => fetch(base+'/api/approve-form/'+requestId,
  {method:'PATCH',headers:{Authorization:'Bearer '+tokens.ha}}).then(r=>r.status)));
 assert.deepEqual(outcomes.sort(), [200,409]);
 const history = (await api('/instructor-submissions', {user:'ia'})).submissions.find(r=>r.request_id===requestId);
 assert.equal(history.status,'Approved'); assert.equal(history.approved_by,201);
 assert.equal(history.rejection_comments,null); assert.ok(history.approval_date);
 const order = (await api('/bookstore/forms',{user:'bs'})).forms.find(r=>r.request_id===requestId);
 for(const field of ['course_number','course_name','term','title','author','publisher','isbn','edition','quantity','otherMaterials','reviewer_name'])
  assert.ok(order[field],field);
});
test('B: rejection requires string feedback, saves exact text and preserves history across resubmission', async () => {
 const {requestId} = await submit();
 for(const rejectionComments of [undefined,null,123,{},[],'','   '])
  await api('/reject-form/'+requestId,{method:'PATCH',user:'ha',data:{rejectionComments},status:400});
 await api('/reject-form/'+requestId,{method:'PATCH',user:'ha',data:{rejectionComments:'Please verify the ISBN'}});
 const old = (await api('/instructor-submissions',{user:'ia'})).submissions.find(r=>r.request_id===requestId);
 assert.equal(old.status,'Rejected'); assert.equal(old.rejection_comments,'Please verify the ISBN');
 assert.equal(old.approved_by,null); assert.equal(old.approval_date,null);
 await api('/approve-form/'+requestId,{method:'PATCH',user:'ha',status:409});
 const revised = await submit('ia',{title:'Corrected edition'});
 assert.notEqual(revised.requestId,requestId);
 const history = (await api('/instructor-submissions',{user:'ia'})).submissions;
 assert.equal(history.find(r=>r.request_id===requestId).title,body.title);
 assert.equal(history.find(r=>r.request_id===revised.requestId).status,'Pending');
});
test('C: HoD own course auto-approves and stays in history after fulfillment', async () => {
 const {requestId,status}=await submit('ha',{courseId:21});
 assert.equal(status,'Approved');
 assert.ok(!(await api('/hod-forms',{user:'ha'})).forms.some(r=>r.request_id===requestId));
 await api('/approve-form/'+requestId,{method:'PATCH',user:'ha',status:404});
 for(const newStatus of ['Ready to be ordered','Ordered'])
  await api('/bookstore/forms/'+requestId+'/update-status',{method:'PATCH',user:'bs',data:{newStatus}});
 assert.equal((await api('/instructor-submissions',{user:'ha'})).submissions.find(r=>r.request_id===requestId).status,'Ordered');
});
test('D: two-department isolation and all backend role boundaries', async () => {
 const {requestId}=await submit('ib',{courseId:12});
 assert.ok(!(await api('/hod-forms?hodId=202',{user:'ha'})).forms.some(r=>r.request_id===requestId));
 await api('/approve-form/'+requestId,{method:'PATCH',user:'ha',status:404});
 await api('/reject-form/'+requestId,{method:'PATCH',user:'ha',data:{rejectionComments:'Other department'},status:404});
 for(const user of ['ia','ha']) {
  await api('/textbooks/12',{user,status:404});
  await api('/submit-form',{method:'POST',user,data:{...body,courseId:12},status:404});
 }
 await api('/submit-form',{method:'POST',user:'ha',data:body,status:404}); // Instructor's course in same department
 for(const user of ['ia','bs']) {
  await api('/hod-forms',{user,status:403});
  await api('/approve-form/'+requestId,{method:'PATCH',user,status:403});
 }
 await api('/bookstore/forms',{user:'ia',status:403});
 await api('/add-course',{method:'POST',user:'bs',data:{},status:403});
 await api('/textbooks/11',{user:'bs',status:403});
 await api('/courses',{status:401});
 await api('/courses',{token:'invalid',status:401});
 const jwt=require('jsonwebtoken');
 await api('/courses',{token:jwt.sign({userId:101},config.jwtSecret,{expiresIn:-1}),status:401});
});
test('E: Bookstore cannot fulfill Pending/Rejected, skip/backtrack, invent statuses or destroy history', async () => {
 const pending=await submit();
 for(const newStatus of ['Approved','Ready to be ordered'])
  await api('/bookstore/forms/'+pending.requestId+'/update-status',{method:'PATCH',user:'bs',data:{newStatus},status:404});
 await api('/bookstore/forms/'+pending.requestId+'/delete',{method:'DELETE',user:'bs',status:409});
 await api('/reject-form/'+pending.requestId,{method:'PATCH',user:'ha',data:{rejectionComments:'Please verify the ISBN'}});
 await api('/bookstore/forms/'+pending.requestId+'/update-status',{method:'PATCH',user:'bs',data:{newStatus:'Approved'},status:404});
 const order=await submit();
 await api('/approve-form/'+order.requestId,{method:'PATCH',user:'ha'});
 const route='/bookstore/forms/'+order.requestId+'/update-status';
 await api(route,{method:'PATCH',user:'bs',data:{newStatus:'Rejected'},status:400});
 await api(route,{method:'PATCH',user:'bs',data:{newStatus:'Ordered'},status:409});
 for(const newStatus of ['Ready to be ordered','Ordered','Arrived','Ready to pick up','Picked up'])
  await api(route,{method:'PATCH',user:'bs',data:{newStatus}});
 await api(route,{method:'PATCH',user:'bs',data:{newStatus:'Ordered'},status:409});
 await api('/bookstore/forms/'+order.requestId+'/delete',{method:'DELETE',user:'bs'});
 assert.ok(!(await api('/bookstore/forms',{user:'bs'})).forms.some(r=>r.request_id===order.requestId));
 assert.ok((await api('/instructor-submissions',{user:'ia'})).submissions.some(r=>r.request_id===order.requestId));
});
test('signup, hashing, duplicate account, invalid credentials and department-routed manual addition', async () => {
 const email='recovery.'+unique+'@example.test';
 const user={firstName:'Recovery',lastName:'Test',email,password,role:'Instructor',departmentId:1};
 await api('/signup',{method:'POST',data:user,status:201});
 await api('/signup',{method:'POST',data:user,status:409});
 for(const role of ['Bookstore','Head of Department'])
  await api('/signup',{method:'POST',data:{...user,role,email:role+'@example.test'},status:403});
 const [users]=await db.execute('SELECT password_hash FROM users WHERE email = ?',[email]);
 assert.notEqual(users[0].password_hash,password);
 assert.ok(await require('bcrypt').compare(password,users[0].password_hash));
 for(const data of [{email,password:'wrong-password'},{email:'absent@example.test',password}])
  await api('/login',{method:'POST',data,status:401});
 tokens.new=(await api('/login',{method:'POST',data:{email,password}})).token;
 assert.deepEqual((await api('/courses',{user:'new'})).courses,[]);
 const course={courseNumber:'REC-'+unique,courseName:'Manual Course',term:'Fall 2026'};
 const result=await api('/add-course',{method:'POST',user:'new',data:course,status:201});
 await api('/add-course',{method:'POST',user:'new',data:course,status:409});
 const own=(await api('/courses',{user:'new'})).courses[0];
 assert.equal(own.department_id,1); assert.equal(own.hod_id,201);
 const submission=await submit('new',{courseId:result.courseId});
 assert.ok((await api('/hod-forms',{user:'ha'})).forms.some(r=>r.request_id===submission.requestId));
});
test('invalid fields, IDs and malformed JSON fail safely without database inserts', async () => {
 const [[before]]=await db.query('SELECT COUNT(*) AS n FROM textbooks');
 for(const changes of [{title:''},{author:{}},{publisher:null},{quantity:0},{quantity:1.5},{quantity:'NaN'},{courseId:[]},{courseId:-1}])
  await api('/submit-form',{method:'POST',user:'ia',data:{...body,...changes},status:400});
 await api('/submit-form',{method:'POST',user:'ia',data:{...body,courseId:9999999},status:404});
 await api('/textbooks/not-an-id',{user:'ia',status:400});
 const response=await fetch(base+'/api/reject-form/1',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tokens.ha},body:'{'});
 assert.equal(response.status,400);
 assert.deepEqual(await response.json(),{message:'Malformed JSON.'});
 const [[after]]=await db.query('SELECT COUNT(*) AS n FROM textbooks');
 assert.equal(after.n,before.n);
});
test('real request insert failure rolls back textbook insert and exposes no SQL error', async () => {
 const [[before]]=await db.query('SELECT COUNT(*) AS n FROM textbooks');
 const course = await api('/add-course', { method:'POST', user:'ia', status:201,
  data:{ courseNumber:'ROLLBACK-'+unique, courseName:'Rollback Test', term:'Test' } });
 const constraint='recovery_rollback_'+unique;
 // Test-only CHECK on the requests table forces the SECOND insert to fail.
 // Unlike a trigger, this requires no server-wide binary-log privilege.
 await db.query('ALTER TABLE requests ADD CONSTRAINT '+constraint+' CHECK (course_id <> '+course.courseId+')');
 try {
  const result=await api('/submit-form',{method:'POST',user:'ia',data:{...body,courseId:course.courseId},status:500});
  assert.deepEqual(result,{message:'Unable to complete the request. Please try again.'});
 } finally { await db.query('ALTER TABLE requests DROP CHECK '+constraint); }
 const [[after]]=await db.query('SELECT COUNT(*) AS n FROM textbooks');
 assert.equal(after.n,before.n);
});
test('database constraints reject cross-department teacher and inconsistent approval metadata', async () => {
 await assert.rejects(db.execute(`INSERT INTO courses (course_number,course_name,term,instructor_id,department_id)
 VALUES ('BAD','Bad','Test',101,2)`), e=>e.code==='ER_NO_REFERENCED_ROW_2');
 const {requestId}=await submit();
 await assert.rejects(db.execute("UPDATE requests SET status='Approved' WHERE request_id=?",[requestId]),
  e=>e.code==='ER_CHECK_CONSTRAINT_VIOLATED');
});
