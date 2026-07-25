import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-col">
          <h4>OPC 市场</h4>
          <Link to="/market">浏览商品</Link>
          <Link to="/content/market-layer">市场层</Link>
          <Link to="/content/fulfillment-layer">履约层</Link>
          <Link to="/merchant">商家入驻</Link>
        </div>
        <div className="footer-col">
          <h4>商家服务</h4>
          <Link to="/merchant">申请入驻</Link>
          <Link to="/content/sales-crm">销售 CRM</Link>
          <Link to="/content/marketing-content">营销与内容</Link>
          <Link to="/content/supply-chain">供应链协同</Link>
        </div>
        <div className="footer-col">
          <h4>经营管家</h4>
          <Link to="/content/finance-management">财务与经营</Link>
          <Link to="/content/project-fulfillment">项目与履约</Link>
          <Link to="/content/ai-agent-center">AI Agent 中心</Link>
          <Link to="/content/management-layer">管理层</Link>
        </div>
        <div className="footer-col">
          <h4>关于我们</h4>
          <Link to="/content/ecosystem-layer">生态层</Link>
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>关于壬集</a>
          <Link to="/register">注册账号</Link>
          <Link to="/login">登录</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2024 壬镜科技 RENJI. All rights reserved. 津ICP备XXXXXXXX号</p>
      </div>
    </footer>
  );
}
