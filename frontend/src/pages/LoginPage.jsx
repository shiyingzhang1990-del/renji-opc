import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "登录失败"); return; }
      localStorage.setItem("token", data.access_token);
      navigate("/");
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <h1>登录壬集</h1>
        <p className="form-subtitle">登录后可以管理商家和查看订单</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>邮箱</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          <label>密码</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 位" />
          <button type="submit" className="primary-button full" disabled={loading}>
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
        <p className="form-foot">还没有账号？<Link to="/register">立即注册</Link></p>
      </div>
    </div>
  );
}
