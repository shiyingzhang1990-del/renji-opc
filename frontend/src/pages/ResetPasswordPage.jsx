import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function ResetPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [displayCode, setDisplayCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleGetCode = async (e) => {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);
    try {
      const r = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "请求失败"); return; }
      setResetToken(data.reset_token);
      setDisplayCode(data.code);
      setInfo(`验证码已生成：${data.code}（10分钟内有效）。在正式环境中将发送至您的邮箱。`);
      setStep(2);
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(""); setInfo("");
    if (newPassword !== confirmPassword) { setError("两次输入的密码不一致"); return; }
    if (code.length !== 6) { setError("请输入6位验证码"); return; }
    setLoading(true);
    try {
      const r = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset_token: resetToken, code, new_password: newPassword }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "重置失败"); return; }
      setSuccess(true);
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="form-page">
        <div className="form-card" style={{ textAlign: "center" }}>
          <h1>密码重置成功</h1>
          <p style={{ margin: "20px 0", color: "#586276", lineHeight: 1.8 }}>
            您的新密码已设置成功，请使用新密码登录。
          </p>
          <button className="primary-button" onClick={() => navigate("/login")}>返回登录</button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="form-card">
        <h1>忘记密码</h1>
        <p className="form-subtitle">
          {step === 1 ? "请输入注册时使用的邮箱获取验证码" : "请输入验证码并设置新密码"}
        </p>

        {error && <div className="form-error">{error}</div>}
        {info && <div className="form-success">{info}</div>}

        {step === 1 ? (
          <form onSubmit={handleGetCode}>
            <label>注册邮箱</label>
            <input
              type="email" required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
            <button type="submit" className="primary-button full" disabled={loading}>
              {loading ? "发送中…" : "获取验证码"}
            </button>
            <p className="form-foot">
              <Link to="/login">← 返回登录</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <label>验证码</label>
            <input
              type="text" required maxLength={6} inputMode="numeric" autoComplete="one-time-code"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="6位数字验证码"
              className="code-input"
            />
            <label>新密码</label>
            <input
              type="password" required minLength={8}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 8 位"
            />
            <label>确认新密码</label>
            <input
              type="password" required minLength={8}
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
            />
            <button type="submit" className="primary-button full" disabled={loading}>
              {loading ? "重置中…" : "重置密码"}
            </button>
            <p className="form-foot">
              <button type="button" className="back-link" onClick={() => { setStep(1); setError(""); setInfo(""); }}>
                ← 更换邮箱重新获取
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
