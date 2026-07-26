import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

function money(v) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(Number(v));
}

export default function OrderPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    buyer_name: "",
    buyer_contact: "",
    milestone_title: "",
    milestone_desc: "",
    milestone_amount: "",
    milestone_days: "7",
  });
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    apiFetch("/api/products")
      .then((r) => r.json())
      .then((all) => {
        const p = all.find((x) => x.id === Number(productId));
        if (p) {
          setProduct(p);
          setForm((f) => ({
            ...f,
            milestone_title: p.title,
            milestone_desc: p.summary,
            milestone_amount: String(p.price_from),
            milestone_days: String(p.delivery_days),
          }));
        }
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const r = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_name: form.buyer_name,
          buyer_contact: form.buyer_contact,
          product_id: Number(productId),
          milestones: [{
            title: form.milestone_title,
            description: form.milestone_desc,
            amount: Number(form.milestone_amount),
            due_days: Number(form.milestone_days),
          }],
          contract_snapshot: "",
        }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "下单失败，请重试"); return; }
      setSuccess(true);
    } catch { setError("网络错误，请重试"); }
    finally { setSubmitting(false); }
  };

  if (!token) return null;
  if (loading) return <div className="empty" style={{ padding: 80 }}>加载中…</div>;
  if (!product) return <div className="empty" style={{ padding: 80 }}>商品不存在</div>;

  if (success) {
    return (
      <div className="form-page">
        <div className="form-card" style={{ textAlign: "center" }}>
          <h1>下单成功！</h1>
          <p style={{ margin: "20px 0", color: "#586276", lineHeight: 1.8 }}>
            您的订单已成功提交，商家将在1个工作日内联系您确认细节。<br />
            您可以在个人中心查看订单状态。
          </p>
          <button className="primary-button" onClick={() => navigate("/dashboard")}>前往个人中心</button>
          <button className="secondary-button" style={{ marginTop: 12 }} onClick={() => navigate("/market")}>继续浏览市场</button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="form-card" style={{ maxWidth: 640 }}>
        <button className="back-link" onClick={() => navigate(-1)} style={{ marginBottom: 16, background: "none", border: "none", cursor: "pointer" }}>← 返回</button>
        <h1>确认订单</h1>
        <p className="form-subtitle">下单后商家将在1个工作日内联系您确认细节</p>

        <div className="order-product-summary">
          <strong>{product.title}</strong>
          <div>
            <span>{product.merchant.display_name}</span>
            <span className="dot">·</span>
            <span>{money(product.price_from)} 起</span>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>您的姓名 *</label>
          <input required value={form.buyer_name} onChange={update("buyer_name")} placeholder="姓名或公司名称" />

          <label>联系方式 *</label>
          <input required value={form.buyer_contact} onChange={update("buyer_contact")} placeholder="手机号或邮箱" />

          <fieldset className="milestone-fieldset">
            <legend>第一阶段交付内容</legend>
            <label>任务名称</label>
            <input required value={form.milestone_title} onChange={update("milestone_title")} />
            <label>任务描述</label>
            <textarea value={form.milestone_desc} onChange={update("milestone_desc")} rows={3} />
            <div className="form-row">
              <div className="form-field">
                <label>金额 (元)</label>
                <input required type="number" min="1" value={form.milestone_amount} onChange={update("milestone_amount")} />
              </div>
              <div className="form-field">
                <label>预计天数</label>
                <input required type="number" min="1" max="365" value={form.milestone_days} onChange={update("milestone_days")} />
              </div>
            </div>
          </fieldset>

          <button type="submit" className="primary-button full" disabled={submitting} style={{ marginTop: 16 }}>
            {submitting ? "提交中…" : "确认下单"}
          </button>
        </form>
      </div>
    </div>
  );
}
