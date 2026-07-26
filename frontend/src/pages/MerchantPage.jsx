import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

const DELIVERY_LABELS = {
  digital_good: "数字商品",
  subscription: "订阅服务",
  project_service: "项目服务",
  consulting: "咨询服务",
};

export default function MerchantPage() {
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  const [productForm, setProductForm] = useState({
    title: "",
    summary: "",
    category_id: "",
    delivery_type: "project_service",
    price_from: "",
    delivery_days: "7",
    contact_wechat: "",
    contact_phone: "",
    contact_qq: "",
    display_url: "",
    images: "",
    deliverable_url: "",
  });
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState("");
  const [productSuccess, setProductSuccess] = useState("");

  const [paymentInfo, setPaymentInfo] = useState({
    alipay_account: "",
    wechatpay_merchant_id: "",
    bank_account_info: "",
    alipay_qr_url: "",
    wechat_qr_url: "",
  });
  const [paymentInfoSaving, setPaymentInfoSaving] = useState(false);
  const [paymentInfoMsg, setPaymentInfoMsg] = useState("");

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
      const r = await apiFetch("/api/merchant-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "提交失败"); return; }
      setForm({ display_name: "", industry_category: "", business_scope: "" });
      setShowForm(false);
      setSuccess("入驻申请已提交！等待平台审核。");
      const r2 = await apiFetch("/api/merchant-applications");
      if (r2.ok) setApps(await r2.json());
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!token) return;
    apiFetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => {
        setUser(u);
        if (u?.merchant_id) {
          apiFetch(`/api/merchants/${u.merchant_id}`)
            .then((r) => r.ok ? r.json() : null)
            .then((m) => {
              if (m) setPaymentInfo({
                alipay_account: m.alipay_account || "",
                wechatpay_merchant_id: m.wechatpay_merchant_id || "",
                bank_account_info: m.bank_account_info || "",
                alipay_qr_url: m.alipay_qr_url || "",
                wechat_qr_url: m.wechat_qr_url || "",
              });
            });
        }
      });

    apiFetch("/api/merchant-applications")
      .then((r) => r.ok ? r.json() : [])
      .then(setApps);

    apiFetch("/api/categories")
      .then((r) => r.ok ? r.json() : [])
      .then(setCategories);
  }, [token]);

  const handlePaymentInfoSave = async () => {
    setPaymentInfoSaving(true); setPaymentInfoMsg("");
    try {
      const r = await apiFetch(`/api/merchants/${user.merchant_id}/payment-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentInfo),
      });
      if (r.ok) {
        setPaymentInfoMsg("收款信息已保存");
      } else {
        const d = await r.json();
        setPaymentInfoMsg(`保存失败: ${d.detail}`);
      }
    } catch { setPaymentInfoMsg("网络错误"); }
    finally { setPaymentInfoSaving(false); }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setProductError(""); setProductSuccess(""); setProductLoading(true);
    try {
      const r = await apiFetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: user.merchant_id,
          category_id: Number(productForm.category_id),
          title: productForm.title,
          summary: productForm.summary,
          delivery_type: productForm.delivery_type,
          price_from: Number(productForm.price_from),
          delivery_days: Number(productForm.delivery_days),
          contact_wechat: productForm.contact_wechat,
          contact_phone: productForm.contact_phone,
          contact_qq: productForm.contact_qq,
          display_url: productForm.display_url || null,
          images: productForm.images || null,
          deliverable_url: productForm.deliverable_url || null,
        }),
      });
      const data = await r.json();
      if (!r.ok) { setProductError(data.detail || "发布失败"); return; }
      setProductSuccess(`商品「${data.title}」发布成功！`);
      setProductForm({ title: "", summary: "", category_id: "", delivery_type: "project_service", price_from: "", delivery_days: "7", contact_wechat: "", contact_phone: "", contact_qq: "", display_url: "", images: "", deliverable_url: "" });
    } catch { setProductError("网络错误"); }
    finally { setProductLoading(false); }
  };

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
                  await apiFetch(`/api/merchant-applications/${app.id}/submit`, {
                    method: "POST",
                  });
                  window.location.reload();
                }}>提交审核</button>
              )}
            </div>
          ))}
        </div>
      )}

      {verifiedApp && (
        <>
          <div className="merchant-verified">
            <h2>✓ 商家已认证</h2>
            <p>您的商家已通过平台认证，可以发布商品了。</p>
          </div>

          <div className="form-card" style={{ margin: "24px 7vw" }}>
            <h2 style={{ marginBottom: 4 }}>发布商品</h2>
            <p style={{ color: "#586276", marginBottom: 20 }}>填写商品信息，发布到壬集市场</p>

            {productError && <div className="form-error">{productError}</div>}
            {productSuccess && <div className="form-success">{productSuccess}</div>}

            <form onSubmit={handleProductSubmit}>
              <div className="form-field" style={{ marginTop: 0 }}>
                <label>商品名称 *</label>
                <input required value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value })} placeholder="例如：品牌VI设计套餐" />
              </div>
              <div className="form-field">
                <label>商品简介 *</label>
                <textarea required value={productForm.summary} onChange={(e) => setProductForm({ ...productForm, summary: e.target.value })} placeholder="简要描述商品的核心卖点和交付内容" rows={3} />
              </div>
              <div className="form-field">
                <label>商品分类 *</label>
                <select required value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
                  <option value="">请选择分类</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>交付类型 *</label>
                <select required value={productForm.delivery_type} onChange={(e) => setProductForm({ ...productForm, delivery_type: e.target.value })}>
                  {Object.entries(DELIVERY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>起售价 (元) *</label>
                  <input required type="number" min="1" step="0.01" value={productForm.price_from} onChange={(e) => setProductForm({ ...productForm, price_from: e.target.value })} placeholder="0.00" />
                </div>
                <div className="form-field">
                  <label>交付周期 (天) *</label>
                  <input required type="number" min="1" max="365" value={productForm.delivery_days} onChange={(e) => setProductForm({ ...productForm, delivery_days: e.target.value })} />
                </div>
              </div>
              <div className="form-field">
                <label>联系方式（方便客户直接对接）</label>
                <div className="form-row" style={{ marginTop: 4 }}>
                  <input value={productForm.contact_wechat} onChange={(e) => setProductForm({ ...productForm, contact_wechat: e.target.value })} placeholder="微信号" />
                  <input value={productForm.contact_phone} onChange={(e) => setProductForm({ ...productForm, contact_phone: e.target.value })} placeholder="手机号" />
                  <input value={productForm.contact_qq} onChange={(e) => setProductForm({ ...productForm, contact_qq: e.target.value })} placeholder="QQ号" />
                </div>
              </div>
              <div className="form-field">
                <label>展示链接（选填）</label>
                <input value={productForm.display_url} onChange={(e) => setProductForm({ ...productForm, display_url: e.target.value })} placeholder="产品官网或案例链接，如 https://example.com" />
              </div>
              <div className="form-field">
                <label>产品实拍图（选填，每行一个图片URL）</label>
                <textarea rows={3} value={productForm.images} onChange={(e) => setProductForm({ ...productForm, images: e.target.value })} placeholder={`https://example.com/photo1.jpg
https://example.com/photo2.jpg
https://example.com/photo3.jpg`} />
                {productForm.images && (
                  <div className="image-preview-row">
                    {productForm.images.split("\n").filter(Boolean).map((url, i) => (
                      <img key={i} src={url.trim()} alt={`商品图 ${i + 1}`} className="image-preview-thumb" onError={(e) => { e.target.style.display = "none"; }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="form-field">
                <label>交付链接（选填，买家付款后可见）</label>
                <input value={productForm.deliverable_url} onChange={(e) => setProductForm({ ...productForm, deliverable_url: e.target.value })} placeholder="付款后买家可访问的产品链接" />
              </div>
              <div className="form-actions" style={{ marginTop: 20 }}>
                <button type="submit" className="primary-button" disabled={productLoading}>
                  {productLoading ? "发布中…" : "发布商品"}
                </button>
              </div>
            </form>
          </div>

          <div className="form-card" style={{ margin: "24px 7vw" }}>
            <h2 style={{ marginBottom: 4 }}>收款信息</h2>
            <p style={{ color: "#586276", marginBottom: 20 }}>设置收款账户，用于接收订单放款</p>

            {paymentInfoMsg && (
              <div className={paymentInfoMsg.includes("失败") || paymentInfoMsg.includes("错误") ? "form-error" : "form-success"}>
                {paymentInfoMsg}
              </div>
            )}

            <div className="form-field" style={{ marginTop: 0 }}>
              <label>支付宝账号</label>
              <input value={paymentInfo.alipay_account} onChange={(e) => setPaymentInfo({ ...paymentInfo, alipay_account: e.target.value })} placeholder="手机号或邮箱" />
            </div>
            <div className="form-field">
              <label>微信支付商户号</label>
              <input value={paymentInfo.wechatpay_merchant_id} onChange={(e) => setPaymentInfo({ ...paymentInfo, wechatpay_merchant_id: e.target.value })} placeholder="微信商户号（选填）" />
            </div>
            <div className="form-field">
              <label>银行账户信息（备选）</label>
              <textarea rows={2} value={paymentInfo.bank_account_info} onChange={(e) => setPaymentInfo({ ...paymentInfo, bank_account_info: e.target.value })} placeholder="开户行、账号、户名（选填）" />
            </div>
            <div className="form-field">
              <label>支付宝收款码</label>
              {paymentInfo.alipay_qr_url ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={paymentInfo.alipay_qr_url} alt="支付宝收款码" style={{ width: 140, height: 140, objectFit: "contain", border: "1px solid #d9dfeb", borderRadius: 10, display: "block" }} />
                  <button type="button" onClick={() => setPaymentInfo({ ...paymentInfo, alipay_qr_url: "" })} style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, lineHeight: "22px", textAlign: "center", padding: 0 }}>×</button>
                </div>
              ) : (
                <label className="upload-btn">
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                      const r = await apiFetch("/api/upload", { method: "POST", body: formData });
                      const data = await r.json();
                      if (r.ok) setPaymentInfo({ ...paymentInfo, alipay_qr_url: data.url });
                    } catch {}
                  }} />
                  点击上传支付宝收款码
                </label>
              )}
            </div>
            <div className="form-field">
              <label>微信收款码</label>
              {paymentInfo.wechat_qr_url ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={paymentInfo.wechat_qr_url} alt="微信收款码" style={{ width: 140, height: 140, objectFit: "contain", border: "1px solid #d9dfeb", borderRadius: 10, display: "block" }} />
                  <button type="button" onClick={() => setPaymentInfo({ ...paymentInfo, wechat_qr_url: "" })} style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, lineHeight: "22px", textAlign: "center", padding: 0 }}>×</button>
                </div>
              ) : (
                <label className="upload-btn">
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                      const r = await apiFetch("/api/upload", { method: "POST", body: formData });
                      const data = await r.json();
                      if (r.ok) setPaymentInfo({ ...paymentInfo, wechat_qr_url: data.url });
                    } catch {}
                  }} />
                  点击上传微信收款码
                </label>
              )}
            </div>
            <div className="form-actions" style={{ marginTop: 12 }}>
              <button className="primary-button" onClick={handlePaymentInfoSave} disabled={paymentInfoSaving}>
                {paymentInfoSaving ? "保存中…" : "保存收款信息"}
              </button>
            </div>
          </div>
        </>
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
