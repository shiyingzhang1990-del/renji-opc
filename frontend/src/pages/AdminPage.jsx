import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearTokens } from "../api";

const STATUS_LABEL = {
  draft: "草稿", submitted: "待审核", reviewing: "审核中",
  verified: "已认证", rejected: "未通过", suspended: "已暂停", exited: "已退出",
};
const ORDER_STATUS_LABEL = {
  awaiting_payment: "待支付", funds_frozen: "已冻结", in_progress: "进行中",
  partially_released: "部分放款", completed: "已完成", cancelled: "已取消",
  disputed: "争议中", refunded: "已退款",
};
const ROLE_LABEL = {
  buyer: "买家", merchant_owner: "商家主账号", merchant_staff: "商家员工",
  community_operator: "社区运营", platform_operator: "平台运营",
  risk_reviewer: "风控审核", dispute_mediator: "争议调解", super_admin: "超级管理员",
};

function money(v) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(Number(v));
}

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("overview");
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
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
      const [meR, appsR, usersR, ordersR, statsR] = await Promise.all([
        apiFetch("/api/auth/me"),
        apiFetch("/api/merchant-applications"),
        apiFetch("/api/users"),
        apiFetch("/api/orders"),
        apiFetch("/api/admin/stats"),
      ]);
      const meData = meR.ok ? await meR.json() : null;
      if (meData && !["super_admin", "platform_operator"].includes(meData.role)) {
        navigate("/dashboard");
        return;
      }
      setUser(meData);
      setApplications(appsR.ok ? await appsR.json() : []);
      setUsers(usersR.ok ? await usersR.json() : []);
      setOrders(ordersR.ok ? await ordersR.json() : []);
      setStats(statsR.ok ? await statsR.json() : null);
    } catch {} finally { setLoading(false); }
  }, [token, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReview = async (appId, status, comment) => {
    setActionLoading(true); setMessage("");
    try {
      const r = await apiFetch(`/api/merchant-applications/${appId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const r = await apiFetch(`/api/merchant-applications/${appId}/suspend?reason=${encodeURIComponent(reason)}`, {
        method: "POST",
      });
      if (r.ok) { setMessage("商家已暂停"); fetchData(); }
      else { const d = await r.json(); setMessage(`操作失败: ${d.detail}`); }
    } catch { setMessage("网络错误"); }
    finally { setActionLoading(false); }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(true); setMessage("");
    try {
      const r = await apiFetch(`/api/users/${userId}/role?new_role=${encodeURIComponent(newRole)}`, {
        method: "PATCH",
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
  const allMerchants = applications.filter((a) => ["verified", "suspended"].includes(a.status));

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>管理后台</h1>
        <p>统一控制平台 — {user.display_name}（{ROLE_LABEL[user.role] || user.role}）</p>
      </div>

      <div className="admin-tabs">
        {[
          ["overview", "平台概览"],
          ["applications", `待审核入驻 (${pendingApps.length})`],
          ["merchants", `全部商家 (${allMerchants.length})`],
          ["orders", `订单管理 (${orders.length})`],
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

      {/* 平台概览 */}
      {tab === "overview" && stats && (
        <div className="admin-section">
          <div className="stats-grid">
            <div className="stat-card"><strong>{stats.total_users}</strong><span>总用户数</span></div>
            <div className="stat-card"><strong>{stats.total_merchants}</strong><span>认证商家</span></div>
            <div className="stat-card"><strong>{stats.total_products}</strong><span>在售商品</span></div>
            <div className="stat-card"><strong>{stats.total_orders}</strong><span>总订单数</span></div>
            <div className="stat-card"><strong>{money(stats.total_revenue)}</strong><span>总交易额</span></div>
            <div className="stat-card highlight"><strong>{stats.pending_applications}</strong><span>待审核申请</span></div>
          </div>
          <div className="stats-section">
            <h3>订单状态分布</h3>
            <div className="stats-grid small">
              {Object.entries(stats.order_status_counts || {}).map(([k, v]) => (
                <div className="stat-card" key={k}><strong>{v}</strong><span>{ORDER_STATUS_LABEL[k] || k}</span></div>
              ))}
            </div>
          </div>
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
                  </div>
                  <div className="admin-card-actions">
                    <input placeholder="审核意见（可选）"
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                    <button className="primary-button" disabled={actionLoading}
                      onClick={() => handleReview(app.id, "verified", reviewComment)}>通过</button>
                    <button className="secondary-button" disabled={actionLoading}
                      onClick={() => handleReview(app.id, "rejected", reviewComment)}>拒绝</button>
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
                    <div><label>公司名称</label><span>{app.company_name || "未填写"}</span></div>
                    <div><label>行业分类</label><span>{app.industry_category || "未填写"}</span></div>
                    <div><label>联系电话</label><span>{app.contact_phone || "未填写"}</span></div>
                    <div><label>联系邮箱</label><span>{app.contact_email || "未填写"}</span></div>
                    <div><label>申请时间</label><span>{new Date(app.created_at).toLocaleDateString("zh-CN")}</span></div>
                    <div><label>审核时间</label><span>{app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString("zh-CN") : "—"}</span></div>
                    <div className="full-width"><label>服务内容</label><p>{app.business_scope}</p></div>
                    {app.review_comment && <div className="full-width"><label>审核意见</label><p>{app.review_comment}</p></div>}
                    {app.suspended_reason && <div className="full-width"><label>暂停原因</label><p style={{ color: "#dc2626" }}>{app.suspended_reason}</p></div>}
                  </div>
                  {app.status === "verified" && (
                    <div className="admin-card-actions">
                      <input placeholder="暂停原因（必填）"
                        onChange={(e) => setSuspendReason(e.target.value)}
                      />
                      <button className="secondary-button" style={{ color: "#dc2626", borderColor: "#dc2626" }}
                        disabled={actionLoading}
                        onClick={() => {
                          if (!suspendReason) { setMessage("请填写暂停原因"); return; }
                          handleSuspend(app.id, suspendReason);
                        }}>暂停商家</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 订单管理 */}
      {tab === "orders" && (
        <div className="admin-section">
          {orders.length === 0 ? (
            <p className="empty" style={{ padding: 40 }}>暂无订单</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>商品</th>
                    <th>商家</th>
                    <th>买家</th>
                    <th>金额</th>
                    <th>状态</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{o.order_no}</td>
                      <td>{o.product?.title || "—"}</td>
                      <td>{o.merchant?.display_name || "—"}</td>
                      <td>{o.buyer_name}<br /><small style={{ color: "#7a8499" }}>{o.buyer_contact}</small></td>
                      <td>{money(o.total_amount)}</td>
                      <td><span className={`app-status`}>{ORDER_STATUS_LABEL[o.status] || o.status}</span></td>
                      <td style={{ fontSize: 13 }}>{new Date(o.created_at || o.order_no.slice(2, 10)).toLocaleDateString("zh-CN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                      <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{ fontSize: 13, padding: "4px 8px" }}>
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
