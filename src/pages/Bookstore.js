import SubmissionDetails from "../components/SubmissionDetails";
import { apiUrl } from "../api";
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// ── Status pipeline ─────────────────────────────────────────────────────────
const STATUSES = ["Approved", "Ready to be ordered", "Ordered", "Arrived", "Ready to pick up", "Picked up"];

// Only show known public API messages, never arbitrary proxy/server diagnostics.
const SAFE_ORDER_ERRORS = new Set([
  "Please log in.", "Invalid or expired session. Please log in again.", "Account no longer exists.",
  "Forbidden.", "Invalid fulfillment status.", "Approved request not found.",
  "Only the next fulfillment stage is allowed.",
  "Only an unarchived Picked up request can be archived.",
  "Unable to complete the request. Please try again.",
]);
const orderErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  return typeof message === "string" && SAFE_ORDER_ERRORS.has(message) ? message : fallback;
};

const STATUS_META = {
  "Approved":            { color: "#1a7a4a", bg: "#EBF7F1", dot: "#1a7a4a" },
  "Ready to be ordered": { color: "#E56515", bg: "#FFF2E5", dot: "#E56515" },
  "Ordered":             { color: "#7c5cfc", bg: "#F3F0FF", dot: "#7c5cfc" },
  "Arrived":             { color: "#0369a1", bg: "#E0F2FE", dot: "#0369a1" },
  "Ready to pick up":    { color: "#b45309", bg: "#FEF3C7", dot: "#b45309" },
  "Picked up":           { color: "#919599", bg: "#F4F4F4", dot: "#CDCDCB" },
};

