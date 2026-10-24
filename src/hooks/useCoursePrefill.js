import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../api';
const empty = () => ({ publisher: '', title: '', author: '', isbn: '', edition: '', quantity: '', otherMaterials: '' });
export default function useCoursePrefill(token) {
 const [selectedCourse, select] = useState(null);
 const [formData, setFormData] = useState(empty);
 const [preFilled, setPreFilled] = useState(new Set());
 const [prefillLoading, setLoading] = useState(false);
 const [prefillError, setError] = useState('');
 const generation = useRef(0);
 const controller = useRef(null);
 const setSelectedCourse = useCallback(course => {
  const current = ++generation.current;
  controller.current?.abort();
  select(course); setFormData(empty()); setPreFilled(new Set()); setError('');
  setLoading(Boolean(course));
  if (!course) return;
  controller.current = new AbortController();
  fetch(apiUrl(`/api/textbooks/${course.course_id}`), {
   headers: { Authorization: `Bearer ${token}` }, signal: controller.current.signal,
  }).then(async response => {
   const data = await response.json();
   if (!response.ok) throw new Error(data.message || 'Unable to load textbook details.');
   if (current !== generation.current) return;
   const book = data.course;
   const values = empty();
   for (const field of ['publisher', 'title', 'author', 'isbn', 'edition', 'quantity'])
    values[field] = book[field] == null ? '' : String(book[field]);
   values.otherMaterials = book.other_materials || '';
   setFormData(values);
   setPreFilled(new Set(Object.keys(values).filter(key => values[key] !== '')));
  }).catch(error => {
   if (current === generation.current && error.name !== 'AbortError') setError(error.message || 'Unable to load textbook details.');
  }).finally(() => { if (current === generation.current) setLoading(false); });
 }, [token]);
 useEffect(() => () => { ++generation.current; controller.current?.abort(); }, []);
 return { selectedCourse, setSelectedCourse, formData, setFormData, preFilled, setPreFilled, prefillLoading, prefillError };
}
