import useCoursePrefill from "../hooks/useCoursePrefill";
import SubmissionDetails from "../components/SubmissionDetails";
import { apiUrl } from "../api";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// ══ CHANGE WEBSITE BACKGROUND HERE ════════════════════
//   "#F8F8F8"  — off-white (current)
//   "#FFFFFF"  — pure white
//   "#FFF8F2"  — warm cream
//   "#F2EDE8"  — warm gray
const SITE_BG = "#F8F8F8";
// ══════════════════════════════════════════════════════

const APPROVED_STATUSES = new Set([
  "Approved", "Ready to be ordered", "Ordered", "Arrived", "Ready to pick up", "Picked up",
]);
const FULFILLMENT_BADGES = {
  "Ready to be ordered": { background: "#FFF2E5", color: "#E56515" },
  "Ordered": { background: "#F3F0FF", color: "#7c5cfc" },
  "Arrived": { background: "#E0F2FE", color: "#0369a1" },
  "Ready to pick up": { background: "#FEF3C7", color: "#b45309" },
  "Picked up": { background: "#F4F4F4", color: "#919599" },
};

const C = {
  orange:     "#E56515",
  orangeMid:  "#FBA45C",
  orangeSoft: "#FFF2E5",
  orangePale: "#FFF8F2",
  grayMid:    "#919599",
  grayLight:  "#CDCDCB",
  offWhite:   "#F8F8F8",
  white:      "#FFFFFF",
  text:       "#1C1C1E",
  text2:      "#919599",
  border:     "#EBEBEB",
  border2:    "#CDCDCB",
  green:      "#1a7a4a",
  greenSoft:  "#EBF7F1",
  red:        "#c0392b",
  redSoft:    "#FEF0F0",
  dark:       "#2a2a2a",
};

// ─── Inline AddCourse form (no external component so it never collapses the card) ───
const AddCourseInline = ({ token, onCourseAdded }) => {
  const [num,  setNum]  = useState("");
  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState("");   // "" | "saving" | "ok" | "err:<msg>"

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!num.trim() || !name.trim() || !term.trim()) {
      setBusy("err:All three fields are required."); return;
    }
    setBusy("saving");
    try {
      const res  = await fetch(apiUrl("/api/add-course"), {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ courseNumber: num, courseName: name, term }),
      });
      const data = await res.json();
      if (res.ok) {
        setNum(""); setName(""); setTerm("");
        setBusy("ok");
        onCourseAdded();
        setTimeout(() => setBusy(""), 2500);
      } else {
        setBusy(`err:${data.message || "Failed to add course."}`);
      }
    } catch {
      setBusy("err:Network error. Please try again.");
    }
  };

  const isErr = busy.startsWith("err:");
  const errMsg = isErr ? busy.slice(4) : "";

  return (
    <form onSubmit={handleAdd} onClick={e => e.stopPropagation()}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <Lf label="Course Number" value={num}  onChange={setNum}  placeholder="e.g. CS 101" />
        <Lf label="Course Name"   value={name} onChange={setName} placeholder="e.g. Data Structures" />
      </div>
      <Lf label="Term" value={term} onChange={setTerm} placeholder="e.g. Fall 2026" />
      {busy === "ok"  && <p style={{ fontSize: 12, color: C.green,  marginBottom: 8 }}>✓ Course added!</p>}
      {isErr          && <p style={{ fontSize: 12, color: C.red,    marginBottom: 8 }}>{errMsg}</p>}
      <button
        type="submit"
        disabled={busy === "saving"}
        style={{ background: C.orange, color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: busy === "saving" ? "default" : "pointer", opacity: busy === "saving" ? .7 : 1 }}
      >
        {busy === "saving" ? "Adding..." : "+ Add Course"}
      </button>
    </form>
  );
};

