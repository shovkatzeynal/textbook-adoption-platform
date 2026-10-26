import useCoursePrefill from "../hooks/useCoursePrefill";
import SubmissionDetails from "../components/SubmissionDetails";
import { apiUrl } from "../api";
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AddCourseForm from "../components/AddCourseForm";

// ── Bookstore-pipeline statuses (instructor can now see these too) ────────────
const BOOKSTORE_STATUSES = new Set([
  "Ready to be ordered", "Ordered", "Arrived", "Ready to pick up", "Picked up",
]);

const InstructorPage = () => {
  const [courses,           setCourses]           = useState([]);
  const [submissions,      setSubmissions]        = useState([]);
  const [error,            setError]              = useState("");
  const [loading,          setLoading]            = useState(true);
  const [submitSuccess,    setSubmitSuccess]      = useState(false);
  const [isSubmitting,     setIsSubmitting]       = useState(false);
  const [toasts,           setToasts]             = useState([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navigate        = useNavigate();
  const instructorName  = localStorage.getItem("fullName") || "Instructor";
  const firstName       = instructorName.split(" ")[0];
  const hour            = new Date().getHours();
  const greeting        = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const token           = localStorage.getItem("token");
  const { selectedCourse, setSelectedCourse, formData, setFormData, preFilled, setPreFilled, prefillLoading, prefillError } = useCoursePrefill(token);
  const [historyError, setHistoryError] = useState("");

  // ── Toast helper ───────────────────────────────────────────────────────────
  const toast = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);

  // ── Fetch courses ──────────────────────────────────────────────────────────
  const fetchCourses = useCallback(async () => {
    if (!token) { setError("No session token found. Please log in again."); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(apiUrl("/api/courses"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setCourses(data.courses || []);
      else        setError(data.message || "Failed to fetch courses.");
    } catch (err) {
      setError(err.message || "Network error.");
    } finally { setLoading(false); }
  }, [token]);

  // ── Fetch submissions ──────────────────────────────────────────────────────
  const fetchSubmissions = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(apiUrl("/api/instructor-submissions"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to load submissions.");
      setHistoryError(""); setSubmissions(data.submissions || []);
    } catch (err) {
      setHistoryError(err.message || "Unable to load submissions.");
    }
  }, [token]);

  useEffect(() => {
    fetchCourses();
    fetchSubmissions();
  }, [fetchCourses, fetchSubmissions]);

  // ── Select course → load textbook + track pre-filled fields ───────────────
  const handleSelectCourse = (course) => {
    if (isSubmitting) return;
    setSelectedCourse(selectedCourse?.course_id === course.course_id ? null : course);
    setSubmitSuccess(false);
  };

  // ── Submit form ────────────────────────────────────────────────────────────
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (prefillLoading || prefillError || isSubmitting || !selectedCourse) return;
    if (!formData.title.trim() || !formData.author.trim() || !formData.publisher.trim()) {
      toast("Please fill in Title, Author, and Publisher.", "error"); return;
    }
    if (!Number.isInteger(Number(formData.quantity)) || Number(formData.quantity) < 1) {
      toast("Quantity must be at least 1.", "error"); return;
    }
    setIsSubmitting(true); setSubmitSuccess(false);
    try {
      const res = await fetch(apiUrl("/api/submit-form"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          courseId:       selectedCourse.course_id,
          publisher:      formData.publisher,
          title:          formData.title,
          author:         formData.author,
          isbn:           formData.isbn,
          edition:        formData.edition,
          quantity:       formData.quantity,
          otherMaterials: formData.otherMaterials,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setSubmitSuccess(true);
        setSelectedCourse(null);
        setPreFilled(new Set());
        setFormData({ publisher: "", title: "", author: "", isbn: "", edition: "", quantity: "", otherMaterials: "" });
        fetchSubmissions();
      } else {
        toast(result.message || "Failed to submit the form.", "error");
      }
    } catch {
      toast("Network error — please try again.", "error");
    } finally { setIsSubmitting(false); }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const doLogout = () => { localStorage.clear(); navigate("/"); };

  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";

  const getInitial = (name) => (name || "?").charAt(0).toUpperCase();

  const badgeStyle = (status) => {
    if (status === "Approved")          return styles.badgeApproved;
    if (status === "Rejected")          return styles.badgeRejected;
    if (BOOKSTORE_STATUSES.has(status)) return styles.badgeBookstore;
    return styles.badgePending;
  };

  const lastSub = selectedCourse
    ? submissions
        .filter(s => String(s.course_id) === String(selectedCourse.course_id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&family=Merriweather:ital,wght@0,700;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F4F3F1; }
        .course-scroll::-webkit-scrollbar { height: 4px; }
        .course-scroll::-webkit-scrollbar-thumb { background: #FBA45C; border-radius: 2px; }
        .sub-scroll::-webkit-scrollbar { width: 4px; }
        .sub-scroll::-webkit-scrollbar-thumb { background: #FBA45C; border-radius: 2px; }
        .tile-btn { background: none; border: none; padding: 0; cursor: pointer; text-align: left; }
        .inp-field:focus { outline: none; border-color: #E56515; background: #fff; box-shadow: 0 0 0 3px rgba(229,101,21,.1); }
        @keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .toast-slide { animation: toastIn .22s ease; }
      `}</style>

      {/* ── Toast stack ── */}
      <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} className="toast-slide" style={{
            background: t.type === "error" ? "#c0392b" : "#1a7a4a",
            color: "#fff", padding: "11px 18px", borderRadius: 9,
            fontSize: 13, fontWeight: 700, fontFamily: "'Lato',sans-serif",
            boxShadow: "0 4px 16px rgba(0,0,0,.18)", maxWidth: 340,
          }}>
            {t.msg}
          </div>
        ))}
      </div>

      <div style={styles.root}>

        {/* ── Top bar ── */}
        <nav style={styles.topbar}>
          <div style={styles.brandWrap}>
            <span style={styles.brand}>MVSU</span>
            <span style={styles.brandSub}>Textbook Adoption Portal</span>
          </div>
          {!showLogoutConfirm ? (
            <button
              style={styles.logoutBtn}
              onClick={() => setShowLogoutConfirm(true)}
              onMouseEnter={e => e.currentTarget.style.background = "#FFF2E5"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >
              Log out
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.12)", borderRadius: 8, padding: "6px 12px" }}>
              <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>Log out?</span>
              <button onClick={doLogout} style={{ background: "#fff", color: "#c0392b", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}>Yes</button>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ background: "transparent", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.3)", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            </div>
          )}
        </nav>

        <div style={styles.page}>

          <div style={styles.greeting}>
            <p style={styles.eyebrow}>Instructor Portal</p>
            <h1 style={styles.greetingName}>
              {greeting}, <em style={{ fontStyle: "italic", color: "#E56515" }}>{firstName}.</em>
            </h1>
          </div>

          {submitSuccess && (
            <div style={styles.successBanner}>
              Textbook adoption form submitted successfully. Your Head of Department will review it shortly.
            </div>
          )}

          {/* ── Add Course ── */}
          <SectionHeader title="Add a Course" />
          <div style={styles.addCard}>
            <AddCourseForm
              colors={{ steelBlue: "#E56515", lightBlue: "#FFF6EE", paleBlue: "#F8F8F8", white: "#fff", darkText: "#2a2a2a" }}
              onCourseAdded={() => { fetchCourses(); toast("Course added successfully!"); }}
            />
          </div>

          {/* ── Your Courses ── */}
          <SectionHeader title="Your Courses" />
          {loading ? (
            <p style={styles.muted}>Loading courses...</p>
          ) : error ? (
            <p style={{ color: "#c0392b", fontSize: "14px" }}>{error}</p>
          ) : courses.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyTitle}>No courses yet</p>
              <p style={styles.emptySub}>Use the "Add a Course" form above to add your first course, then fill in the textbook adoption form for each one.</p>
            </div>
          ) : (
            <div className="course-scroll" style={styles.courseScrollWrap}>
              <div style={styles.courseRow}>
                {courses.map((course) => (
                  <button
                    key={course.course_id}
                    className="tile-btn"
                    style={{
                      ...styles.tile,
                      borderColor: selectedCourse?.course_id === course.course_id ? "#E56515" : "#CDCDCB",
                      background:  selectedCourse?.course_id === course.course_id ? "#FFF2E5" : "#fff",
                    }}
                    onClick={() => handleSelectCourse(course)}
                  >
                    <div style={{ ...styles.tileTopBar, background: selectedCourse?.course_id === course.course_id ? "#E56515" : "#CDCDCB" }} />
                    <div style={styles.tileInitial}>{getInitial(course.course_name)}</div>
                    <div style={styles.tileNum}>{course.course_number}</div>
                    <div style={styles.tileName}>{course.course_name}</div>
                    <div style={styles.tileTerm}>{course.term}</div>
                    <div style={styles.tileCta}>
                      {selectedCourse?.course_id === course.course_id ? "Close form" : "Fill textbook form"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Textbook Adoption Form ── */}
          {selectedCourse && (
            <>
              <SectionHeader title="Textbook Adoption Form" />
              <div style={styles.formCard}>
                <div style={styles.formCardHead}>
                  <p style={styles.formCardCourse}>{selectedCourse.course_name}</p>
                  <div style={styles.formCardMeta}>
                    <span style={styles.metaAccent}>{selectedCourse.course_number}</span>
                    <span style={styles.metaMuted}>{selectedCourse.term}</span>
                    <span style={styles.metaMuted}>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                  </div>
                  {lastSub && (
                    <div style={styles.lastSubNote}>
                      Last submitted: {formatDate(lastSub.created_at)}
                      {" — "}
                      <span style={{ color: lastSub.status === "Approved" ? "#1a7a4a" : lastSub.status === "Rejected" ? "#c0392b" : "#E56515", fontWeight: 900 }}>
                        {lastSub.status}
                      </span>
                      {lastSub.status === "Rejected" && lastSub.rejection_comments && (
                        <span style={{ color: "#c0392b", fontStyle: "italic" }}> — "{lastSub.rejection_comments}"</span>
                      )}
                    </div>
                  )}
                  {preFilled.size > 0 && (
                    <div style={styles.preFillBanner}>
                      Fields marked <span style={styles.preFillTag}>pre-filled</span> were auto-loaded from the last submission. Update anything that has changed before submitting.
                    </div>
                  )}
                </div>

                {prefillLoading && <p role="status">Loading textbook details...</p>}
                {prefillError && <p role="alert">{prefillError} <button onClick={() => setSelectedCourse(selectedCourse)}>Retry</button></p>}
                <form onSubmit={handleSubmitForm}>
                  <fieldset disabled={prefillLoading || Boolean(prefillError) || isSubmitting} style={{ border: 0, padding: 0, margin: 0 }}>
                  <div style={styles.formGrid}>
                    <div>
                      <Field label="Title *"     value={formData.title}     onChange={v => setFormData({ ...formData, title: v })}     placeholder="e.g. Algebra Basics"   preFilled={preFilled.has("title")} />
                      <Field label="Author *"    value={formData.author}    onChange={v => setFormData({ ...formData, author: v })}    placeholder="e.g. John Algebra"      preFilled={preFilled.has("author")} />
                      <Field label="Publisher *" value={formData.publisher} onChange={v => setFormData({ ...formData, publisher: v })} placeholder="e.g. Pearson"           preFilled={preFilled.has("publisher")} />
                    </div>
                    <div>
                      <Field label="ISBN"       value={formData.isbn}     onChange={v => setFormData({ ...formData, isbn: v })}     placeholder="e.g. 978-0-13-468599-1" preFilled={preFilled.has("isbn")} />
                      <Field label="Edition"    value={formData.edition}  onChange={v => setFormData({ ...formData, edition: v })}  placeholder="e.g. 1st"               preFilled={preFilled.has("edition")} />
                      <Field label="Quantity *" type="number" value={formData.quantity} onChange={v => setFormData({ ...formData, quantity: v })} placeholder="e.g. 30" preFilled={preFilled.has("quantity")} />
                    </div>
                  </div>

                  <div style={{ marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <label style={styles.fieldLabel}>Other Materials / Notes</label>
                      {preFilled.has("otherMaterials") && <span style={styles.preFillTag}>pre-filled</span>}
                    </div>
                    <textarea
                      aria-label="Other Materials / Notes"
                      className="inp-field"
                      value={formData.otherMaterials}
                      onChange={e => setFormData({ ...formData, otherMaterials: e.target.value })}
                      placeholder="e.g. Lab manual, access code, etc."
                      style={{ ...styles.inp, height: "80px", resize: "vertical" }}
                    />
                  </div>

                  <hr style={styles.divider} />

                  <button type="submit" style={styles.btnOrange} disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit for Approval"}
                  </button>
                  <button type="button" style={styles.btnOutline} onClick={() => { setSelectedCourse(null); setPreFilled(new Set()); }}>
                    Cancel
                  </button>
                  </fieldset>
                </form>
              </div>
            </>
          )}

          {/* ── Previously Submitted Forms ── */}
          <SectionHeader title="Previously Submitted Forms" />
          {historyError && <p role="alert">{historyError} <button onClick={fetchSubmissions}>Retry</button></p>}
          {submissions.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyTitle}>No submissions yet</p>
              <p style={styles.emptySub}>Select a course above and fill in the textbook adoption form. Once submitted, your Head of Department will review it and you'll see the status here.</p>
            </div>
          ) : (
            <div className="sub-scroll" style={styles.subScroll}>
              {submissions.map((s) => (
                <div key={s.request_id} data-testid={`request-${s.request_id}`} style={styles.subItem}>
                  <div style={styles.subLeft}>
                    <span style={styles.subCourse}>{s.course_name}</span>
                    <span style={styles.subBook}>{s.title} &mdash; {s.author} &mdash; {s.publisher}</span>
                    <SubmissionDetails submission={s} />
                    {BOOKSTORE_STATUSES.has(s.status) && (
                      <div style={{ marginTop: 5, fontSize: 12, color: "#1a5276", fontWeight: 700 }}>
                        {{
                          "Ready to be ordered": "Your textbook is queued — the bookstore will place the order soon.",
                          "Ordered":             "Order placed — awaiting delivery.",
                          "Arrived":             "Textbooks have arrived at the bookstore.",
                          "Ready to pick up":    "Textbooks are ready for student pickup.",
                          "Picked up":           "All copies picked up.",
                        }[s.status]}
                      </div>
                    )}
                    {s.status === "Rejected" && s.rejection_comments && (
                      <div style={{ marginTop: 6, background: "#FEF0F0", border: "1px solid rgba(192,57,43,.15)", borderRadius: 5, padding: "6px 10px" }}>
                        <span style={{ fontSize: "9px", fontWeight: 900, letterSpacing: ".07em", textTransform: "uppercase", color: "#c0392b", display: "block", marginBottom: 2 }}>Rejection Reason</span>
                        <span style={{ fontSize: "12px", color: "#1C1C1E" }}>{s.rejection_comments}</span>
                      </div>
                    )}
                  </div>
                  <div style={styles.subRight}>
                    <span style={styles.subDate}>{formatDate(s.created_at)}</span>
                    <span style={styles.subTerm}>{s.term}</span>
                    <span style={badgeStyle(s.status)}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const SectionHeader = ({ title }) => (
  <div style={{ marginTop: "36px", marginBottom: "16px" }}>
    <p style={{ fontSize: "11px", fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase", color: "#919599" }}>{title}</p>
    <hr style={{ border: "none", borderTop: "2px solid #2a2a2a", marginTop: "6px" }} />
  </div>
);

const Field = ({ label, value, onChange, placeholder, type = "text", preFilled = false }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <label style={styles.fieldLabel}>{label}</label>
      {preFilled && <span style={styles.preFillTag}>pre-filled</span>}
    </div>
    <input
      aria-label={label}
      className="inp-field"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={styles.inp}
      min={type === "number" ? "1" : undefined}
    />
  </div>
);

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = {
  root:          { fontFamily: "'Lato', sans-serif", background: "#F4F3F1", minHeight: "100vh", color: "#2a2a2a" },
  topbar:        { background: "#E56515", padding: "0 36px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  brandWrap:     { display: "flex", alignItems: "baseline", gap: "10px" },
  brand:         { fontFamily: "'Merriweather', serif", fontSize: "18px", color: "#fff" },
  brandSub:      { fontSize: "12px", color: "#FDDCBC", fontWeight: 400, letterSpacing: ".04em" },
  logoutBtn:     { background: "#fff", color: "#E56515", border: "none", borderRadius: "30px", padding: "8px 22px", fontSize: "12px", fontWeight: 900, letterSpacing: ".07em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", transition: "background .15s" },
  page:          { maxWidth: "940px", margin: "0 auto", padding: "44px 28px 80px" },
  greeting:      { marginBottom: "40px", paddingBottom: "28px", borderBottom: "1px solid #CDCDCB" },
  eyebrow:       { fontSize: "11px", fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase", color: "#919599", marginBottom: "8px" },
  greetingName:  { fontFamily: "'Merriweather', serif", fontSize: "32px", color: "#2a2a2a", lineHeight: 1.15 },
  successBanner: { background: "#FFF2E5", border: "1.5px solid #FBA45C", borderRadius: "4px", padding: "12px 18px", color: "#E56515", fontWeight: 700, fontSize: "14px", marginBottom: "20px" },
  addCard:       { background: "#fff", borderRadius: "4px", borderLeft: "5px solid #E56515", padding: "4px 0 4px 0", overflow: "hidden" },
  emptyState:    { background: "#fff", borderRadius: 8, border: "1.5px dashed #CDCDCB", padding: "28px 24px", textAlign: "center" },
  emptyTitle:    { fontSize: "15px", fontWeight: 700, color: "#2a2a2a", marginBottom: 6 },
  emptySub:      { fontSize: "13px", color: "#919599", lineHeight: 1.6 },
  courseScrollWrap: { overflowX: "auto", paddingBottom: "8px" },
  courseRow:     { display: "flex", gap: "14px", width: "max-content" },
  tile:          { position: "relative", borderRadius: "4px", border: "1.5px solid #CDCDCB", padding: "20px 18px 16px", overflow: "hidden", width: "220px", flexShrink: 0, transition: "border-color .18s" },
  tileTopBar:    { position: "absolute", top: 0, left: 0, right: 0, height: "3px", transition: "background .18s" },
  tileInitial:   { position: "absolute", bottom: "-8px", right: "10px", fontFamily: "'Merriweather', serif", fontSize: "64px", fontWeight: 700, color: "#F4F3F1", lineHeight: 1, pointerEvents: "none" },
  tileNum:       { fontSize: "11px", fontWeight: 900, letterSpacing: ".08em", color: "#E56515", textTransform: "uppercase", marginBottom: "2px", position: "relative" },
  tileName:      { fontSize: "14px", fontWeight: 700, color: "#2a2a2a", marginBottom: "4px", position: "relative" },
  tileTerm:      { fontSize: "12px", color: "#919599", fontWeight: 700, position: "relative" },
  tileCta:       { marginTop: "14px", fontSize: "11px", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", color: "#E56515", position: "relative" },
  formCard:      { background: "#fff", borderRadius: "4px", padding: "28px 32px" },
  formCardHead:  { marginBottom: "22px", paddingBottom: "18px", borderBottom: "1px solid #F0EDE8" },
  formCardCourse:{ fontFamily: "'Merriweather', serif", fontSize: "19px", color: "#2a2a2a" },
  formCardMeta:  { display: "flex", gap: "20px", marginTop: "6px" },
  metaAccent:    { fontSize: "11px", color: "#E56515", fontWeight: 700 },
  metaMuted:     { fontSize: "11px", color: "#919599", fontWeight: 700 },
  lastSubNote:   { marginTop: 10, fontSize: 12, color: "#919599", background: "#F8F8F8", borderRadius: 5, padding: "6px 10px", borderLeft: "3px solid #CDCDCB" },
  preFillBanner: { marginTop: 10, fontSize: 12, color: "#5a4a00", background: "#FFFBE6", border: "1px solid #F0D060", borderRadius: 6, padding: "7px 12px", lineHeight: 1.5 },
  preFillTag:    { display: "inline-block", fontSize: 9, fontWeight: 900, letterSpacing: ".07em", textTransform: "uppercase", color: "#8a6a00", background: "#FFF3CD", border: "1px solid #F0D060", borderRadius: 3, padding: "1px 5px" },
  formGrid:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" },
  fieldLabel:    { fontSize: "10px", fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase", color: "#919599" },
  inp:           { padding: "10px 13px", borderRadius: "4px", border: "1.5px solid #CDCDCB", background: "#F8F8F8", color: "#2a2a2a", fontSize: "14px", fontFamily: "'Lato', sans-serif", width: "100%", transition: "border-color .15s, background .15s" },
  divider:       { border: "none", borderTop: "1px solid #F0EDE8", margin: "22px 0" },
  btnOrange:     { background: "#E56515", color: "#fff", border: "none", borderRadius: "4px", padding: "11px 24px", fontSize: "13px", fontWeight: 900, cursor: "pointer", fontFamily: "'Lato', sans-serif", letterSpacing: ".05em", textTransform: "uppercase" },
  btnOutline:    { background: "transparent", color: "#E56515", border: "2px solid #E56515", borderRadius: "4px", padding: "9px 20px", fontSize: "13px", fontWeight: 900, cursor: "pointer", fontFamily: "'Lato', sans-serif", letterSpacing: ".05em", textTransform: "uppercase", marginLeft: "10px" },
  muted:         { color: "#919599", fontSize: "14px", fontWeight: 700 },
  subScroll:     { maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "6px" },
  subItem:       { background: "#fff", borderRadius: "4px", border: "1.5px solid #CDCDCB", padding: "14px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexShrink: 0 },
  subLeft:       { display: "flex", flexDirection: "column", gap: "3px", flex: 1 },
  subCourse:     { fontSize: "14px", fontWeight: 700, color: "#2a2a2a" },
  subBook:       { fontSize: "12px", color: "#919599" },
  subRight:      { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 },
  subDate:       { fontSize: "11px", color: "#919599", fontWeight: 700 },
  subTerm:       { fontSize: "11px", color: "#CDCDCB", fontWeight: 700 },
  badgePending:  { display: "inline-block", padding: "4px 12px", borderRadius: "2px", fontSize: "10px", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", background: "#FFF2E5", color: "#E56515" },
  badgeApproved: { display: "inline-block", padding: "4px 12px", borderRadius: "2px", fontSize: "10px", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", background: "#E8F6EE", color: "#1a7a4a" },
  badgeRejected: { display: "inline-block", padding: "4px 12px", borderRadius: "2px", fontSize: "10px", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", background: "#FEF0F0", color: "#c0392b" },
  badgeBookstore:{ display: "inline-block", padding: "4px 12px", borderRadius: "2px", fontSize: "10px", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", background: "#EAF4FB", color: "#1a5276" },
};

export default InstructorPage;
