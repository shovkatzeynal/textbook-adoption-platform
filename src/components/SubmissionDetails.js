import React from 'react';
export default function SubmissionDetails({ submission: s }) {
 return <details style={{ marginTop: 8, fontSize: 12 }}>
  <summary style={{ cursor: 'pointer', fontWeight: 700 }}>View submission details</summary>
  <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '5px 14px', marginTop: 10 }}>
   {[
    ['Request', s.request_id], ['Course number', s.course_number], ['Course name', s.course_name],
    ['Term', s.term], ['Title', s.title], ['Author', s.author], ['Publisher', s.publisher],
    ['ISBN', s.isbn], ['Edition', s.edition], ['Quantity', s.quantity], ['Other materials', s.otherMaterials],
    ['Submitted', s.created_at ? new Date(s.created_at).toLocaleString() : ''],
    ['Status', s.status], ['Requester', s.instructor_name], ['Reviewer', s.reviewer_name],
    ['Approved', s.approval_date ? new Date(s.approval_date).toLocaleString() : ''],
    ...(s.status === 'Rejected' ? [['Rejection feedback', s.rejection_comments]] : []),
   ].map(([label, value]) => <React.Fragment key={label}>
    <dt style={{ fontWeight: 700 }}>{label}</dt><dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{value || '—'}</dd>
   </React.Fragment>)}
  </dl>
 </details>;
}
