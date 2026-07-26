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
    payment_method: "alipay",
  });
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const [createdOrder, setCreatedOrder] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    apiFetch("/api/products")
      .then((r) => r.json())
      .then((all) => {
        const p = all.find((x) => x.id === Number(productId));
        if (p) setProduct(p);
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

  const handleConfirmPayment = async () => {
    setConfirming(true); setError("");
    try {
      const r = await apiFetch(`/api/orders/${createdOrder.id}/confirm-payment`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "确认失败"); return; }
      setCreatedOrder(data);
      setConfirmed(true);
    } catch { setError("网络错误"); }
    finally { setConfirming(false); }
  };

  if (!token) return null;
  if (loading) return <div className="empty" style={{ padding: 80 }}>加载中…</div>;
  if (!product) return <div className="empty" style={{ padding: 80 }}>商品不存在</div>;

  const methodLabel = { alipay: "支付宝", wechatpay: "微信支付" };
  const merchant = createdOrder?.merchant || product.merchant;

  if (success) {
    return (
      <div className="form-page">
        <div className="form-card" style={{ textAlign: "center", maxWidth: 640 }}>
          {!confirmed ? (
            <>
              <h1>确认订单 · 去付款</h1>
              <div className="order-confirm-info">
                <p><span>订单号</span><strong>{createdOrder.order_no}</strong></p>
                <p><span>商品</span><strong>{product.title}</strong></p>
                <p><span>金额</span><strong style={{ color: "#dc2626", fontSize: 18 }}>{money(createdOrder.total_amount)}</strong></p>
                <p><span>支付方式</span><strong>{methodLabel[createdOrder.payment_method] || createdOrder.payment_method}</strong></p>
              </div>

              <div className="merchant-payment-info">
                <h3>请扫码支付</h3>
                <p className="pay-amount">{money(createdOrder.total_amount)}</p>

                <div className="qr-codes-row">
                  {merchant?.alipay_qr_url && (
                    <div className="qr-code-card">
                      <img src={merchant.alipay_qr_url} alt="支付宝收款码" className="qr-code-img" onError={(e) => { e.target.src = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect fill="#f0f5ff" width="160" height="160" rx="12"/><text x="80" y="70" text-anchor="middle" fill="#1677ff" font-size="16" font-weight="600">支付宝</text><text x="80" y="100" text-anchor="middle" fill="#586276" font-size="12">收款码图片加载失败</text></svg>'); }} />
                      <span>支付宝扫码</span>
                    </div>
                  )}
                  {merchant?.wechat_qr_url && (
                    <div className="qr-code-card">
                      <img src={merchant.wechat_qr_url} alt="微信收款码" className="qr-code-img" onError={(e) => { e.target.src = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect fill="#f0fff4" width="160" height="160" rx="12"/><text x="80" y="70" text-anchor="middle" fill="#07c160" font-size="16" font-weight="600">微信支付</text><text x="80" y="100" text-anchor="middle" fill="#586276" font-size="12">收款码图片加载失败</text></svg>'); }} />
                      <span>微信扫码</span>
                    </div>
                  )}
                  {!merchant?.alipay_qr_url && !merchant?.wechat_qr_url && (
                    <div style={{ width: "100%", textAlign: "center", padding: 20 }}>
                      {merchant?.alipay_account && (
                        <div className="pay-account-row">
                          <span className="pay-account-label">支付宝账号</span>
                          <strong>{merchant.alipay_account}</strong>
                        </div>
                      )}
                      {merchant?.wechatpay_merchant_id && (
                        <div className="pay-account-row">
                          <span className="pay-account-label">微信商户号</span>
                          <strong>{merchant.wechatpay_merchant_id}</strong>
                        </div>
                      )}
                      {merchant?.bank_account_info && (
                        <div className="pay-account-row">
                          <span className="pay-account-label">银行账户</span>
                          <strong style={{ whiteSpace: "pre-wrap" }}>{merchant.bank_account_info}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {!merchant?.alipay_qr_url && !merchant?.wechat_qr_url && !merchant?.alipay_account && !merchant?.wechatpay_merchant_id && !merchant?.bank_account_info && (
                  <p style={{ color: "#7a8499", fontSize: 13 }}>商家暂未设置收款信息，请联系商家</p>
                )}
              </div>

              <p style={{ fontSize: 13, color: "#586276", marginBottom: 16 }}>
                请用支付宝或微信扫描上方二维码，转账 <strong>{money(createdOrder.total_amount)}</strong>，<br />付款完成后点击下方按钮获取产品。
              </p>

              {error && <div className="form-error">{error}</div>}

              <button className="primary-button pay-btn" onClick={handleConfirmPayment} disabled={confirming}>
                {confirming ? "确认中…" : "我已完成付款，查看产品"}
              </button>
            </>
          ) : (
            <>
              <h1>付款已确认</h1>
              <p style={{ color: "#166534", margin: "12px 0" }}>订单已完成，产品已送达。</p>

              {createdOrder.product?.deliverable_url && (
                <div className="deliverable-card">
                  <h3>收货消息</h3>
                  <p style={{ fontSize: 14, color: "#586276", marginBottom: 8 }}>您的产品链接如下，点击立即使用：</p>
                  <a href={createdOrder.product.deliverable_url} target="_blank" rel="noopener noreferrer" className="deliverable-link">
                    打开产品 →
                  </a>
                </div>
              )}
              {!createdOrder.product?.deliverable_url && (
                <p style={{ color: "#586276", margin: "16px 0" }}>商家暂未设置交付链接，请联系商家获取产品。</p>
              )}

              <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="primary-button" onClick={() => navigate("/dashboard")}>查看订单</button>
                <button className="secondary-button" onClick={() => navigate("/market")}>继续浏览</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="form-card" style={{ maxWidth: 640 }}>
        <button className="back-link" onClick={() => navigate(-1)} style={{ marginBottom: 16, background: "none", border: "none", cursor: "pointer" }}>← 返回</button>
        <h1>确认订单</h1>
        <p className="form-subtitle">填写信息后即可下单</p>

        <div className="order-product-summary">
          <strong>{product.title}</strong>
          <div>
            <span>{product.merchant.display_name}</span>
            <span className="dot">·</span>
            <span>{money(product.price_from)}</span>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>您的姓名 *</label>
          <input required value={form.buyer_name} onChange={update("buyer_name")} placeholder="姓名或公司名称" />

          <label>联系方式 *</label>
          <input required value={form.buyer_contact} onChange={update("buyer_contact")} placeholder="手机号或邮箱" />

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
