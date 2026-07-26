import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveTokens, apiFetch } from "../api";

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", display_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let r = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "注册失败"); return; }
      r = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const loginData = await r.json();
      if (r.ok) saveTokens(loginData.access_token, loginData.refresh_token);
      navigate("/dashboard");
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <h1>注册壬集账号</h1>
        <p className="form-subtitle">注册后即可成为买家，也可申请商家入驻</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>昵称 / 姓名</label>
          <input required value={form.display_name} onChange={update("display_name")} placeholder="您的姓名" />
          <label>邮箱</label>
          <input type="email" required value={form.email} onChange={update("email")} placeholder="your@email.com" />
          <label>密码</label>
          <input type="password" required minLength={8} value={form.password} onChange={update("password")} placeholder="至少 8 位" />
          <button type="submit" className="primary-button full" disabled={loading}>
            {loading ? "注册中…" : "注册并登录"}
          </button>
        </form>
        <p className="form-foot">已有账号？<Link to="/login">去登录</Link></p>
      </div>
    </div>
  );
}
