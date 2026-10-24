import React from "react";
import { useNavigate } from "react-router-dom";

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        background: "#fff",
        color: "#E56515",
        border: "none",
        borderRadius: "30px",
        padding: "8px 22px",
        fontSize: "12px",
        fontWeight: 900,
        letterSpacing: ".07em",
        textTransform: "uppercase",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background .15s",
      }}
      onMouseEnter={(e) => e.target.style.background = "#FFF2E5"}
      onMouseLeave={(e) => e.target.style.background = "#fff"}
    >
      Log out
    </button>
  );
};

export default LogoutButton;