const Bookstore = () => {
  const [forms, setForms]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("All");
  const [search, setSearch]         = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const navigate = useNavigate();

  const fullName = localStorage.getItem("fullName") || "Bookstore";
  const token = localStorage.getItem("token");

  const [loadError, setLoadError] = useState("");

  const fetchForms = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const res = await axios.get(apiUrl("/api/bookstore/forms"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForms(res.data.forms || []);
    } catch (err) {
      setLoadError(orderErrorMessage(err, "Unable to load orders. Please try again."));
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const updateStatus = async (requestId, newStatus) => {
    setUpdatingId(requestId);
    try {
      await axios.patch(
        apiUrl(`/api/bookstore/forms/${requestId}/update-status`),
        { newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setForms(prev => prev.map(f => f.request_id === requestId ? { ...f, status: newStatus } : f));
    } catch (err) {
      console.error("Unable to update order status.");
      alert(orderErrorMessage(err, "Failed to update status."));
    } finally { setUpdatingId(null); }
  };

  const deleteForm = async (requestId) => {
    if (!window.confirm("Archive this completed order? Faculty submission history will be preserved.")) return;
    try {
      await axios.delete(apiUrl(`/api/bookstore/forms/${requestId}/delete`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForms(prev => prev.filter(f => f.request_id !== requestId));
      if (expandedId === requestId) setExpandedId(null);
    } catch (err) {
      console.error("Unable to archive order.");
      alert(orderErrorMessage(err, "Failed to archive order."));
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";

  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = forms.filter(f => f.status === s).length;
    return acc;
  }, { All: forms.length });

  const filtered = forms.filter(f => {
    const matchStatus = filter === "All" || f.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || [f.instructor_name, f.course_name, f.title, f.author, f.isbn].some(v => (v || "").toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  const advanceStatus = (form) => {
    const idx = STATUSES.indexOf(form.status);
    if (idx < STATUSES.length - 1) updateStatus(form.request_id, STATUSES[idx + 1]);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #F8F8F8; }
        .bs-row:hover { background: #FFF8F2 !important; border-color: #FBA45C !important; }
        .bs-search:focus { outline: none; border-color: #E56515 !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(229,101,21,.1) !important; }
        .bs-filter:hover { border-color: #FBA45C !important; color: #E56515 !important; }
        .bs-logout:hover { background: #FFF2E5 !important; }
        .bs-advance:hover { background: #CC5A12 !important; }
        .bs-select:focus { outline: none; }
      `}</style>

      <div style={S.shell}>

        {/* ── Sidebar ── */}
        <aside style={S.sidebar}>
          <div style={S.sidelogo}>
            <div style={S.logobox}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
              </svg>
            </div>
            <div>
              <div style={S.logotxt}>MVSU</div>
              <div style={S.logosubtxt}>Textbook Portal</div>
            </div>
          </div>

          <nav style={S.sidenav}>
            <div style={S.navActive}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              Orders
            </div>
            <div style={S.navsep}></div>
            {STATUSES.map(s => {
              const m = STATUS_META[s];
              return (
                <div
                  key={s}
                  style={{ ...S.navItem, ...(filter === s ? { background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.9)" } : {}) }}
                  onClick={() => setFilter(s)}
                >
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12 }}>{s}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontWeight: 700 }}>{statusCounts[s] || 0}</span>
                </div>
              );
            })}
          </nav>

          <div style={S.sidefoot}>
            <div style={S.avatar}>{(fullName || "B").charAt(0)}</div>
            <div>
              <div style={S.avn}>{fullName}</div>
              <div style={S.avr}>Bookstore</div>
            </div>
          </div>
        </aside>

        <div style={S.main}>

          {/* ── Top bar ── */}
          <div style={S.topbar}>
            <div>
              <div style={S.topeyebrow}>Bookstore Dashboard</div>
              <div style={S.topname}>Manage <em style={{ fontStyle: "italic", color: "rgba(255,255,255,.85)" }}>textbook orders.</em></div>
              <div style={S.topsub}>Track and update the status of all approved adoption requests</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, position: "relative", zIndex: 1 }}>
              <button className="bs-logout" style={S.logout} onClick={handleLogout}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Log out
              </button>
            </div>
          </div>

          <div style={S.content}>

            {/* ── Stat strip ── */}
            <div style={S.statstrip}>
              <div
                style={{ ...S.statcard, ...(filter === "All" ? S.statcardActive : {}) }}
                onClick={() => setFilter("All")}
              >
                <div style={S.statnum}>{forms.length}</div>
                <div style={S.statlabel}>Total Orders</div>
              </div>
              {STATUSES.map(s => {
                const m = STATUS_META[s];
                return (
                  <div
                    key={s}
                    style={{ ...S.statcard, ...(filter === s ? { borderColor: m.color, background: m.bg } : {}) }}
                    onClick={() => setFilter(s)}
                  >
                    <div style={{ ...S.statnum, color: m.color }}>{statusCounts[s] || 0}</div>
                    <div style={S.statlabel}>{s}</div>
                  </div>
                );
              })}
            </div>

            {/* ── Table section ── */}
            <div style={S.seclabel}>
              <span>Orders</span>
              <div style={S.seclabelLine} />
            </div>

            {/* Search + filter bar */}
            <div style={S.toolbar}>
              <div style={S.searchWrap}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#919599" strokeWidth="2" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="bs-search"
                  style={S.search}
                  placeholder="Search by instructor, course, title, ISBN..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["All", ...STATUSES].map(s => (
                  <button
                    key={s}
                    className={filter === s ? "" : "bs-filter"}
                    style={{ ...S.filterBtn, background: filter === s ? "#E56515" : "#fff", color: filter === s ? "#fff" : "#919599", borderColor: filter === s ? "#E56515" : "#CDCDCB" }}
                    onClick={() => setFilter(s)}
                  >{s}</button>
                ))}
              </div>
            </div>

            {loadError && <p role="alert">{loadError} <button onClick={fetchForms}>Retry</button></p>}
            {/* Table */}
            <div style={S.tableWrap}>
              {loading ? (
                <div style={S.empty}>Loading orders...</div>
              ) : filtered.length === 0 ? (
                <div style={S.empty}>No orders found{filter !== "All" ? ` with status "${filter}"` : ""}.</div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr style={S.thead}>
                      <Th>Instructor</Th>
                      <Th>Course</Th>
                      <Th>Term</Th>
                      <Th>Textbook</Th>
                      <Th>ISBN</Th>
                      <Th>Qty</Th>
                      <Th>Date</Th>
                      <Th>Status</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(form => {
                      const meta    = STATUS_META[form.status] || STATUS_META["Approved"];
                      const isExp   = expandedId === form.request_id;
                      const isLast  = STATUSES.indexOf(form.status) === STATUSES.length - 1;

                      return (
                        <React.Fragment key={form.request_id}>
                          <tr
                            data-testid={`request-${form.request_id}`}
                            className="bs-row"
                            style={{ ...S.trow, background: isExp ? "#FFF8F2" : "#fff", borderBottom: isExp ? "none" : `1px solid #F0EDE8` }}
                            onClick={() => setExpandedId(isExp ? null : form.request_id)}
                          >
                            <Td>{form.instructor_name}</Td>
                            <Td><span style={{ fontWeight: 600 }}>{form.course_name}</span></Td>
                            <Td><span style={{ fontSize: 11, color: "#919599" }}>{form.term}</span></Td>
                            <Td>
                              <div style={{ fontWeight: 600, fontSize: 13, color: "#1C1C1E" }}>{form.title}</div>
                              <div style={{ fontSize: 11, color: "#919599" }}>{form.author} · {form.publisher}</div>
                            </Td>
                            <Td><span style={{ fontSize: 11, fontFamily: "monospace", color: "#919599" }}>{form.isbn || "—"}</span></Td>
                            <Td><span style={{ fontWeight: 700 }}>{form.quantity}</span></Td>
                            <Td><span style={{ fontSize: 11, color: "#919599" }}>{formatDate(form.created_at)}</span></Td>
                            <Td>
                              <span style={{ ...S.statusBadge, background: meta.bg, color: meta.color }}>
                                <span style={{ ...S.statusDot, background: meta.dot }} />
                                {form.status}
                              </span>
                            </Td>
                            <Td onClick={e => e.stopPropagation()}>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                {!isLast && (
                                  <button
                                    className="bs-advance"
                                    style={S.advanceBtn}
                                    onClick={() => advanceStatus(form)}
                                    disabled={updatingId !== null}
                                    title={`Advance to: ${STATUSES[STATUSES.indexOf(form.status) + 1]}`}
                                  >
                                    {updatingId === form.request_id ? "..." : "Advance →"}
                                  </button>
                                )}
                                <select
                                  className="bs-select"
                                  style={S.statusSelect}
                                  disabled={updatingId !== null || isLast}
                                  value={form.status}
                                  onChange={e => updateStatus(form.request_id, e.target.value)}
                                >
                                  {STATUSES.filter((s, i) => s === form.status || i === STATUSES.indexOf(form.status) + 1).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button
                                  style={S.deleteBtn}
                                  onClick={() => deleteForm(form.request_id)}
                                  title="Archive completed order" disabled={!isLast || updatingId !== null}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                                  </svg>
                                </button>
                              </div>
                            </Td>
                          </tr>

                          {/* Expanded row */}
                          {isExp && (
                            <tr style={{ background: "#FFF8F2", borderBottom: "1px solid #F0EDE8" }}>
                              <td colSpan={9} style={{ padding: "0 16px 16px" }}>
                                <SubmissionDetails submission={form} />
                                <div style={S.expandRow}>
                                  <DetailItem label="Edition"         value={form.edition || "—"} />
                                  <DetailItem label="Other Materials" value={form.otherMaterials || "None"} />
                                  <DetailItem label="Submitted"       value={formatDate(form.created_at)} />
                                  <DetailItem label="Full ISBN"       value={form.isbn || "—"} />
                                </div>

                                {/* Progress bar */}
                                <div style={S.progressWrap}>
                                  {STATUSES.map((s, i) => {
                                    const idx     = STATUSES.indexOf(form.status);
                                    const done    = i <= idx;
                                    const current = i === idx;
                                    const m       = STATUS_META[s];
                                    return (
                                      <React.Fragment key={s}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
                                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: done ? m.dot : "#EBEBEB", border: current ? `3px solid ${m.dot}` : "none", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>
                                            {done && !current && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                          </div>
                                          <span style={{ fontSize: 9, color: done ? m.color : "#CDCDCB", fontWeight: 600, textAlign: "center", maxWidth: 70, lineHeight: 1.3 }}>{s}</span>
                                        </div>
                                        {i < STATUSES.length - 1 && (
                                          <div style={{ flex: "0 0 20px", height: 2, background: i < idx ? "#CDCDCB" : "#EBEBEB", alignSelf: "flex-start", marginTop: 11 }} />
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

// ── Small helpers ────────────────────────────────────────────────────────────
const Th = ({ children }) => (
  <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#919599", whiteSpace: "nowrap", borderBottom: "1.5px solid #EBEBEB" }}>{children}</th>
);
const Td = ({ children, onClick }) => (
  <td onClick={onClick} style={{ padding: "12px 14px", verticalAlign: "middle", fontSize: 13 }}>{children}</td>
);
const DetailItem = ({ label, value }) => (
  <div style={{ minWidth: 140 }}>
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#919599", marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1C1E" }}>{value}</div>
  </div>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  shell:        { display: "flex", minHeight: "100vh", background: "#F8F8F8", fontFamily: "'Inter', sans-serif" },
  sidebar:      { width: 220, flexShrink: 0, background: "#2a2a2a", display: "flex", flexDirection: "column" },
  sidelogo:     { padding: "20px 16px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,.07)" },
  logobox:      { width: 28, height: 28, background: "#E56515", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  logotxt:      { fontSize: 13, fontWeight: 700, color: "#fff" },
  logosubtxt:   { fontSize: 9, color: "rgba(255,255,255,.3)", marginTop: 1, letterSpacing: ".04em" },
  sidenav:      { padding: "12px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 1 },
  navActive:    { display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 8, background: "#E56515", color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 4 },
  navsep:       { height: 1, background: "rgba(255,255,255,.06)", margin: "6px 0" },
  navItem:      { display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", borderRadius: 7, cursor: "pointer", color: "rgba(255,255,255,.4)", transition: "all .15s" },
  sidefoot:     { padding: "12px", borderTop: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 9 },
  avatar:       { width: 32, height: 32, borderRadius: 8, background: "#E56515", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 },
  avn:          { fontSize: 12, color: "#fff", fontWeight: 600 },
  avr:          { fontSize: 10, color: "rgba(255,255,255,.3)" },

  main:         { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" },
  topbar:       { background: "#E56515", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", overflow: "hidden" },
  topeyebrow:   { fontSize: 10, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.6)", marginBottom: 5 },
  topname:      { fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: "#fff", lineHeight: 1.2, letterSpacing: "-.01em" },
  topsub:       { fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 4 },
  logout:       { background: "#fff", color: "#E56515", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all .15s" },

  content:      { flex: 1, padding: "24px 28px 48px", overflowY: "auto" },

  statstrip:    { display: "flex", gap: 10, marginBottom: 26, overflowX: "auto", paddingBottom: 4 },
  statcard:     { flex: "0 0 auto", background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 10, padding: "12px 16px", cursor: "pointer", transition: "all .15s", minWidth: 110 },
  statcardActive:{ borderColor: "#E56515", background: "#FFF2E5" },
  statnum:      { fontSize: 22, fontWeight: 700, color: "#1C1C1E", lineHeight: 1 },
  statlabel:    { fontSize: 10, color: "#919599", fontWeight: 600, marginTop: 3, lineHeight: 1.3 },

  seclabel:     { fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: "#1C1C1E", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 },
  seclabelLine: { flex: 1, height: 1.5, background: "#CDCDCB", borderRadius: 1 },

  toolbar:      { display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap", alignItems: "center" },
  searchWrap:   { position: "relative", flex: 1, minWidth: 220 },
  search:       { width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8, border: "1.5px solid #CDCDCB", background: "#fff", fontSize: 13, color: "#1C1C1E", fontFamily: "'Inter', sans-serif", transition: "all .15s" },
  filterBtn:    { border: "1.5px solid #CDCDCB", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif" },

  tableWrap:    { background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", boxShadow: "0 1px 3px rgba(0,0,0,.07)", overflow: "auto" },
  table:        { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  thead:        { background: "#FAFAFA" },
  trow:         { cursor: "pointer", transition: "all .15s", borderBottom: "1px solid #F0EDE8" },

  statusBadge:  { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" },
  statusDot:    { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },

  advanceBtn:   { background: "#E56515", color: "#fff", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "background .15s" },
  statusSelect: { padding: "5px 8px", borderRadius: 7, border: "1.5px solid #CDCDCB", fontSize: 11, color: "#1C1C1E", background: "#F8F8F8", fontFamily: "'Inter', sans-serif", cursor: "pointer" },
  deleteBtn:    { background: "transparent", color: "#c0392b", border: "1px solid rgba(192,57,43,.2)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" },

  expandRow:    { display: "flex", gap: 28, flexWrap: "wrap", padding: "12px 0 14px", borderBottom: "1px solid #F0EDE8", marginBottom: 14 },
  progressWrap: { display: "flex", alignItems: "flex-start", gap: 0 },
  empty:        { padding: "48px 24px", textAlign: "center", color: "#919599", fontSize: 14, fontWeight: 500 },
};

export default Bookstore;
