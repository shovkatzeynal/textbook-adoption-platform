import React from 'react';
import { render, screen, fireEvent, waitFor, renderHook, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import Instructor from './pages/Instructor';
import HoD from './pages/HoD';
import Bookstore from './pages/Bookstore';
import useCoursePrefill from './hooks/useCoursePrefill';
jest.mock('axios', () => ({ get: jest.fn(), patch: jest.fn(), delete: jest.fn() }));
const axios = require('axios');
const token = 'test.' + btoa(JSON.stringify({ exp: 4102444800 })) + '.test';
const json = data => ({ ok: true, json: async () => data });
beforeEach(() => {
 localStorage.clear(); window.history.replaceState({}, '', '/');
 global.fetch = jest.fn(async () => json({ courses: [], submissions: [], forms: [] }));
 axios.get.mockResolvedValue({ data: { forms: [] } });
});
afterEach(async () => { await act(async () => {}); jest.clearAllMocks(); });

test('renders the actual login and redirects an unauthenticated dashboard visit', () => {
 window.history.replaceState({}, '', '/hod');
 render(<App />);
 expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
 expect(window.location.pathname).toBe('/');
});
test.each([
 ['Instructor', '/instructor', 'Instructor Portal'],
 ['Head of Department', '/hod', 'Pending Department Forms'],
 ['Bookstore', '/bookstore', 'Bookstore Dashboard'],
])('login stores session and opens the %s dashboard', async (role, route, label) => {
 fetch.mockImplementation(async url => json(String(url).endsWith('/api/login')
  ? { token, userId: 101, role, firstName: 'Demo', lastName: 'User' }
  : { courses: [], submissions: [], forms: [] }));
 render(<App />);
 fireEvent.change(screen.getByPlaceholderText('you@mvsu.edu'), { target: { value: 'demo@example.test' } });
 fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'DemoTextbooks!2026' } });
 fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
 await screen.findByText(label);
 expect(window.location.pathname).toBe(route);
 expect(localStorage.getItem('token')).toBe(token);
});
const historical = { request_id: 90, course_id: 11, course_number: 'A-101', course_name: 'History Course',
 term: 'Fall 2026', title: 'Historical Text', author: 'Historical Author', publisher: 'Historical Press',
 isbn: '9780000000001', edition: '3rd', quantity: 27, otherMaterials: 'Historical lab manual',
 created_at: '2026-09-01T12:00:00Z', status: 'Rejected', rejection_comments: 'Please verify the ISBN' };
test('Instructor can open full historical details and exact rejection feedback', async () => {
 localStorage.setItem('token', token);
 fetch.mockImplementation(async url => json(String(url).includes('instructor-submissions')
  ? { submissions: [historical] } : { courses: [] }));
 render(<MemoryRouter><Instructor /></MemoryRouter>);
 await screen.findAllByText('History Course');
 fireEvent.click(screen.getByText('View submission details'));
 for (const value of ['A-101', '9780000000001', '3rd', '27', 'Historical lab manual'])
  expect(screen.getByText(value)).toBeInTheDocument();
 expect(screen.getAllByText('Please verify the ISBN').length).toBeGreaterThan(0);
});
test('HoD own Ordered submission remains in My Submissions', async () => {
 localStorage.setItem('token', token);
 fetch.mockImplementation(async url => json(String(url).includes('instructor-submissions')
  ? { submissions: [{ ...historical, status: 'Ordered', rejection_comments: null }] } : { courses: [], forms: [] }));
 render(<MemoryRouter><HoD /></MemoryRouter>);
 await screen.findAllByText('History Course');
 fireEvent.click(screen.getAllByText('My Submissions')[0]);
 expect(screen.getByText('View submission details')).toBeInTheDocument();
 expect(screen.getAllByText('Ordered').length).toBeGreaterThan(1);
});
test('late A response cannot replace B prefill, and closing invalidates an in-flight request', async () => {
 const pending = {};
 fetch.mockImplementation(url => new Promise(resolve => { pending[String(url).split('/').pop()] = resolve; }));
 const { result } = renderHook(() => useCoursePrefill(token));
 act(() => result.current.setSelectedCourse({ course_id: 11 }));
 act(() => result.current.setSelectedCourse({ course_id: 12 }));
 await act(async () => pending['12'](json({ course: { title: 'B book' } })));
 expect(result.current.formData.title).toBe('B book');
 await act(async () => pending['11'](json({ course: { title: 'A book' } })));
 expect(result.current.formData.title).toBe('B book');
 act(() => result.current.setSelectedCourse({ course_id: 13 }));
 expect(result.current.formData.title).toBe('');
 act(() => result.current.setSelectedCourse(null));
 await act(async () => pending['13'](json({ course: { title: 'Closed book' } })));
 expect(result.current.selectedCourse).toBeNull();
 expect(result.current.formData.title).toBe('');
});
test('prefill failure clears previous values and blocks submission until retry succeeds', async () => {
 fetch.mockResolvedValueOnce(json({ course: { title: 'Previous' } })).mockRejectedValueOnce(new Error('Network unavailable'));
 const { result } = renderHook(() => useCoursePrefill(token));
 act(() => result.current.setSelectedCourse({ course_id: 11 }));
 await waitFor(() => expect(result.current.formData.title).toBe('Previous'));
 act(() => result.current.setSelectedCourse({ course_id: 12 }));
 await waitFor(() => expect(result.current.prefillError).toBe('Network unavailable'));
 expect(result.current.formData.title).toBe('');
 expect(result.current.prefillLoading).toBe(false);
});
test('Bookstore logout clears session and returns to login', async () => {
 localStorage.setItem('token', token); localStorage.setItem('role', 'Bookstore');
 window.history.replaceState({}, '', '/bookstore');
 render(<App />);
 await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
 fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
 expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
 expect(localStorage.getItem('token')).toBeNull();
});

