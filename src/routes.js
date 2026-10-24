import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Instructor from "./pages/Instructor";
import HoD from "./pages/HoD";
import Bookstore from "./pages/Bookstore";

const rolePaths = { Instructor: "/instructor", "Head of Department": "/hod", Bookstore: "/bookstore" };
function ProtectedPage({ role, children }) {
  const token = localStorage.getItem("token");
  const storedRole = localStorage.getItem("role");
  let valid = false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    valid = Number.isFinite(payload.exp) && payload.exp * 1000 > Date.now();
  } catch { /* Invalid local session; backend independently verifies every request. */ }
  if (!valid || !rolePaths[storedRole]) return <Navigate to="/" replace />;
  if (storedRole !== role) return <Navigate to={rolePaths[storedRole]} replace />;
  return children;
}

const AppRoutes = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/instructor" element={<ProtectedPage role="Instructor"><Instructor /></ProtectedPage>} />
      <Route path="/hod" element={<ProtectedPage role="Head of Department"><HoD /></ProtectedPage>} />
      <Route path="/bookstore" element={<ProtectedPage role="Bookstore"><Bookstore /></ProtectedPage>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Router>
);

export default AppRoutes;
