export const API_BASE = (process.env.REACT_APP_API_BASE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5009')).replace(/\/$/, '');
export const apiUrl = path => API_BASE + path;
