import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

const deliveryLabels = {
  digital_good: "数字商品",
  subscription: "订阅软件",
  project_service: "项目服务",
  consulting: "专业咨询",
  api_resource: "API / 算力",
  training: "培训课程",
  physical_or_hybrid: "实物 / 综合交付"
};

function money(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency", currency: "CNY"
  }).format(Number(value));
}

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      apiFetch("/api/categories").then((r) => r.json()),
      apiFetch("/api/products").then((r) => r.json()),
    ])
      .then(([cats, prods]) => { setCategories(cats); setProducts(prods); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const cm = !activeCategory || p.category.slug === activeCategory;
        const km =
          !keyword ||
          p.title.toLowerCase().includes(keyword.toLowerCase()) ||
          p.summary.toLowerCase().includes(keyword.toLowerCase());
        return cm && km;
      }),
    [products, activeCategory, keyword]
  );

  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">OPC MARKETPLACE + BUSINESS OS</span>
          <h1>一人一店，万企成市。</h1>
          <p>
            汇聚全国 OPC 社区、产品与专业服务，为一人公司提供获客、
            交易、履约、结算、客户、财务和经营协同的一站式基础设施。
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => {
              document.getElementById("market")?.scrollIntoView({ behavior: "smooth" });
            }}>寻找 OPC 服务</button>
            <button className="secondary-button" onClick={() => navigate("/merchant")}>
              申请商家入驻
            </button>
          </div>
        </div>
        <div className="hero-panel">
          <div className="clickable-layer" onClick={() => navigate("/content/market-layer")}>
            <strong>市场层</strong><span>店铺 · 商品 · 搜索 · 评价</span>
          </div>
          <div className="clickable-layer" onClick={() => navigate("/content/fulfillment-layer")}>
            <strong>履约层</strong><span>合同 · 里程碑 · 验收 · 争议</span>
          </div>
          <div className="clickable-layer" onClick={() => navigate("/content/management-layer")}>
            <strong>管理层</strong><span>CRM · 财务 · 供应链 · Agent</span>
          </div>
          <div className="clickable-layer" onClick={() => navigate("/content/ecosystem-layer")}>
            <strong>生态层</strong><span>城市社区 · 高校 · 园区 · 链主</span>
          </div>
        </div>
      </section>

      <section id="market" className="market-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">OPC 服务市场</span>
            <h2>按业务需求找产品，按交付方式控风险</h2>
          </div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索 AI 智能体、广告设计、财税服务……"
          />
        </div>

        <div className="category-row">
          <button className={!activeCategory ? "active" : ""} onClick={() => setActiveCategory("")}>全部</button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={activeCategory === cat.slug ? "active" : ""}
              onClick={() => setActiveCategory(cat.slug)}
            >{cat.name}</button>
          ))}
        </div>

        {loading ? (
          <div className="empty">正在加载壬集商品……</div>
        ) : filtered.length === 0 ? (
          <div className="empty">暂无匹配商品</div>
        ) : (
          <div className="product-grid">
            {filtered.map((product) => (
              <article
                key={product.id}
                className="product-card clickable"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="card-topline">
                  <span>{product.category.name}</span>
                  {product.merchant.verified && <b>已认证</b>}
                </div>
                <h3>{product.title}</h3>
                <p>{product.summary}</p>
                <div className="tags">
                  <span>{deliveryLabels[product.delivery_type]}</span>
                  <span>{product.delivery_days} 天交付</span>
                  {product.ai_generated_content && <span>含 AI 生成内容</span>}
                </div>
                <footer>
                  <div>
                    <small>{product.merchant.display_name}</small>
                    <strong>{money(product.price_from)} 起</strong>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}>查看方案</button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="manager" className="feature-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">壬集经营管家</span>
            <h2>让 OPC 创始人只盯核心业务</h2>
          </div>
        </div>
        <div className="feature-grid">
          {[
            ["销售与 CRM", "线索、商机、报价、合同、回款和复购提醒", "sales-crm"],
            ["项目与履约", "任务、里程碑、交付物、验收、SLA 和争议", "project-fulfillment"],
            ["财务与经营", "收入、成本、现金流、应收、发票和利润看板", "finance-management"],
            ["营销与内容", "品牌素材、广告投放、私域内容和渠道归因", "marketing-content"],
            ["供应链协同", "供应商、采购需求、外包任务和交付评价", "supply-chain"],
            ["AI Agent 中心", "客服、销售助理、项目助理和财务助理工作流", "ai-agent-center"],
          ].map(([title, desc, slug]) => (
            <div className="feature-card clickable-card" key={title} onClick={() => navigate(`/content/${slug}`)}>
              <strong>{title}</strong>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="communities" className="community-section">
        <span className="eyebrow">全国社区联盟</span>
        <h2>平台统一底座，城市节点独立运营</h2>
        <p>
          每个 OPC 社区拥有独立主页、认证标识、服务资源、政策专区、
          招商数据和分成规则；壬集提供统一商品、订单、评价、履约与数据接口。
        </p>
      </section>
    </>
  );
}
