import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [merchantApps, setMerchantApps] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) { localStorage.removeItem("token"); navigate("/login"); return; }
        setUser(data);
      });
    fetch(`${API_BASE}/api/merchant-applications`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.ok ? r.json() : [])
      .then(setMerchantApps);
  }, []);

  if (!user) return <div className="empty" style={{ padding: 80 }}>加载中…</div>;

  const roleLabel = {
    buyer: "买家", merchant_owner: "商家主账号", merchant_staff: "商家员工",
    community_operator: "社区运营", platform_operator: "平台运营",
    risk_reviewer: "风控审核", dispute_mediator: "争议调解", super_admin: "超级管理员"
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>个人中心</h1>
        <p>欢迎回来，{user.display_name}</p>
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>账号信息</h3>
          <div className="info-row"><span>邮箱</span><span>{user.email}</span></div>
          <div className="info-row"><span>角色</span><span>{roleLabel[user.role] || user.role}</span></div>
          <div className="info-row"><span>状态</span><span>{user.is_active ? "正常" : "已停用"}</span></div>
        </div>
        <div className="dashboard-card">
          <h3>快速操作</h3>
          <button className="primary-button full" onClick={() => navigate("/merchant")}>商家中心</button>
          <button className="secondary-button full" style={{ marginTop: 10 }} onClick={() => navigate("/market")}>浏览市场</button>
        </div>
        {merchantApps.length > 0 && (
          <div className="dashboard-card">
            <h3>入驻状态</h3>
            {merchantApps.map((app) => (
              <div key={app.id} className="info-row">
                <span>{app.company_name}</span>
                <span className={`app-status status-${app.status}`}>
                  {{draft:"草稿",submitted:"待审核",reviewing:"审核中",verified:"已认证",rejected:"未通过",suspended:"已暂停"}[app.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
