import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearTokens } from "../api";

const DELIVERY_LABELS = {
  digital_good: "数字商品", subscription: "订阅服务",
  project_service: "项目服务", consulting: "咨询服务",
};

const ORDER_STATUS_LABEL = {
  awaiting_payment: "待支付", funds_frozen: "已冻结", in_progress: "进行中",
  partially_released: "部分放款", completed: "已完成", cancelled: "已取消",
  disputed: "争议中", refunded: "已退款",
};

const STATUS_LABEL = {
  draft: "草稿", submitted: "待审核", reviewing: "审核中",
  verified: "已认证", rejected: "未通过", suspended: "已暂停", exited: "已退出",
};

function money(v) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(Number(v));
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("overview");
  const [merchantApps, setMerchantApps] = useState([]);
  const [products, setProducts] = useState([]);
  const [soldOrders, setSoldOrders] = useState([]);
  const [boughtOrders, setBoughtOrders] = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  const [editProduct, setEditProduct] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchAll = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    setLoading(true);
    try {
      const meR = await apiFetch("/api/auth/me");
      if (!meR.ok) { clearTokens(); navigate("/login"); return; }
      const meData = await meR.json();
      setUser(meData);

      const [appsR, catsR, statsR] = await Promise.all([
        apiFetch("/api/merchant-applications"),
        apiFetch("/api/categories"),
        apiFetch("/api/my/dashboard"),
      ]);
      setMerchantApps(appsR.ok ? await appsR.json() : []);
      setCategories(catsR.ok ? await catsR.json() : []);
      if (statsR.ok) setDashStats(await statsR.json());

      if (meData.merchant_id) {
        const [prodsR, soldR] = await Promise.all([
          apiFetch("/api/my/products"),
          apiFetch("/api/orders?page_size=50&filter=sold"),
        ]);
        setProducts(prodsR.ok ? await prodsR.json() : []);
        setSoldOrders(soldR.ok ? await soldR.json() : []);
      }

      const boughtR = await apiFetch("/api/orders?page_size=50&filter=bought");
      setBoughtOrders(boughtR.ok ? await boughtR.json() : []);
    } catch {} finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleTogglePublish = async (product) => {
    try {
      const r = await apiFetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !product.published }),
      });
      if (r.ok) {
        setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, published: !p.published } : p));
        setMessage(product.published ? "商品已下架" : "商品已上架");
      }
    } catch { setMessage("操作失败"); }
  };

  const handleDelete = async (productId) => {
    if (!confirm("确定要删除这个商品吗？")) return;
    try {
      const r = await apiFetch(`/api/products/${productId}`, { method: "DELETE" });
      if (r.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setMessage("商品已删除");
      }
    } catch { setMessage("删除失败"); }
  };

  const handleEditOpen = (product) => {
    setEditProduct(product.id);
    setEditForm({
      title: product.title, summary: product.summary,
      category_id: product.category.id, delivery_type: product.delivery_type,
      price_from: String(product.price_from), delivery_days: String(product.delivery_days),
      contact_wechat: product.contact_wechat || "",
      contact_phone: product.contact_phone || "",
      contact_qq: product.contact_qq || "",
      display_url: product.display_url || "",
      images: product.images || "",
      deliverable_url: product.deliverable_url || "",
    });
  };

  const handleEditSave = async () => {
    try {
      const body = { ...editForm, category_id: Number(editForm.category_id), price_from: Number(editForm.price_from), delivery_days: Number(editForm.delivery_days) };
      const r = await apiFetch(`/api/products/${editProduct}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (r.ok) {
        const updated = await r.json();
        setProducts((prev) => prev.map((p) => p.id === editProduct ? updated : p));
        setEditProduct(null); setMessage("商品已更新");
      } else { const d = await r.json(); setMessage(`更新失败: ${d.detail}`); }
    } catch { setMessage("网络错误"); }
  };

  if (loading) return <div className="empty" style={{ padding: 80 }}>加载中…</div>;
  if (!user) {
    return (
      <div className="form-page">
        <div className="form-card" style={{ textAlign: "center" }}>
          <h1>个人中心</h1>
          <p style={{ margin: "20px 0", color: "#586276" }}>请先登录</p>
          <button className="primary-button" onClick={() => navigate("/login")}>去登录</button>
        </div>
      </div>
    );
  }

  const roleLabel = {
    buyer: "买家", merchant_owner: "商家主账号", merchant_staff: "商家员工",
    community_operator: "社区运营", platform_operator: "平台运营",
    risk_reviewer: "风控审核", dispute_mediator: "争议调解", super_admin: "超级管理员",
  };

  const verifiedApp = merchantApps.find((a) => a.status === "verified");
  const isMerchant = !!(user.merchant_id && verifiedApp);

  const tabs = [
    ["overview", "账号概览"],
    ["sold", `我卖出的 (${soldOrders.length})`],
    ["bought", `我买到的 (${boughtOrders.length})`],
    ...(isMerchant ? [["products", `商品管理 (${products.length})`]] : []),
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>个人中心</h1>
        <p>欢迎回来，{user.display_name}（{roleLabel[user.role] || user.role}）</p>
      </div>

      {/* Stats Cards */}
      {dashStats && (
        <div className="dash-stats-row">
          {isMerchant && (
            <>
              <div className="dash-stat-card">
                <strong>{dashStats.products_published}</strong>
                <span>在售商品</span>
              </div>
              <div className="dash-stat-card">
                <strong>{dashStats.orders_sold}</strong>
                <span>卖出订单</span>
              </div>
              <div className="dash-stat-card highlight">
                <strong>{money(dashStats.revenue_sold)}</strong>
                <span>销售收入</span>
              </div>
            </>
          )}
          <div className="dash-stat-card">
            <strong>{dashStats.orders_bought}</strong>
            <span>购买订单</span>
          </div>
          <div className="dash-stat-card">
            <strong>{money(dashStats.spent_bought)}</strong>
            <span>购买总额</span>
          </div>
        </div>
      )}

      <div className="dash-tabs">
        {tabs.map(([key, label]) => (
          <button key={key} className={`dash-tab ${tab === key ? "active" : ""}`} onClick={() => { setTab(key); setMessage(""); }}>
            {label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`dash-message ${message.includes("失败") || message.includes("错误") ? "error" : "success"}`}>
          {message}
        </div>
      )}

      {/* Tab: 账号概览 */}
      {tab === "overview" && (
        <div className="dash-section">
          <div className="dash-card-grid">
            <div className="dash-card">
              <h3>账号信息</h3>
              <div className="info-row"><span>邮箱</span><span>{user.email}</span></div>
              <div className="info-row"><span>角色</span><span>{roleLabel[user.role] || user.role}</span></div>
              <div className="info-row"><span>状态</span><span>{user.is_active ? "正常" : "已停用"}</span></div>
              <div className="info-row"><span>注册时间</span><span>{new Date(user.created_at).toLocaleDateString("zh-CN")}</span></div>
            </div>
            <div className="dash-card">
              <h3>快捷操作</h3>
              <button className="primary-button full" onClick={() => navigate("/merchant")}>
                {isMerchant ? "商家中心" : "申请商家入驻"}
              </button>
              <button className="secondary-button full" style={{ marginTop: 10 }} onClick={() => navigate("/market")}>浏览市场</button>
            </div>
            {merchantApps.length > 0 && (
              <div className="dash-card">
                <h3>入驻状态</h3>
                {merchantApps.map((app) => (
                  <div key={app.id} className="info-row">
                    <span>{app.display_name || app.company_name}</span>
                    <span className={`app-status status-${app.status}`}>{STATUS_LABEL[app.status]}</span>
                  </div>
                ))}
                {verifiedApp && (
                  <div style={{ marginTop: 12, padding: "12px", background: "#f0fdf4", borderRadius: 8, fontSize: 14, color: "#166534" }}>
                    商家已认证，可发布和管理商品
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: 我卖出的（收到的订单） */}
      {tab === "sold" && (
        <div className="dash-section">
          {soldOrders.length === 0 ? (
            <div className="dash-card" style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: "#586276" }}>
                {isMerchant ? "还没有收到任何订单" : "成为商家后即可查看卖出订单"}
              </p>
              {!isMerchant && (
                <button className="primary-button" style={{ marginTop: 12 }} onClick={() => navigate("/merchant")}>申请商家入驻</button>
              )}
            </div>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>商品</th>
                    <th>买家</th>
                    <th>金额</th>
                    <th>状态</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {soldOrders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{o.order_no}</td>
                      <td>{o.product?.title || "—"}</td>
                      <td>{o.buyer_name}<br /><small style={{ color: "#7a8499" }}>{o.buyer_contact}</small></td>
                      <td>{money(o.total_amount)}</td>
                      <td><span className="app-status">{ORDER_STATUS_LABEL[o.status] || o.status}</span></td>
                      <td style={{ fontSize: 13 }}>{new Date(o.created_at).toLocaleDateString("zh-CN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: 我买到的（下的订单） */}
      {tab === "bought" && (
        <div className="dash-section">
          {boughtOrders.length === 0 ? (
            <div className="dash-card" style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: "#586276" }}>还没有下过任何订单</p>
              <button className="primary-button" style={{ marginTop: 12 }} onClick={() => navigate("/market")}>去市场看看</button>
            </div>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>商品</th>
                    <th>商家</th>
                    <th>金额</th>
                    <th>状态</th>
                    <th>交付链接</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {boughtOrders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{o.order_no}</td>
                      <td>{o.product?.title || "—"}</td>
                      <td>{o.merchant?.display_name || "—"}</td>
                      <td>{money(o.total_amount)}</td>
                      <td><span className="app-status">{ORDER_STATUS_LABEL[o.status] || o.status}</span></td>
                      <td>
                        {o.product?.deliverable_url ? (
                          <a href={o.product.deliverable_url} target="_blank" rel="noopener noreferrer" className="deliverable-link-small">打开</a>
                        ) : <span style={{ color: "#7a8499", fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 13 }}>{new Date(o.created_at).toLocaleDateString("zh-CN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: 商品管理（仅商家） */}
      {tab === "products" && isMerchant && (
        <div className="dash-section">
          {products.length === 0 ? (
            <div className="dash-card" style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: "#586276", marginBottom: 16 }}>还没有发布商品</p>
              <button className="primary-button" onClick={() => navigate("/merchant")}>发布第一个商品</button>
            </div>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>商品名称</th>
                    <th>分类</th>
                    <th>价格</th>
                    <th>类型</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td><div className="product-cell"><strong>{p.title}</strong><small>{p.summary?.slice(0, 50)}{(p.summary?.length > 50) ? "…" : ""}</small></div></td>
                      <td>{p.category?.name}</td>
                      <td>{money(p.price_from)}</td>
                      <td>{DELIVERY_LABELS[p.delivery_type] || p.delivery_type}</td>
                      <td><span className={`app-status ${p.published ? "status-verified" : "status-draft"}`}>{p.published ? "上架" : "下架"}</span></td>
                      <td>
                        <div className="table-actions">
                          <button className="table-action-btn" onClick={() => navigate(`/product/${p.id}`)}>查看</button>
                          <button className="table-action-btn" onClick={() => handleEditOpen(p)}>编辑</button>
                          <button className="table-action-btn" onClick={() => handleTogglePublish(p)}>{p.published ? "下架" : "上架"}</button>
                          <button className="table-action-btn danger" onClick={() => handleDelete(p.id)}>删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editProduct && (
        <div className="modal-overlay" onClick={() => setEditProduct(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>编辑商品</h2>
            <div className="form-field"><label>名称</label><input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
            <div className="form-field"><label>简介</label><textarea rows={2} value={editForm.summary} onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-field"><label>价格</label><input type="number" value={editForm.price_from} onChange={(e) => setEditForm({ ...editForm, price_from: e.target.value })} /></div>
              <div className="form-field"><label>周期(天)</label><input type="number" value={editForm.delivery_days} onChange={(e) => setEditForm({ ...editForm, delivery_days: e.target.value })} /></div>
            </div>
            <div className="form-field"><label>展示链接</label><input value={editForm.display_url} onChange={(e) => setEditForm({ ...editForm, display_url: e.target.value })} placeholder="https://example.com" /></div>
            <div className="form-field"><label>实拍图URL（每行一个）</label><textarea rows={2} value={editForm.images} onChange={(e) => setEditForm({ ...editForm, images: e.target.value })} placeholder="https://example.com/photo.jpg" /></div>
            <div className="form-field"><label>交付链接</label><input value={editForm.deliverable_url} onChange={(e) => setEditForm({ ...editForm, deliverable_url: e.target.value })} placeholder="付款后买家可见的链接" /></div>
            <div className="form-actions">
              <button className="secondary-button" onClick={() => setEditProduct(null)}>取消</button>
              <button className="primary-button" onClick={handleEditSave}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
