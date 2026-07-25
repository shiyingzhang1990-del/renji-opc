import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const STATUS_LABEL = {
  draft: "草稿", submitted: "待审核", reviewing: "审核中",
  verified: "已认证", rejected: "未通过", suspended: "已暂停", exited: "已退出",
};
const ROLE_LABEL = {
  buyer: "买家", merchant_owner: "商家主账号", merchant_staff: "商家员工",
  community_operator: "社区运营", platform_operator: "平台运营",
  risk_reviewer: "风控审核", dispute_mediator: "争议调解", super_admin: "超级管理员",
};

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("applications");
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [meR, appsR, usersR] = await Promise.all([
        fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/merchant-applications`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const meData = meR.ok ? await meR.json() : null;
      if (meData && !["super_admin", "platform_operator"].includes(meData.role)) {
        navigate("/dashboard");
        return;
      }
      setUser(meData);
      setApplications(appsR.ok ? await appsR.json() : []);
      setUsers(usersR.ok ? await usersR.json() : []);
    } catch {} finally { setLoading(false); }
  }, [token, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReview = async (appId, status, comment) => {
    setActionLoading(true); setMessage("");
    try {
      const r = await fetch(`${API_BASE}/api/merchant-applications/${appId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, review_comment: comment || "", risk_level: "normal" }),
      });
      if (r.ok) {
        setMessage(status === "verified" ? "商家已通过审核" : "已拒绝该申请");
        fetchData();
      } else {
        const d = await r.json();
        setMessage(`操作失败: ${d.detail}`);
      }
    } catch { setMessage("网络错误"); }
    finally { setActionLoading(false); }
  };

  const handleSuspend = async (appId, reason) => {
    setActionLoading(true); setMessage("");
    try {
      const r = await fetch(`${API_BASE}/api/merchant-applications/${appId}/suspend?reason=${encodeURIComponent(reason)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) { setMessage("商家已暂停"); fetchData(); }
      else { const d = await r.json(); setMessage(`操作失败: ${d.detail}`); }
    } catch { setMessage("网络错误"); }
    finally { setActionLoading(false); }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(true); setMessage("");
    try {
      const r = await fetch(`${API_BASE}/api/users/${userId}/role?new_role=${encodeURIComponent(newRole)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) { setMessage("角色已更新"); fetchData(); }
      else { const d = await r.json(); setMessage(`操作失败: ${d.detail}`); }
    } catch { setMessage("网络错误"); }
    finally { setActionLoading(false); }
  };

  if (!token) {
    return (
      <div className="form-page">
        <div className="form-card" style={{ textAlign: "center" }}>
          <h1>管理后台</h1>
          <p style={{ margin: "20px 0" }}>请先登录管理员账号</p>
          <button className="primary-button" onClick={() => navigate("/login")}>去登录</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="empty" style={{ padding: 80 }}>加载中…</div>;
  if (!user) return null;

  const pendingApps = applications.filter((a) => ["submitted", "reviewing"].includes(a.status));
  const verifiedApps = applications.filter((a) => a.status === "verified");
  const allMerchants = applications.filter((a) => ["verified", "suspended"].includes(a.status));

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>管理后台</h1>
        <p>统一控制平台 — {user.display_name}（{ROLE_LABEL[user.role] || user.role}）</p>
      </div>

      <div className="admin-tabs">
        {[
          ["applications", `待审核入驻 (${pendingApps.length})`],
          ["merchants", `全部商家 (${allMerchants.length})`],
          ["users", `用户管理 (${users.length})`],
        ].map(([key, label]) => (
          <button key={key} className={`admin-tab ${tab === key ? "active" : ""}`} onClick={() => { setTab(key); setMessage(""); }}>
            {label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`form-${message.includes("失败") || message.includes("错误") ? "error" : "success"}`} style={{ margin: "0 7vw 12px" }}>
          {message}
        </div>
      )}

      {/* 待审核入驻 */}
      {tab === "applications" && (
        <div className="admin-section">
          {pendingApps.length === 0 ? (
            <p className="empty" style={{ padding: 40 }}>暂无待审核申请</p>
          ) : (
            pendingApps.map((app) => (
              <div className="admin-card" key={app.id}>
                <div className="admin-card-body">
                  <div className="admin-card-main">
                    <h3>{app.display_name}</h3>
                    <span className={`app-status status-${app.status}`}>{STATUS_LABEL[app.status]}</span>
                  </div>
                  <div className="admin-card-info">
                    <div><label>公司名称</label><span>{app.company_name || "未填写"}</span></div>
                    <div><label>行业分类</label><span>{app.industry_category || "未填写"}</span></div>
                    <div><label>联系方式</label><span>{app.contact_phone || "未填写"} / {app.contact_email}</span></div>
                    <div><label>申请时间</label><span>{new Date(app.created_at).toLocaleDateString("zh-CN")}</span></div>
                    <div className="full-width"><label>服务内容</label><p>{app.business_scope}</p></div>
                    {app.professional_qualifications && (
                      <div className="full-width"><label>专业资质</label><p>{app.professional_qualifications}</p></div>
                    )}
                    {app.cases && (
                      <div className="full-width"><label>案例</label><p>{app.cases}</p></div>
                    )}
                  </div>
                  <div className="admin-card-actions">
                    <input
                      placeholder="审核意见（可选）"
                      value={reviewComment === app.id ? undefined : ""}
                      onChange={(e) => setReviewComment(e.target.value)}
                      onFocus={() => setReviewComment("__" + app.id)}
                    />
                    <button className="primary-button" disabled={actionLoading} onClick={() => handleReview(app.id, "verified", reviewComment === "__" + app.id ? "" : reviewComment)}>
                      通过
                    </button>
                    <button className="secondary-button" disabled={actionLoading} onClick={() => handleReview(app.id, "rejected", reviewComment === "__" + app.id ? "" : reviewComment)}>
                      拒绝
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 全部商家 */}
      {tab === "merchants" && (
        <div className="admin-section">
          {allMerchants.length === 0 ? (
            <p className="empty" style={{ padding: 40 }}>暂无商家</p>
          ) : (
            allMerchants.map((app) => (
              <div className="admin-card" key={app.id}>
                <div className="admin-card-body">
                  <div className="admin-card-main">
                    <h3>{app.display_name || app.company_name}</h3>
                    <span className={`app-status status-${app.status}`}>{STATUS_LABEL[app.status]}</span>
                  </div>
                  <div className="admin-card-info">
                    <div><label>行业分类</label><span>{app.industry_category || "未填写"}</span></div>
                    <div><label>申请时间</label><span>{new Date(app.created_at).toLocaleDateString("zh-CN")}</span></div>
                    <div><label>审核时间</label><span>{app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString("zh-CN") : "—"}</span></div>
                    <div className="full-width"><label>服务内容</label><p>{app.business_scope}</p></div>
                    {app.review_comment && <div className="full-width"><label>审核意见</label><p>{app.review_comment}</p></div>}
                    {app.suspended_reason && <div className="full-width"><label>暂停原因</label><p style={{ color: "#dc2626" }}>{app.suspended_reason}</p></div>}
                  </div>
                  {app.status === "verified" && (
                    <div className="admin-card-actions">
                      <input
                        placeholder="暂停原因（必填）"
                        value={suspendReason === app.id ? undefined : ""}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        onFocus={() => setSuspendReason("__" + app.id)}
                      />
                      <button className="secondary-button" style={{ color: "#dc2626", borderColor: "#dc2626" }}
                        disabled={actionLoading}
                        onClick={() => {
                          const reason = suspendReason === "__" + app.id ? "" : suspendReason;
                          if (!reason) { setMessage("请填写暂停原因"); return; }
                          handleSuspend(app.id, reason);
                        }}>
                        暂停商家
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 用户管理 */}
      {tab === "users" && (
        <div className="admin-section">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>显示名</th>
                  <th>邮箱</th>
                  <th>角色</th>
                  <th>商家ID</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.display_name}</td>
                    <td>{u.email}</td>
                    <td>{ROLE_LABEL[u.role] || u.role}</td>
                    <td>{u.merchant_id || "—"}</td>
                    <td>{new Date(u.created_at).toLocaleDateString("zh-CN")}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{ fontSize: 13, padding: "4px 8px" }}
                      >
                        {Object.entries(ROLE_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
