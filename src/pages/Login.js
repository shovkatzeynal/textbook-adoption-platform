import { apiUrl } from "../api";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (response.ok) {
        localStorage.setItem("token", result.token);
        localStorage.setItem("userId",   result.userId);
        localStorage.setItem("role",     result.role);
        localStorage.setItem("fullName", `${result.firstName} ${result.lastName}`);
        switch (result.role) {
          case "Instructor":         navigate("/instructor"); break;
          case "Head of Department": navigate("/hod");        break;
          case "Bookstore":          navigate("/bookstore");  break;
          default: alert("Unknown role. Please contact admin.");
        }
      } else {
        alert(result.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Unable to reach the sign-in service.");
      alert("Network error. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }
        .login-input:focus { outline: none; border-color: #E56515 !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(229,101,21,.1) !important; }
        .login-btn:hover { background: #CC5A12 !important; }
        .login-signup-btn:hover { color: #CC5A12 !important; }
      `}</style>

      <div style={S.page}>
        {/* Left panel */}
        <div style={S.left}>
          <div style={S.leftInner}>
            <div style={S.logoRow}>
              <div style={S.logobox}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                </svg>
              </div>
              <div>
                <div style={S.logoText}>MVSU</div>
                <div style={S.logoSub}>Textbook Adoption Portal</div>
              </div>
            </div>

            <div style={S.heroText}>
              <div style={S.eyebrow}>Academic Resource Management</div>
              <h1 style={S.hero}>Streamline your<br /><em style={S.heroEm}>textbook adoptions.</em></h1>
              <p style={S.heroSub}>One platform for instructors, department heads, and the bookstore to coordinate course materials efficiently.</p>
            </div>

            <div style={S.pillRow}>
              {["Instructors", "Heads of Department", "Bookstore"].map(r => (
                <span key={r} style={S.pill}>{r}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div style={S.right}>
          <div style={S.formCard}>
            <div style={S.formTop}>
              <h2 style={S.formTitle}>Welcome back</h2>
              <p style={S.formSub}>Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleLogin}>
              <div style={S.field}>
                <label style={S.label}>Email address</label>
                <input
                  className="login-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@mvsu.edu"
                  required
                  style={S.input}
                />
              </div>

              <div style={S.field}>
                <label style={S.label}>Password</label>
                <input
                  className="login-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={S.input}
                />
              </div>

              <button className="login-btn" type="submit" style={S.btn} disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div style={S.divider}><span style={S.dividerText}>New to the portal?</span></div>

            <button
              className="login-signup-btn"
              style={S.signupBtn}
              onClick={() => navigate("/signup")}
            >
              Create an account →
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const S = {
  page:      { display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" },
  left:      { flex: 1, background: "#E56515", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", position: "relative", overflow: "hidden" },
  leftInner: { maxWidth: 440, position: "relative", zIndex: 1 },

  logoRow:   { display: "flex", alignItems: "center", gap: 12, marginBottom: 56 },
  logobox:   { width: 38, height: 38, background: "rgba(255,255,255,.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(255,255,255,.25)" },
  logoText:  { fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#fff", fontWeight: 700 },
  logoSub:   { fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 1, letterSpacing: ".03em" },

  eyebrow:   { fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.65)", marginBottom: 14 },
  hero:      { fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 700, color: "#fff", lineHeight: 1.15, marginBottom: 18, letterSpacing: "-.02em" },
  heroEm:    { fontStyle: "italic", color: "rgba(255,255,255,.85)" },
  heroSub:   { fontSize: 15, color: "rgba(255,255,255,.65)", lineHeight: 1.65, marginBottom: 36 },
  heroText:  {},

  pillRow:   { display: "flex", gap: 8, flexWrap: "wrap" },
  pill:      { background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#fff" },

  right:     { width: 480, flexShrink: 0, background: "#F8F8F8", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" },
  formCard:  { width: "100%", maxWidth: 380, background: "#fff", borderRadius: 16, border: "1px solid #EBEBEB", boxShadow: "0 4px 24px rgba(0,0,0,.07)", padding: "36px 32px" },

  formTop:   { marginBottom: 28 },
  formTitle: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: "#1C1C1E", letterSpacing: "-.02em", marginBottom: 6 },
  formSub:   { fontSize: 13, color: "#919599", fontWeight: 400 },

  field:     { marginBottom: 18 },
  label:     { display: "block", fontSize: 12, fontWeight: 600, color: "#1C1C1E", marginBottom: 6, letterSpacing: ".01em" },
  input:     { width: "100%", padding: "11px 13px", borderRadius: 9, border: "1.5px solid #CDCDCB", background: "#F8F8F8", fontSize: 14, color: "#1C1C1E", fontFamily: "'Inter', sans-serif", transition: "all .15s" },

  btn:       { width: "100%", padding: "12px", background: "#E56515", color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 6, transition: "background .15s", letterSpacing: ".02em", fontFamily: "'Inter', sans-serif" },

  divider:   { margin: "24px 0", textAlign: "center", position: "relative" },
  dividerText: { fontSize: 12, color: "#CDCDCB", background: "#fff", padding: "0 12px", position: "relative", zIndex: 1 },

  signupBtn: { width: "100%", padding: "11px", background: "transparent", color: "#E56515", border: "1.5px solid rgba(229,101,21,.3)", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "color .15s", fontFamily: "'Inter', sans-serif", letterSpacing: ".01em" },
};

export default Login;