// small labelled field used inside AddCourseInline
const Lf = ({ label, value, onChange, placeholder }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.text2, display: "block", marginBottom: 3 }}>{label}</label>
    <input
      aria-label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onClick={e => e.stopPropagation()}
      style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${C.border2}`, background: C.white, fontSize: 13, color: C.text, fontFamily: "Inter,sans-serif" }}
    />
  </div>
);

// ─── Confirmation modal for HoD self-submission ────────────────────────────
const ConfirmModal = ({ formData, course, onConfirm, onCancel, submitting }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div style={{ background: C.white, borderRadius: 14, padding: "28px 32px", maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.orange, marginBottom: 10 }}>Review before submitting</p>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: C.text, marginBottom: 18, lineHeight: 1.25 }}>
        You are submitting as Head of Department.<br />
        <span style={{ fontSize: 14, fontWeight: 400, color: C.text2 }}>This form will be automatically approved.</span>
      </h2>
      <div style={{ background: C.offWhite, borderRadius: 8, padding: "14px 16px", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
        {[
          ["Course",    course.course_name],
          ["Term",      course.term],
          ["Title",     formData.title],
          ["Author",    formData.author],
          ["Publisher", formData.publisher],
          ["Quantity",  formData.quantity],
          ["ISBN",      formData.isbn      || "—"],
          ["Edition",   formData.edition   || "—"],
        ].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.text2, marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{v}</div>
          </div>
        ))}
        {formData.otherMaterials && (
          <div style={{ gridColumn: "1/-1" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.text2, marginBottom: 2 }}>Other Materials</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{formData.otherMaterials}</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          disabled={submitting}
          onClick={onConfirm}
          style={{ flex: 1, background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: submitting ? "default" : "pointer", opacity: submitting ? .7 : 1 }}
        >
          {submitting ? "Submitting..." : "Confirm & Submit"}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          style={{ flex: "0 0 auto", background: C.white, color: C.text2, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Go back
        </button>
      </div>
    </div>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────
const HoDPage = () => {
  const [courses,        setCourses]        = useState([]);
  const [mySubmissions,  setMySubmissions]  = useState([]);
  const [deptForms,      setDeptForms]      = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingDept,    setLoadingDept]    = useState(true);
  const [coursesError,   setCoursesError]   = useState("");
  const [submitSuccess,  setSubmitSuccess]  = useState(false);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [showConfirm,    setShowConfirm]    = useState(false);   // HoD self-submit modal
  const [activeCard,     setActiveCard]     = useState(null);
  const [expandedIds,      setExpandedIds]      = useState(new Set());
  const [rejectingId,      setRejectingId]      = useState(null);
  const [rejectComment,    setRejectComment]    = useState("");
  const [rejectError,      setRejectError]      = useState("");
  const [timelineFilter,   setTimelineFilter]   = useState("All");
  const [termFilter,       setTermFilter]       = useState("All");
  const [toasts,           setToasts]           = useState([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const formRef  = useRef(null);
  const navigate = useNavigate();

  const hodName   = localStorage.getItem("fullName") || "Head of Department";
  const firstName = hodName.split(" ")[0];
  const token     = localStorage.getItem("token");
  const { selectedCourse, setSelectedCourse, formData, setFormData, prefillLoading, prefillError } = useCoursePrefill(token);
  const [loadError, setLoadError] = useState("");
  const [reviewingId, setReviewingId] = useState(null);

  // ── Fetchers ──────────────────────────────────────────
  const fetchCourses = useCallback(async () => {
    if (!token) { setCoursesError("No session. Please log in again."); setLoadingCourses(false); return; }
    setLoadingCourses(true); setCoursesError("");
    try {
      const res  = await fetch(apiUrl("/api/courses"), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setCourses(data.courses || []);
      else        setCoursesError(data.message || "Failed to fetch courses.");
    } catch { setCoursesError("Network error."); }
    finally { setLoadingCourses(false); }
  }, [token]);

  const fetchMySubmissions = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(apiUrl("/api/instructor-submissions"), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to load own submissions.");
      setMySubmissions(data.submissions || []);
    } catch (err) { setLoadError(err.message || "Unable to load submissions."); }
  }, [token]);

  const fetchDeptForms = useCallback(async () => {
    if (!token) return;
    setLoadingDept(true);
    try {
      const res  = await fetch(apiUrl("/api/hod-forms"), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to load department forms.");
      setDeptForms(data.forms || []);
    } catch (err) { setLoadError(err.message || "Unable to load department forms."); }
    finally { setLoadingDept(false); }
  }, [token]);

  useEffect(() => { fetchCourses(); fetchMySubmissions(); fetchDeptForms(); }, [fetchCourses, fetchMySubmissions, fetchDeptForms]);

  // ── Course → pre-fill textbook form ───────────────────
  const handleCreateForm = (course) => {
    if (isSubmitting) return;
    setSelectedCourse(course); setSubmitSuccess(false); setShowConfirm(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  // ── Validate form fields before showing confirm modal ─
  const handleFormSubmitClick = (e) => {
    e.preventDefault();
    if (prefillLoading || prefillError || isSubmitting || !selectedCourse) return;
    if (!formData.title.trim() || !formData.author.trim() || !formData.publisher.trim()) {
      toast("Please fill in Title, Author, and Publisher.", "error"); return;
    }
    if (!Number.isInteger(Number(formData.quantity)) || Number(formData.quantity) < 1) {
      toast("Quantity must be at least 1.", "error"); return;
    }
    setShowConfirm(true);
  };

  // ── Actual submit after confirmation ──────────────────
  const handleConfirmedSubmit = async () => {
    if (isSubmitting || prefillLoading || prefillError || !selectedCourse) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/submit-form"), {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ courseId: selectedCourse.course_id, ...formData }),
      });
      const result = await res.json();
      if (res.ok) {
        setShowConfirm(false);
        setSubmitSuccess(true);
        setSelectedCourse(null);
        setFormData({ publisher: "", title: "", author: "", isbn: "", edition: "", quantity: "", otherMaterials: "" });
        fetchMySubmissions();
        fetchDeptForms();
      } else {
        setShowConfirm(false);
        toast(result.message || "Failed to submit.", "error");
      }
    } catch { setShowConfirm(false); toast("Error submitting the form.", "error"); }
    finally { setIsSubmitting(false); }
  };

  // ── Approve dept form ─────────────────────────────────
  const handleApprove = async (formId) => {
    if (reviewingId !== null) return;
    setReviewingId(formId);
    try {
      const res  = await fetch(apiUrl(`/api/approve-form/${formId}`), { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setDeptForms(prev => prev.map(f => f.request_id === formId ? { ...f, status: "Approved" } : f));
        setExpandedIds(prev => { const n = new Set(prev); n.delete(formId); return n; });
        await fetchDeptForms();
        toast("Form approved successfully.");
      } else toast(data.message || "Failed to approve.", "error");
    } catch { toast("Error approving form.", "error"); }
    finally { setReviewingId(null); }
  };

  // ── Reject dept form ──────────────────────────────────
  const handleReject = async (formId) => {
    if (!rejectComment.trim()) { setRejectError("Please enter a rejection reason."); return; }
    if (reviewingId !== null) return;
    setReviewingId(formId);
    setRejectError("");
    try {
      const res  = await fetch(apiUrl(`/api/reject-form/${formId}`), {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ rejectionComments: rejectComment }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeptForms(prev => prev.map(f => f.request_id === formId ? { ...f, status: "Rejected", rejection_comments: rejectComment } : f));
        setRejectingId(null); setRejectComment("");
        setExpandedIds(prev => { const n = new Set(prev); n.delete(formId); return n; });
        toast("Form rejected.");
      } else toast(data.message || "Failed to reject.", "error");
    } catch { toast("Error rejecting form.", "error"); }
    finally { setReviewingId(null); }
  };

  const doLogout = () => { localStorage.clear(); navigate("/"); };

  const toast = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);

  const toggleExpand = (id) => setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";

  const pendingForms  = deptForms.filter(f => f.status === "Pending");
  const approvedForms = deptForms.filter(f => APPROVED_STATUSES.has(f.status));
  const rejectedForms = deptForms.filter(f => f.status === "Rejected");

  const seenIds     = new Set();
  const allTimeline = [...deptForms, ...mySubmissions]
    .filter(item => { if (seenIds.has(item.request_id)) return false; seenIds.add(item.request_id); return true; })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const uniqueTerms = ["All", ...new Set(allTimeline.map(i => i.term).filter(Boolean))];

  const filteredTimeline = allTimeline
    .filter(f => timelineFilter === "All" || (timelineFilter === "Approved" ? APPROVED_STATUSES.has(f.status) : f.status === timelineFilter))
    .filter(f => termFilter     === "All" || f.term   === termFilter);

  const bdg = (status) => status === "Approved" ? S.bdgA : status === "Rejected" ? S.bdgR
    : FULFILLMENT_BADGES[status] ? { ...S.bdgP, ...FULFILLMENT_BADGES[status] } : S.bdgP;

  // ── Card bodies ───────────────────────────────────────
  const renderCardBody = () => {
    // ── MY COURSES ──
    if (activeCard === "courses") return (
      <div style={S.cardbody} onClick={e => e.stopPropagation()}>
        {loadingCourses ? (
          <p style={S.muted}>Loading...</p>
        ) : coursesError ? (
          <p style={{ color: C.red, fontSize: 13 }}>{coursesError}</p>
        ) : courses.length === 0 ? (
          <p style={S.muted}>No courses yet — add one below.</p>
        ) : (
          <div style={S.courselist}>
            {courses.map(c => (
              <div key={c.course_id} style={S.crow}>
                <div style={{ width: 3, height: 32, borderRadius: 2, background: C.orange, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.orange, letterSpacing: ".07em", textTransform: "uppercase" }}>{c.course_number}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.course_name}</div>
                  <div style={{ fontSize: 11, color: C.text2 }}>{c.term}</div>
                </div>
                <button
                  style={{ background: C.dark, color: "#fff", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); handleCreateForm(c); }}
                >
                  Create Form →
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={S.sep} />
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.text2, marginBottom: 10 }}>+ Add a New Course</p>
        <AddCourseInline token={token} onCourseAdded={fetchCourses} />
      </div>
    );

    // ── MY SUBMISSIONS ──
    if (activeCard === "submissions") {
      const hodSubs = mySubmissions;
      return (
        <div style={S.cardbody} onClick={e => e.stopPropagation()}>
          {hodSubs.length === 0 ? (
            <p style={S.muted}>No submissions yet — create a form from "My Courses" above.</p>
          ) : (
            <div style={S.sublist}>
              {hodSubs.map(s => (
                <div key={s.request_id} data-testid={`request-${s.request_id}`} style={S.sitem}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.course_name}</div>
                    <span style={bdg(s.status)}>{s.status}</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.text2, marginBottom: 6 }}>{s.course_number} · {s.term} · {fmt(s.created_at)}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", background: C.offWhite, borderRadius: 7, padding: "8px 10px" }}>
                    {[["Title", s.title], ["Author", s.author], ["Publisher", s.publisher], ["ISBN", s.isbn || "—"], ["Edition", s.edition || "—"], ["Qty", s.quantity]].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: C.text2 }}>{l}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <SubmissionDetails submission={s} />
                  {s.otherMaterials && (
                    <div style={{ fontSize: 11, color: C.text2, marginTop: 5 }}>Other: {s.otherMaterials}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── APPROVED / REJECTED ──
    // Shows dept forms (instructor-submitted) only — not HoD's own.
    const list  = activeCard === "approved" ? approvedForms : rejectedForms;
    const lbl   = activeCard === "approved" ? "approved" : "rejected";
    return (
      <div style={S.cardbody} onClick={e => e.stopPropagation()}>
        {list.length === 0 ? (
          <p style={S.muted}>No {lbl} department forms yet — they'll appear here once you {lbl === "approved" ? "approve" : "reject"} a submission.</p>
        ) : (
          <div style={S.sublist}>
            {list.map(f => (
              <div key={f.request_id} style={S.sitem}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{f.course_name}</div>
                  <span style={bdg(f.status)}>{f.status}</span>
                </div>
                <div style={{ fontSize: 10, color: C.text2, marginBottom: 6 }}>
                  {f.instructor_name} · {f.term} · {fmt(f.created_at)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", background: C.offWhite, borderRadius: 7, padding: "8px 10px" }}>
                  {[["Title", f.title], ["Author", f.author], ["Publisher", f.publisher], ["ISBN", f.isbn || "—"], ["Edition", f.edition || "—"], ["Qty", f.quantity]].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: C.text2 }}>{l}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{v}</div>
                    </div>
                  ))}
                </div>
                <SubmissionDetails submission={f} />
                {/* Always show rejection reason on rejected forms */}
                {f.rejection_comments && (
                  <div style={{ marginTop: 8, background: C.redSoft, border: `1px solid rgba(192,57,43,.15)`, borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.red, marginBottom: 3 }}>Rejection Reason</div>
                    <div style={{ fontSize: 12, color: C.text }}>{f.rejection_comments}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${SITE_BG}; font-family: 'Inter', sans-serif; }
        @keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .toast-slide { animation: toastIn .22s ease; }
        .hfi:focus  { outline: none; border-color: ${C.orange} !important; background: #fff !important; }
        .hcard:hover { box-shadow: 0 6px 20px rgba(229,101,21,.2), 0 2px 8px rgba(229,101,21,.1) !important; transform: translateY(-2px) !important; border-color: ${C.orange} !important; }
        .hpitem:hover { border-color: ${C.orangeMid} !important; }
        .htitem:hover { border-color: ${C.orangeMid} !important; background: ${C.orangeSoft} !important; }
        .hnav:hover   { background: rgba(255,255,255,.07) !important; color: rgba(255,255,255,.8) !important; }
        .hplist::-webkit-scrollbar { width: 3px; }
        .hplist::-webkit-scrollbar-thumb { background: ${C.orangeMid}; border-radius: 2px; }
        .hsublist::-webkit-scrollbar { width: 3px; }
        .hsublist::-webkit-scrollbar-thumb { background: ${C.orangeMid}; border-radius: 2px; }
      `}</style>

      {/* ── Toast stack ── */}
      <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} className="toast-slide" style={{ background: t.type === "error" ? C.red : C.green, color: "#fff", padding: "11px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,.18)", maxWidth: 340 }}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* ── Confirm modal ── */}
      {showConfirm && selectedCourse && (
        <ConfirmModal
          formData={formData}
          course={selectedCourse}
          onConfirm={handleConfirmedSubmit}
          onCancel={() => setShowConfirm(false)}
          submitting={isSubmitting}
        />
      )}

      <div style={S.shell}>

        {/* ── Sidebar ── */}
        <aside style={S.sidebar}>
          <div style={S.sidelogo}>
            <div style={{ width: 30, height: 30, background: C.orange, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>MVSU</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", marginTop: 1 }}>Textbook Portal</div>
            </div>
          </div>
          <nav style={{ padding: "12px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            {[
              { key: "courses",     label: "My Courses",     icon: "grid" },
              { key: "submissions", label: "My Submissions",  icon: "file" },
            ].map(({ key, label, icon }) => (
              <NavItem key={key} label={label} icon={icon}
                active={activeCard === key}
                onClick={() => setActiveCard(activeCard === key ? null : key)}
              />
            ))}
          </nav>
          <div style={{ padding: "13px 12px", borderTop: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
              {(hodName || "?").split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{hodName}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>Head of Department</div>
            </div>
          </div>
        </aside>

        <div style={S.main}>

          {/* ── Top bar ── */}
          <div style={S.topbar}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.6)", marginBottom: 6 }}>Head of Department Portal</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>
                Welcome back, <em style={{ fontStyle: "italic", color: "rgba(255,255,255,.85)" }}>{firstName}.</em>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 5 }}>Manage your courses &amp; department submissions</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {!showLogoutConfirm ? (
                <button onClick={() => setShowLogoutConfirm(true)} style={{ background: "#fff", color: C.orange, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Log out
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.12)", borderRadius: 8, padding: "6px 12px" }}>
                  <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>Log out?</span>
                  <button onClick={doLogout} style={{ background: "#fff", color: "#c0392b", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}>Yes</button>
                  <button onClick={() => setShowLogoutConfirm(false)} style={{ background: "transparent", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.3)", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                </div>
              )}
            </div>
          </div>

          <div style={S.content}>

            {submitSuccess && (
              <div style={{ background: C.orangeSoft, border: `1.5px solid ${C.orangeMid}`, borderRadius: 8, padding: "11px 16px", color: C.orange, fontWeight: 700, fontSize: 13, marginBottom: 20 }}>
                ✓ Form submitted and automatically approved — visible in the bookstore.
              </div>
            )}

            {/* ── Overview cards ── */}
            <SL>Overview</SL>

            <div style={S.cardrow}>
              {[
                { key: "courses",     label: "My Courses",    count: courses.length },
                { key: "submissions", label: "My Submissions", count: mySubmissions.length },
                { key: "approved",    label: "Approved",       count: approvedForms.length },
                { key: "rejected",    label: "Rejected",       count: rejectedForms.length },
              ].map(({ key, label, count }) => {
                const on = activeCard === key;
                return (
                  <div
                    key={key}
                    className={on ? "" : "hcard"}
                    style={{
                      ...S.card,
                      flex:      on ? 1 : "0 0 120px",
                      width:     on ? undefined : "120px",
                      height:    on ? undefined : "120px",
                      minHeight: on ? undefined : "120px",
                      maxHeight: on ? undefined : "120px",
                      background: on ? C.orangeSoft : "#FFF2E5",
                      border:     on ? `2px solid rgba(229,101,21,.4)` : `2px solid #FBA45C`,
                      cursor:     on ? "default" : "pointer",
                    }}
                    onClick={() => !on && setActiveCard(key)}
                  >
                    <div style={{ padding: "14px 15px", display: "flex", flexDirection: on ? "row" : "column", alignItems: "center", justifyContent: "center", gap: on ? 4 : 6, borderBottom: on ? `1px solid rgba(229,101,21,.15)` : "none", background: on ? C.orangeSoft : "transparent" }}
                         onClick={() => on && setActiveCard(null)}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: C.orange, whiteSpace: "normal", textAlign: "center", lineHeight: 1.4 }}>{label}</span>
                      <span style={{ fontSize: on ? 9 : 26, fontWeight: 700, color: C.orange, lineHeight: 1 }}>{count}</span>
                    </div>
                    {on && renderCardBody()}
                  </div>
                );
              })}
            </div>

            {/* ── Textbook Adoption Form (full width) ── */}
            {loadError && <p role="alert">{loadError} <button onClick={() => { setLoadError(""); fetchMySubmissions(); fetchDeptForms(); }}>Retry</button></p>}
            <SL>Create Textbook Form</SL>

            <div style={S.panel} ref={formRef}>
              {selectedCourse ? (
                <>
                  <div style={{ background: C.orangeSoft, borderBottom: `1.5px solid rgba(229,101,21,.15)`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: C.text }}>{selectedCourse.course_name}</div>
                      <div style={{ fontSize: 11, color: C.orange, fontWeight: 500, marginTop: 3 }}>{selectedCourse.course_number} · {selectedCourse.term} — pre-filled from course</div>
                    </div>
                    <button type="button" onClick={() => setSelectedCourse(null)} style={{ background: "transparent", color: C.text2, border: `1px solid ${C.border2}`, borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      ✕ Close
                    </button>
                  </div>
                  <div style={{ padding: "20px 24px" }}>
                    {prefillLoading && <p role="status">Loading textbook details...</p>}
                    {prefillError && <p role="alert">{prefillError} <button onClick={() => setSelectedCourse(selectedCourse)}>Retry</button></p>}
                    <form onSubmit={handleFormSubmitClick}>
                      <fieldset disabled={prefillLoading || Boolean(prefillError) || isSubmitting} style={{ border: 0, padding: 0, margin: 0 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 20px" }}>
                        <FF label="Title *"     value={formData.title}     onChange={v => setFormData(p => ({ ...p, title: v }))}     placeholder="e.g. Calculus" />
                        <FF label="Author *"    value={formData.author}    onChange={v => setFormData(p => ({ ...p, author: v }))}    placeholder="e.g. Stewart" />
                        <FF label="Publisher *" value={formData.publisher} onChange={v => setFormData(p => ({ ...p, publisher: v }))} placeholder="e.g. Cengage" />
                        <FF label="ISBN"        value={formData.isbn}      onChange={v => setFormData(p => ({ ...p, isbn: v }))}      placeholder="978-..." />
                        <FF label="Edition"     value={formData.edition}   onChange={v => setFormData(p => ({ ...p, edition: v }))}   placeholder="e.g. 8th" />
                        <FF label="Quantity *"  value={formData.quantity}  onChange={v => setFormData(p => ({ ...p, quantity: v }))}  placeholder="e.g. 30" type="number" />
                      </div>
                      <FF label="Other Materials / Notes" value={formData.otherMaterials} onChange={v => setFormData(p => ({ ...p, otherMaterials: v }))} placeholder="e.g. Lab manual, access code, etc." />
                      <div style={{ height: 1, background: C.border, margin: "14px 0" }} />
                      <button type="submit" style={{ background: C.orange, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        Review &amp; Submit
                      </button>
                      <button type="button" onClick={() => setSelectedCourse(null)} style={{ background: C.white, color: C.orange, border: `1.5px solid ${C.orange}`, borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginLeft: 10 }}>
                        Cancel
                      </button>
                      </fieldset>
                    </form>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: C.orangeSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>No course selected</div>
                    <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>Open "My Courses" above → click "Create Form →" on a course to fill in the adoption form here.</div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Pending Department Forms (full width, spacious) ── */}
            <SL>Pending Department Forms</SL>

            <div style={S.panel}>
              <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.text2 }}>
                  Forms awaiting your review
                </span>
                <span style={{ fontSize: 11, color: C.orange, fontWeight: 700 }}>
                  {loadingDept ? "Loading..." : `${pendingForms.length} pending`}
                </span>
              </div>
              <div style={{ padding: "16px 24px" }}>
                {pendingForms.length === 0 && !loadingDept ? (
                  <div style={{ padding: "24px 0", textAlign: "center" }}>
                    <p style={S.muted}>No pending forms — instructors in your department haven't submitted yet, or all submissions have been reviewed.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {pendingForms.map(form => {
                      const isExp = expandedIds.has(form.request_id);
                      const isRej = rejectingId === form.request_id;
                      return (
                        <div key={form.request_id} data-testid={`request-${form.request_id}`} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 12, overflow: "hidden", transition: "border-color .15s" }}>

                          {/* ── Header row — always visible ── */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: C.white, gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{form.course_name}</div>
                              <div style={{ fontSize: 11, color: C.text2, marginTop: 3 }}>
                                Submitted by <strong>{form.instructor_name}</strong> · {form.term} · {fmt(form.created_at)}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                              <span style={S.bdgP}>Pending</span>
                              <button
                                style={{ background: isExp ? C.orangeSoft : C.offWhite, color: C.orange, border: `1.5px solid ${isExp ? C.orange : C.border2}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}
                                onClick={() => toggleExpand(form.request_id)}
                              >
                                {isExp ? "▲ Collapse" : "▼ View Details"}
                              </button>
                            </div>
                          </div>

                          {/* ── Expanded details ── */}
                          {isExp && (
                            <div style={{ borderTop: `1px solid ${C.border}`, background: C.orangePale, padding: "18px 20px" }}>

                              <SubmissionDetails submission={form} />
                              {/* Full details grid — 4 columns for plenty of space */}
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px 20px", marginBottom: 16 }}>
                                {[
                                  ["Title",     form.title],
                                  ["Author",    form.author],
                                  ["Publisher", form.publisher],
                                  ["Quantity",  form.quantity],
                                  ["ISBN",      form.isbn    || "—"],
                                  ["Edition",   form.edition || "—"],
                                ].map(([l, v]) => (
                                  <div key={l} style={{ background: C.white, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: C.text2, marginBottom: 4 }}>{l}</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, wordBreak: "break-word" }}>{v}</div>
                                  </div>
                                ))}
                              </div>

                              {form.otherMaterials && (
                                <div style={{ background: C.white, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border}`, marginBottom: 16 }}>
                                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: C.text2, marginBottom: 4 }}>Other Materials</div>
                                  <div style={{ fontSize: 13, color: C.text }}>{form.otherMaterials}</div>
                                </div>
                              )}

                              <div style={{ height: 1, background: C.border, margin: "4px 0 16px" }} />

                              {/* ── Action buttons ── */}
                              {!isRej ? (
                                <div style={{ display: "flex", gap: 10 }}>
                                  <button
                                    style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                                    disabled={reviewingId !== null} onClick={() => handleApprove(form.request_id)}
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    style={{ background: C.white, color: C.red, border: `1.5px solid rgba(192,57,43,.3)`, borderRadius: 8, padding: "9px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                                    onClick={() => { setRejectingId(form.request_id); setRejectComment(""); setRejectError(""); }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <div style={{ background: C.redSoft, border: `1.5px solid rgba(192,57,43,.2)`, borderRadius: 10, padding: "16px 18px" }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: C.red, marginBottom: 8 }}>
                                    Rejection Reason — this will be shown to the instructor
                                  </div>
                                  <textarea
                                    value={rejectComment}
                                    onChange={e => { setRejectComment(e.target.value); setRejectError(""); }}
                                    placeholder="Explain clearly why this form is being rejected..."
                                    style={{ width: "100%", height: 80, padding: "9px 12px", border: `1.5px solid rgba(192,57,43,.25)`, borderRadius: 8, fontSize: 13, color: C.text, background: C.white, fontFamily: "Inter,sans-serif", resize: "vertical", display: "block" }}
                                  />
                                  {rejectError && <p style={{ color: C.red, fontSize: 12, marginTop: 6, fontWeight: 600 }}>{rejectError}</p>}
                                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                                    <button
                                      style={{ background: C.red, color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                                      disabled={reviewingId !== null} onClick={() => handleReject(form.request_id)}
                                    >
                                      Confirm Rejection
                                    </button>
                                    <button
                                      style={{ background: C.white, color: C.text2, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                                      onClick={() => { setRejectingId(null); setRejectComment(""); }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Timeline ── */}
            <SL>All Submissions Timeline</SL>

            <div style={S.timeline}>
              <div style={{ padding: "14px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.text2 }}>All forms — sorted by date</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {/* Status filter */}
                  {["All", "Approved", "Pending", "Rejected"].map(f => (
                    <button key={f}
                      style={{ border: `1.5px solid ${timelineFilter === f ? C.orange : C.border2}`, borderRadius: 20, padding: "5px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", background: timelineFilter === f ? C.orange : C.white, color: timelineFilter === f ? "#fff" : C.text2, transition: "all .15s" }}
                      onClick={() => setTimelineFilter(f)}
                    >{f}</button>
                  ))}
                  {/* Term filter — only rendered when multiple terms exist */}
                  {uniqueTerms.length > 2 && (
                    <>
                      <div style={{ width: 1, background: C.border2, margin: "0 4px" }} />
                      {uniqueTerms.map(t => (
                        <button key={t}
                          style={{ border: `1.5px solid ${termFilter === t ? C.dark : C.border2}`, borderRadius: 20, padding: "5px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", background: termFilter === t ? C.dark : C.white, color: termFilter === t ? "#fff" : C.text2, transition: "all .15s" }}
                          onClick={() => setTermFilter(t)}
                        >{t}</button>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <div style={{ padding: "14px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredTimeline.length === 0 ? (
                  <p style={{ ...S.muted, padding: "10px 0" }}>
                    {allTimeline.length === 0
                      ? "No forms yet — submissions will appear here once instructors start submitting."
                      : "No forms match the selected filters."}
                  </p>
                ) : filteredTimeline.map(item => (
                  <div key={`tl-${item.request_id}`} className="htitem" style={S.titem}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: item.status === "Approved" ? "#16a34a" : item.status === "Rejected" ? C.red : C.orange }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.course_name}</div>
                      <div style={{ fontSize: 11, color: C.text2, marginTop: 1 }}>{item.title} — {item.author} — {item.publisher}</div>
                      <div style={{ fontSize: 10, color: C.grayMid, marginTop: 2 }}>
                        {item.instructor_name || "You (HoD)"}
                        {item.isbn ? ` · ISBN: ${item.isbn}` : ""}
                        {item.quantity ? ` · Qty: ${item.quantity}` : ""}
                      </div>
                      {item.status === "Rejected" && item.rejection_comments && (
                        <div style={{ fontSize: 11, color: C.red, marginTop: 3, fontStyle: "italic" }}>
                          Rejected: "{item.rejection_comments}"
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: C.text2, fontWeight: 500, marginBottom: 5 }}>{fmt(item.created_at)}</div>
                      <span style={bdg(item.status)}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

// ── Tiny sub-components ────────────────────────────────

// Section label
const SL = ({ children }) => (
  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700, color: "#1C1C1E", marginBottom: 14, marginTop: 28, display: "flex", alignItems: "center", gap: 12 }}>
    <span>{children}</span>
    <div style={{ flex: 1, height: 1.5, background: "#CDCDCB", borderRadius: 1 }} />
  </div>
);

// Nav sidebar item
const NavItem = ({ label, icon, active, onClick }) => {
  const icons = {
    grid:  <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>,
    file:  <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
    bell:  <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
  };
  return (
    <div className={active ? "" : "hnav"}
      style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, color: active ? "#fff" : "rgba(255,255,255,.4)", background: active ? "#E56515" : "transparent", transition: "all .15s" }}
      onClick={onClick}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>{icons[icon]}</svg>
      {label}
    </div>
  );
};

// Form field
const FF = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ fontSize: 10, fontWeight: 600, color: "#919599", display: "block", marginBottom: 3, letterSpacing: ".02em" }}>{label}</label>
    <input aria-label={label} className="hfi" type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={type === "number" ? "1" : undefined}
      style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #CDCDCB", background: "#F8F8F8", fontSize: 13, color: "#1C1C1E", fontFamily: "Inter,sans-serif", transition: "border-color .15s" }}
    />
  </div>
);

// ── Styles object ──────────────────────────────────────
const S = {
  shell:    { display: "flex", minHeight: "100vh", background: SITE_BG },
  sidebar:  { width: 236, flexShrink: 0, background: "#2a2a2a", display: "flex", flexDirection: "column" },
  sidelogo: { padding: "22px 18px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,.07)" },
  main:     { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  topbar:   { background: "#E56515", padding: "22px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  content:  { flex: 1, padding: "28px 28px 52px", background: SITE_BG },
  cardrow:  { display: "flex", gap: 10, marginBottom: 30, alignItems: "stretch" },
  card:     { borderRadius: 12, overflow: "hidden", transition: "all .3s cubic-bezier(.4,0,.2,1)", boxShadow: "0 1px 3px rgba(0,0,0,.07)" },
  cardbody: { padding: 16 },
  midrow:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 30 },
  panel:    { background: "#FFFFFF", borderRadius: 12, border: "1px solid #EBEBEB", boxShadow: "0 1px 3px rgba(0,0,0,.07)", overflow: "hidden" },
  pbody:    { padding: "18px 20px" },
  sep:      { height: 1, background: "#EBEBEB", margin: "12px 0" },
  muted:    { color: "#919599", fontSize: 13, fontWeight: 500 },
  courselist: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", marginBottom: 14 },
  crow:     { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, border: "1px solid #EBEBEB", background: "#FFFFFF" },
  sublist:  { display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" },
  sitem:    { padding: "10px 12px", borderRadius: 9, border: "1px solid #EBEBEB", background: "#FFFFFF" },
  plist:    { display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto", paddingRight: 2 },
  pitem:    { borderRadius: 10, border: "1px solid #EBEBEB", overflow: "hidden", transition: "border-color .15s" },
  btog:     { background: "#F8F8F8", color: "#919599", border: "1px solid #CDCDCB", borderRadius: 7, padding: "4px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer" },
  timeline: { background: "#FFFFFF", borderRadius: 12, border: "1px solid #EBEBEB", boxShadow: "0 1px 3px rgba(0,0,0,.07)", overflow: "hidden" },
  titem:    { display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 14px", border: "1px solid #EBEBEB", borderRadius: 10, background: "#F8F8F8", transition: "all .15s" },
  bdgP:     { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#FFF2E5", color: "#E56515" },
  bdgA:     { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#EBF7F1", color: "#1a7a4a" },
  bdgR:     { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#FEF0F0", color: "#c0392b" },
};

export default HoDPage;
