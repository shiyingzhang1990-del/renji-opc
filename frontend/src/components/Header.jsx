import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function Header() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setUser(data);
          else { setToken(""); localStorage.removeItem("token"); setUser(null); }
        })
        .catch(() => {});
    }
  }, [token]);

  const handleLogout = () => {
    setToken(""); localStorage.removeItem("token"); setUser(null);
    navigate("/");
  };

  return (
    <header className="topbar">
      <div className="brand">
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="brand-mark">R</span>
          <div>
            <strong>壬集 RENJI</strong>
            <small>壬镜科技 OPC 生态平台</small>
          </div>
        </Link>
      </div>
      <nav>
        <Link to="/market">OPC 市场</Link>
        {user?.role === "merchant_owner" || user?.role === "super_admin" ? (
          <Link to="/merchant">商家中心</Link>
        ) : (
          <Link to="/merchant">商家入驻</Link>
        )}
        {user ? (
          <>
            <span className="nav-user" onClick={() => navigate("/dashboard")}>
              {user.display_name}
            </span>
            <button className="nav-link-btn" onClick={handleLogout}>退出</button>
          </>
        ) : (
          <>
            <Link to="/login">登录</Link>
            <Link to="/register" className="nav-register">注册</Link>
          </>
        )}
      </nav>
    </header>
  );
}
