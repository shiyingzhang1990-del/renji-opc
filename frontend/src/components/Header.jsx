import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, clearTokens } from "../api";

export default function Header() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      apiFetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setUser(data);
          else { setToken(""); clearTokens(); setUser(null); }
        })
        .catch(() => {});
    }
  }, [token]);

  const handleLogout = () => {
    setToken(""); clearTokens(); setUser(null);
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
            {(user.role === "super_admin" || user.role === "platform_operator") && (
              <Link to="/admin" className="nav-admin-link">管理后台</Link>
            )}
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
