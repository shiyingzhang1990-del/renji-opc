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
    payment_method: "alipay",
  });
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const [createdOrder, setCreatedOrder] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

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
          payment_method: form.payment_method,
        }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "下单失败，请重试"); return; }
      setCreatedOrder(data);
      setSuccess(true);
    } catch { setError("网络错误，请重试"); }
    finally { setSubmitting(false); }
  };

  const handlePay = async () => {
    setPaying(true); setError("");
    try {
      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
      const r = await apiFetch(`/api/orders/${createdOrder.id}/pay`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "支付失败"); return; }
      setCreatedOrder(data);
      setPaid(true);
    } catch { setError("支付网络错误"); }
    finally { setPaying(false); }
  };

  if (!token) return null;
  if (loading) return <div className="empty" style={{ padding: 80 }}>加载中…</div>;
  if (!product) return <div className="empty" style={{ padding: 80 }}>商品不存在</div>;

  if (success) {
    const statusLabel = {
      awaiting_payment: "待支付", funds_frozen: "已冻结", in_progress: "进行中",
      partially_released: "部分放款", completed: "已完成", cancelled: "已取消",
      disputed: "争议中", refunded: "已退款",
    };
    const methodLabel = { alipay: "支付宝", wechatpay: "微信支付" };
    return (
      <div className="form-page">
        <div className="form-card" style={{ textAlign: "center" }}>
          <h1>{paid ? "支付成功！" : "下单成功！"}</h1>
          {createdOrder && (
            <div className="order-confirm-info">
              <p><span>订单号</span><strong>{createdOrder.order_no}</strong></p>
              <p><span>商品</span><strong>{createdOrder.product?.title || "—"}</strong></p>
              <p><span>金额</span><strong>{money(createdOrder.total_amount)}</strong></p>
              <p><span>支付方式</span><strong>{methodLabel[createdOrder.payment_method] || createdOrder.payment_method}</strong></p>
              <p><span>状态</span><span className="app-status">{statusLabel[createdOrder.status] || createdOrder.status}</span></p>
            </div>
          )}
          {!paid && createdOrder && createdOrder.status === "awaiting_payment" && (
            <div className="pay-section">
              <p style={{ color: "#586276", marginBottom: 16 }}>请完成支付以锁定订单</p>
              {error && <div className="form-error">{error}</div>}
              <button className="primary-button pay-btn" onClick={handlePay} disabled={paying}>
                {paying ? "支付中…" : `去支付 ${money(createdOrder.total_amount)}`}
              </button>
            </div>
          )}
          {paid && (
            <p style={{ margin: "20px 0", color: "#166534" }}>
              资金已冻结，商家将开始为您服务。
            </p>
          )}
          <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="primary-button" onClick={() => navigate("/dashboard")}>查看订单</button>
            <button className="secondary-button" onClick={() => navigate("/market")}>继续浏览</button>
          </div>
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

          <fieldset className="payment-method-fieldset">
            <legend>支付方式</legend>
            <div className="payment-methods">
              <label className={`payment-option ${form.payment_method === "alipay" ? "active" : ""}`}>
                <input type="radio" name="payment_method" value="alipay" checked={form.payment_method === "alipay"} onChange={update("payment_method")} />
                <span className="payment-icon">支</span>
                <span>支付宝</span>
              </label>
              <label className={`payment-option ${form.payment_method === "wechatpay" ? "active" : ""}`}>
                <input type="radio" name="payment_method" value="wechatpay" checked={form.payment_method === "wechatpay"} onChange={update("payment_method")} />
                <span className="payment-icon wechat">微</span>
                <span>微信支付</span>
              </label>
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
