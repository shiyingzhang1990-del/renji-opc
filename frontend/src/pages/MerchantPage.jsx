import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function MerchantPage() {
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem("token") || "";

  const [form, setForm] = useState({
    display_name: "",
    industry_category: "",
    business_scope: ""
  });
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    const payload = {
      ...form,
      company_name: form.display_name,
      contact_phone: "",
      contact_email: user?.email || "",
    };
    try {
      const r = await fetch(`${API_BASE}/api/merchant-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "提交失败"); return; }
      setForm({ display_name: "", industry_category: "", business_scope: "" });
      setShowForm(false);
      setSuccess("入驻申请已提交！等待平台审核。");
      const r2 = await fetch(`${API_BASE}/api/merchant-applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r2.ok) setApps(await r2.json());
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then(setUser);

    fetch(`${API_BASE}/api/merchant-applications`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.ok ? r.json() : [])
      .then(setApps);
  }, [token]);

  const statusLabel = {
    draft: "草稿", submitted: "待审核", reviewing: "审核中",
    verified: "已认证", rejected: "未通过", suspended: "已暂停", exited: "已退出"
  };

  if (!token) {
    return (
      <div className="form-page">
        <div className="form-card" style={{ textAlign: "center" }}>
          <h1>商家入驻</h1>
          <p style={{ margin: "20px 0", color: "#586276", lineHeight: 1.8 }}>
            只需注册并登录壬集账号，填写品牌名和服务内容即可成为 OPC 商家。<br />
            入驻流程：注册账号 → 填写服务信息 → 平台审核 → 认证通过 → 发布商品
          </p>
          <button className="primary-button" onClick={() => navigate("/register")}>
            注册账号并入驻
          </button>
          <p className="form-foot" style={{ marginTop: 16 }}>
            已有账号？<a href="#" onClick={() => navigate("/login")}>去登录</a>
          </p>
        </div>
      </div>
    );
  }

  const pendingApp = apps.find((a) => ["draft", "submitted", "reviewing"].includes(a.status));
  const verifiedApp = apps.find((a) => a.status === "verified");

  return (
    <div className="merchant-page">
      <div className="merchant-header">
        <h1>商家中心</h1>
        <p>{user?.display_name}，欢迎使用壬集商家平台</p>
      </div>

      {error && <div className="form-error" style={{ margin: "0 7vw 16px" }}>{error}</div>}
      {success && <div className="form-success" style={{ margin: "0 7vw 16px" }}>{success}</div>}

      {apps.length > 0 && (
        <div className="merchant-apps">
          <h2>我的入驻申请</h2>
          {apps.map((app) => (
            <div className="app-card" key={app.id}>
              <div>
                <strong>{app.company_name}</strong>
                <span className={`app-status status-${app.status}`}>{statusLabel[app.status]}</span>
              </div>
              {app.review_comment && <p className="app-comment">审核意见：{app.review_comment}</p>}
              {app.status === "draft" && (
                <button className="small-btn" onClick={async () => {
                  await fetch(`${API_BASE}/api/merchant-applications/${app.id}/submit`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  window.location.reload();
                }}>提交审核</button>
              )}
            </div>
          ))}
        </div>
      )}

      {verifiedApp && (
        <div className="merchant-verified">
          <h2>✓ 商家已认证</h2>
          <p>您的商家已通过平台认证，可以开始发布商品和接单了。</p>
        </div>
      )}

      {!pendingApp && !verifiedApp && (
        <>
          {!showForm ? (
            <div className="form-card" style={{ margin: "32px 7vw" }}>
              <h2 style={{ marginBottom: 8 }}>填写入驻信息</h2>
              <p style={{ color: "#586276", marginBottom: 20 }}>只需提供您的品牌名和服务内容描述即可申请入驻</p>
              <button className="primary-button" onClick={() => setShowForm(true)}>开始填写</button>
            </div>
          ) : (
            <div className="form-card" style={{ margin: "32px 7vw" }}>
              <h2 style={{ marginBottom: 20 }}>商家入驻信息</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-field" style={{ marginTop: 0 }}>
                  <label>品牌 / 展示名称 *</label>
                  <input required value={form.display_name} onChange={update("display_name")} placeholder="客户看到的品牌名" />
                </div>
                <div className="form-field">
                  <label>行业分类 *</label>
                  <select required value={form.industry_category} onChange={update("industry_category")}>
                    <option value="">请选择</option>
                    <option>品牌与广告设计</option>
                    <option>软件与 AI 智能体</option>
                    <option>财税与企业服务</option>
                    <option>销售与客户运营</option>
                    <option>供应链与采购</option>
                    <option>法律、知识产权与合规</option>
                    <option>管理咨询</option>
                    <option>教育培训与知识产品</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>服务内容描述 *</label>
                  <textarea
                    required
                    value={form.business_scope}
                    onChange={update("business_scope")}
                    placeholder="请描述您提供的服务范围、专业能力和目标客户群体"
                    rows={5}
                  />
                </div>
                <div className="form-actions" style={{ marginTop: 20 }}>
                  <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>取消</button>
                  <button type="submit" className="primary-button" disabled={loading}>
                    {loading ? "提交中…" : "提交入驻申请"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
