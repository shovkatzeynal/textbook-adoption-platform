const { test, expect } = require('@playwright/test');
const password = 'DemoTextbooks!2026';
const apiBase = process.env.E2E_API_URL || 'http://localhost:5009';
async function login(page, email, route) {
 await page.goto('/');
 await page.getByPlaceholder('you@mvsu.edu').fill(email);
 await page.getByPlaceholder('Enter your password').fill(password);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page).toHaveURL(new RegExp(route+'$'));
}
async function fillBook(page, title) {
 await expect(page.getByLabel('Title *',{exact:true})).toBeEnabled();
 await page.getByLabel('Title *',{exact:true}).fill(title);
 await page.getByLabel('Author *',{exact:true}).fill('Browser Author');
 await page.getByLabel('Publisher *',{exact:true}).fill('Browser Press');
 await page.getByLabel('ISBN',{exact:true}).fill('9780262033848');
 await page.getByLabel('Edition',{exact:true}).fill('3rd');
 await page.getByLabel('Quantity *',{exact:true}).fill('25');
 await page.getByLabel('Other Materials / Notes',{exact:true}).fill('Browser lab manual');
}
async function instructorSubmit(page, title) {
 await page.getByRole('button',{name:/CS 101.*Introduction to Programming/}).click();
 await fillBook(page,title);
 const response=page.waitForResponse(r=>r.url().endsWith('/api/submit-form')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Submit for Approval'}).click();
 const res=await response;
 expect(res.status()).toBe(201);
 const {requestId}=await res.json();
 await expect(page.getByTestId('request-'+requestId)).toContainText('Pending');
 return requestId;
}
async function api(page, path, method='GET', data) {
 const token=await page.evaluate(()=>localStorage.getItem('token'));
 return page.request.fetch(apiBase+'/api'+path,{method,headers:{Authorization:'Bearer '+token},data});
}
test('browser scenarios A–E: approval, rejection, HoD confirmation, isolation and fulfillment', async ({browser}) => {
 const contexts=[], pages={}, errors=[];
 try {
  for(const [key,email,route] of [
   ['ia','alice.carter@example.test','/instructor'],['ha','david.brooks@example.test','/hod'],
   ['hb','michael.reed@example.test','/hod'],['bs','bookstore@example.test','/bookstore']]) {
   const context=await browser.newContext();
   contexts.push(context); const page=await context.newPage(); pages[key]=page;
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error' && !m.text().includes('Failed to load resource')) errors.push(m.text());});
   await login(page,email,route);
  }
  const {ia,ha,hb,bs}=pages, stamp=Date.now();
  // A: all interactions use the existing UI and real API/database.
  const first=await instructorSubmit(ia,'Browser approved '+stamp);
  await ha.reload();
  let card=ha.getByTestId('request-'+first);
  await card.getByRole('button',{name:'▼ View Details'}).click();
  await expect(card).toContainText('Browser approved '+stamp);
  await card.getByRole('button',{name:'✓ Approve',exact:true}).click();
  await expect(card).toHaveCount(0);
  await ia.reload();
  await expect(ia.getByTestId('request-'+first)).toContainText('Approved');
  await ia.getByTestId('request-'+first).getByText('View submission details').click();
  for(const value of ['CS 101','9780262033848','3rd','25','Browser lab manual'])
   await expect(ia.getByTestId('request-'+first)).toContainText(value);
  await bs.reload();
  await expect(bs.getByTestId('request-'+first)).toContainText('Approved');
  // B: exact rejection text returns to the requester.
  const rejected=await instructorSubmit(ia,'Browser rejected '+stamp);
  await ha.reload(); card=ha.getByTestId('request-'+rejected);
  await card.getByRole('button',{name:'▼ View Details'}).click();
  await card.getByRole('button',{name:'Reject',exact:true}).click();
  await card.getByRole('button',{name:'Confirm Rejection'}).click();
  await expect(card).toContainText('Please enter a rejection reason.');
  await card.getByPlaceholder('Explain clearly why this form is being rejected...').fill('Please verify the ISBN');
  await card.getByRole('button',{name:'Confirm Rejection'}).click();
  await expect(card).toHaveCount(0);
  await ia.reload();
  await expect(ia.getByTestId('request-'+rejected)).toContainText('Rejected');
  await expect(ia.getByTestId('request-'+rejected)).toContainText('Please verify the ISBN');
  // C: confirmation is required before any submission is sent.
  await ha.getByText('My Courses',{exact:true}).first().click();
  await ha.getByRole('button',{name:'Create Form →'}).first().click();
  await fillBook(ha,'Browser HoD own '+stamp);
  let submits=0; ha.on('request',r=>{if(r.url().endsWith('/api/submit-form')) submits++;});
  await ha.getByRole('button',{name:'Review & Submit'}).click();
  await expect(ha.getByText('This form will be automatically approved.')).toBeVisible();
  expect(submits).toBe(0);
  const selfResponse=ha.waitForResponse(r=>r.url().endsWith('/api/submit-form')&&r.request().method()==='POST');
  await ha.getByRole('button',{name:'Confirm & Submit',exact:true}).click();
  const selfRes=await selfResponse; expect(selfRes.status()).toBe(201);
  const self=await selfRes.json(); expect(self.status).toBe('Approved');
  await ha.getByText('My Submissions',{exact:true}).first().click();
  await expect(ha.getByTestId('request-'+self.requestId)).toContainText('Approved');
  await bs.reload(); await expect(bs.getByTestId('request-'+self.requestId)).toBeVisible();
  // D: separate department dashboard and direct forged-ID calls both stay isolated.
  await hb.reload();
  await expect(hb.getByTestId('request-'+first)).toHaveCount(0);
  expect((await api(hb,'/approve-form/'+first,'PATCH')).status()).toBe(404);
  expect((await api(ia,'/textbooks/12')).status()).toBe(404);
  expect((await api(ha,'/submit-form','POST',{courseId:12,title:'X',author:'Y',publisher:'Z',quantity:1})).status()).toBe(404);
  // E: pending/rejected are ineligible; approved follows the forward-only pipeline.
  const pending=await instructorSubmit(ia,'Browser pending '+stamp);
  expect((await api(bs,'/bookstore/forms/'+pending+'/update-status','PATCH',{newStatus:'Approved'})).status()).toBe(404);
  await bs.reload();
  await expect(bs.getByTestId('request-'+pending)).toHaveCount(0);
  await expect(bs.getByTestId('request-'+rejected)).toHaveCount(0);
  const row=bs.getByTestId('request-'+self.requestId);
  for(const status of ['Ready to be ordered','Ordered','Arrived','Ready to pick up','Picked up']) {
   await row.getByRole('button',{name:'Advance →'}).click();
   await expect(row.locator('.bs-select')).toHaveValue(status);
  }
  expect((await api(bs,'/bookstore/forms/'+self.requestId+'/update-status','PATCH',{newStatus:'Ordered'})).status()).toBe(409);
  expect((await api(bs,'/bookstore/forms/'+self.requestId+'/update-status','PATCH',{newStatus:'Arbitrary'})).status()).toBe(400);
  await ha.reload(); await ha.getByText('My Submissions',{exact:true}).first().click();
  await expect(ha.getByTestId('request-'+self.requestId)).toContainText('Picked up');
  // Refresh and logout/login preserve server history while clearing local session.
  await ia.getByRole('button',{name:'Log out',exact:true}).click();
  await ia.getByRole('button',{name:'Yes',exact:true}).click();
  await expect(ia).toHaveURL(/\/$/);
  expect(await ia.evaluate(()=>localStorage.getItem('token'))).toBeNull();
  await login(ia,'alice.carter@example.test','/instructor');
  await expect(ia.getByTestId('request-'+rejected)).toContainText('Please verify the ISBN');
  expect(errors).toEqual([]);
 } finally { for(const context of contexts) await context.close(); }
});
