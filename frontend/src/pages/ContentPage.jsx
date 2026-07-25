import { useParams, useNavigate, Link } from "react-router-dom";
import content from "../data/content";

export default function ContentPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const data = content[slug];

  if (!data) {
    return (
      <div className="content-page">
        <div className="empty" style={{ padding: 80 }}>
          <h2>页面不存在</h2>
          <p>未找到对应的内容页面</p>
          <button className="primary-button" onClick={() => navigate("/")} style={{ marginTop: 20 }}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-page">
      <button className="back-link" onClick={() => navigate(-1)}>← 返回</button>

      <div className="content-hero">
        <span className="eyebrow">壬集 RENJI</span>
        <h1>{data.title}</h1>
        <p className="content-subtitle">{data.subtitle}</p>
      </div>

      <div className="content-body">
        <div className="content-description">
          {data.description.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className="content-capabilities">
          <h2>核心能力</h2>
          <div className="capability-grid">
            {data.capabilities.map((cap, i) => (
              <div className="capability-card" key={i}>
                <strong>{cap.title}</strong>
                <p>{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {data.relatedLinks && data.relatedLinks.length > 0 && (
          <div className="content-links">
            <h2>相关链接</h2>
            <div className="related-links-row">
              {data.relatedLinks.map((link, i) => (
                <Link key={i} to={link.to} className="related-link-card">
                  {link.label} →
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
