import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
const deliveryLabels = {
  digital_good: "数字商品", subscription: "订阅软件",
  project_service: "项目服务", consulting: "专业咨询",
  api_resource: "API / 算力", training: "培训课程",
  physical_or_hybrid: "实物 / 综合交付",
};

function money(v) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(Number(v));
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch("/api/products")
      .then((r) => r.json())
      .then((all) => {
        const found = all.find((p) => p.id === Number(id));
        if (found) setProduct(found);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="empty" style={{ padding: 80 }}>加载中…</div>;
  if (!product) return <div className="empty" style={{ padding: 80 }}>商品不存在</div>;

  return (
    <div className="detail-page">
      <button className="back-link" onClick={() => navigate(-1)}>← 返回</button>
      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-meta">
            <span>{product.category.name}</span>
            <span className="dot">·</span>
            <span>{deliveryLabels[product.delivery_type]}</span>
            {product.merchant.verified && <>
              <span className="dot">·</span><b className="verified-badge">已认证</b>
            </>}
          </div>
          <h1>{product.title}</h1>
          <p className="detail-summary">{product.summary}</p>
          <div className="detail-tags">
            <span>{deliveryLabels[product.delivery_type]}</span>
            <span>{product.delivery_days} 天交付</span>
            {product.ai_generated_content && <span>含 AI 生成内容</span>}
          </div>
          <div className="detail-section">
            <h3>商品详情</h3>
            <p>服务对象：个人或企业客户</p>
            <p>交付周期：约 {product.delivery_days} 个工作日</p>
            <p>货币单位：{product.currency}</p>
            {product.ai_generated_content && <p>本商品包含 AI 生成内容，请仔细验收</p>}
            {product.display_url && (
              <p>
                展示链接：{" "}
                <a href={product.display_url} target="_blank" rel="noopener noreferrer" className="display-url-link">
                  {product.display_url}
                </a>
              </p>
            )}
          </div>
        </div>
        <div className="detail-side">
          <div className="side-card">
            <div className="side-price">
              <small>起价</small>
              <strong>{money(product.price_from)}</strong>
            </div>
            <button className="primary-button full"
              onClick={() => {
                const token = localStorage.getItem("token");
                if (!token) { navigate("/login"); return; }
                navigate(`/order/${product.id}`);
              }}
            >立即下单</button>
            <p className="side-note">下单后商家将在 1 个工作日内联系您</p>
          </div>
          <div className="side-card merchant-card">
            <h4>商家信息</h4>
            <p className="merchant-name">{product.merchant.display_name}</p>
            {product.merchant.verified && <span className="verified-badge">✓ 平台已认证</span>}
            <p className="merchant-score">服务评分：{product.merchant.service_score} / 5.00</p>
            {(product.contact_wechat || product.contact_phone || product.contact_qq) && (
              <div className="merchant-contacts">
                {product.contact_wechat && <p>微信：{product.contact_wechat}</p>}
                {product.contact_phone && <p>电话：{product.contact_phone}</p>}
                {product.contact_qq && <p>QQ：{product.contact_qq}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