test('HoD Approved timeline includes every fulfillment stage and excludes unaccepted requests', async () => {
 localStorage.setItem('token', token);
 const accepted = ['Approved', 'Ready to be ordered', 'Ordered', 'Arrived', 'Ready to pick up', 'Picked up'];
 const forms = [...accepted, 'Pending', 'Rejected'].map((status, i) => ({
  ...historical, request_id: i + 1, course_name: `${status} course`, status,
 }));
 fetch.mockImplementation(async url => json(String(url).endsWith('/api/hod-forms')
  ? { forms } : { courses: [], submissions: [] }));
 render(<MemoryRouter><HoD /></MemoryRouter>);
 await screen.findByText('Ordered course');
 fireEvent.click(screen.getByRole('button', { name: 'Approved', exact: true }));
 const timeline = within(screen.getByText('All forms — sorted by date').parentElement.parentElement);
 for (const status of accepted) expect(timeline.getByText(`${status} course`)).toBeInTheDocument();
 expect(timeline.queryByText('Pending course')).not.toBeInTheDocument();
 expect(timeline.queryByText('Rejected course')).not.toBeInTheDocument();
 expect(screen.queryByText('Spring 2026')).not.toBeInTheDocument();
 expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
 expect(screen.queryByText('Department', { exact: true })).not.toBeInTheDocument();
});

test('HoD approval reloads server approval metadata immediately', async () => {
 localStorage.setItem('token', token);
 let approved = false;
 const approvalDate = '2026-10-26T14:00:00Z';
 fetch.mockImplementation(async url => {
  if (String(url).includes('/api/approve-form/')) { approved = true; return json({ message: 'Approved' }); }
  if (String(url).endsWith('/api/hod-forms')) return json({ forms: [{ ...historical,
   status: approved ? 'Approved' : 'Pending', rejection_comments: null,
   approved_by: approved ? 201 : null, approval_date: approved ? approvalDate : null,
   reviewer_name: 'Demo Reviewer',
  }] });
  return json({ courses: [], submissions: [] });
 });
 render(<MemoryRouter><HoD /></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button', { name: /View Details/ }));
 fireEvent.click(screen.getByRole('button', { name: /✓ Approve/ }));
 await waitFor(() => expect(screen.queryByRole('button', { name: /✓ Approve/ })).not.toBeInTheDocument());
 fireEvent.click(screen.getAllByText('Approved', { exact: true }).find(node => node.tagName === 'SPAN'));
 fireEvent.click(screen.getByText('View submission details'));
 expect(await screen.findByText(new Date(approvalDate).toLocaleString())).toBeInTheDocument();
 expect(screen.getByText('Demo Reviewer')).toBeInTheDocument();
});

test.each([
 ['update', 'Only the next fulfillment stage is allowed.', 'Only the next fulfillment stage is allowed.'],
 ['update', '<html>SQL error and internal diagnostics</html>', 'Failed to update status.'],
 ['archive', 'Only an unarchived Picked up request can be archived.', 'Only an unarchived Picked up request can be archived.'],
 ['archive', { stack: 'internal details' }, 'Failed to archive order.'],
])('Bookstore %s shows only recognized public errors (%s)', async (action, message, expected) => {
 const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
 const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
 const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
 try {
  axios.get.mockResolvedValue({ data: { forms: [{ ...historical, rejection_comments: null,
   status: action === 'archive' ? 'Picked up' : 'Approved' }] } });
  axios.patch.mockRejectedValue({ response: { data: { message } } });
  axios.delete.mockRejectedValue({ response: { data: { message } } });
  render(<MemoryRouter><Bookstore /></MemoryRouter>);
  const order = await screen.findByTestId('request-90');
  fireEvent.click(action === 'archive'
   ? within(order).getByTitle('Archive completed order')
   : within(order).getByRole('button', { name: 'Advance →' }));
  await waitFor(() => expect(alert).toHaveBeenCalledWith(expected));
 } finally { alert.mockRestore(); confirm.mockRestore(); errorLog.mockRestore(); }
});

test.each([[9, 'Good morning'], [14, 'Good afternoon'], [20, 'Good evening']])(
 'Instructor greeting follows browser hour %s', async (hour, greeting) => {
  const clock = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
  try {
   render(<MemoryRouter><Instructor /></MemoryRouter>);
   expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(greeting);
   await act(async () => {});
  } finally { clock.mockRestore(); }
 });
