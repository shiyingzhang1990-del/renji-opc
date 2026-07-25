const content = {
  "market-layer": {
    slug: "market-layer",
    title: "市场层 — 店铺 · 商品 · 搜索 · 评价",
    subtitle: "连接 OPC 供给与需求的基础交易层",
    description: [
      "壬集 OPC 市场层是平台的核心交易基础设施，为一人公司提供标准化的店铺搭建、商品发布、智能搜索和评价体系。",
      "每个 OPC 商家都可以创建自己的品牌店铺，上架数字商品、订阅软件、项目服务、专业咨询等多种交付类型的商品。",
      "买家可以通过关键词搜索、分类筛选、交付方式过滤，快速找到合适的 OPC 服务商。交易完成后，双方可以进行双向评价，构建真实可信的信用体系。"
    ],
    capabilities: [
      { title: "品牌店铺", desc: "每个商家拥有独立的品牌主页，展示服务能力、案例和评价" },
      { title: "智能搜索", desc: "支持关键词、分类、交付类型等多维度筛选" },
      { title: "商品发布", desc: "支持数字商品、订阅、项目服务等7种交付类型" },
      { title: "评价体系", desc: "双向评价 + 服务评分，构建可信交易环境" }
    ],
    relatedLinks: [
      { label: "进入 OPC 市场", to: "/market" },
      { label: "申请商家入驻", to: "/merchant" }
    ]
  },
  "fulfillment-layer": {
    slug: "fulfillment-layer",
    title: "履约层 — 合同 · 里程碑 · 验收 · 争议",
    subtitle: "保障交易安全与交付质量的核心履约体系",
    description: [
      "履约层为 OPC 交易提供完整的合同管理、里程碑拆分、验收确认和争议调解机制。每个订单都可以拆分为多个里程碑，按阶段交付和付款，降低双方风险。",
      "商家完成每个里程碑后提交交付物，买家验收确认后平台释放该阶段的款项。这种渐进式交付模式让买卖双方都能安心交易。",
      "当出现争议时，平台提供多方调解机制，根据合同快照、交付记录和沟通历史进行公正裁决。"
    ],
    capabilities: [
      { title: "里程碑拆分", desc: "将订单拆分为多个阶段，按序交付和付款" },
      { title: "合同快照", desc: "订单确认时自动生成合同快照，保障双方权益" },
      { title: "验收确认", desc: "买家逐项验收交付物，满意后再放款" },
      { title: "争议调解", desc: "出现分歧时启动平台调解，保障公平公正" }
    ],
    relatedLinks: [
      { label: "浏览市场商品", to: "/market" },
      { label: "了解 AI Agent 中心", to: "/content/ai-agent-center" }
    ]
  },
  "management-layer": {
    slug: "management-layer",
    title: "管理层 — CRM · 财务 · 供应链 · Agent",
    subtitle: "为 OPC 创始人提供一站式经营管理工具",
    description: [
      "管理层为一人公司提供从线索获取到回款管理的完整经营工具链。不需要多套独立软件，壬集平台内置 CRM、财务管理、供应链协同和 AI 助手。",
      "OPC 创始人可以在一个平台内管理客户关系、跟踪销售线索、生成报价单、管理合同回款，并实时查看收入、成本和利润看板。",
      "平台还集成了 AI Agent 中心，提供智能客服、销售助理、项目助理和财务助理等自动化工作流，帮助创始人聚焦核心业务。"
    ],
    capabilities: [
      { title: "销售 CRM", desc: "线索管理、商机跟踪、报价、合同和回款提醒" },
      { title: "财务看板", desc: "收入、成本、现金流、应收、发票和利润分析" },
      { title: "供应链协同", desc: "供应商管理、采购需求和外包任务协同" },
      { title: "AI Agent", desc: "智能客服、销售助理、项目助理工作流" }
    ],
    relatedLinks: [
      { label: "销售与 CRM", to: "/content/sales-crm" },
      { label: "财务与经营", to: "/content/finance-management" }
    ]
  },
  "ecosystem-layer": {
    slug: "ecosystem-layer",
    title: "生态层 — 城市社区 · 高校 · 园区 · 链主",
    subtitle: "平台统一底座，城市节点独立运营",
    description: [
      "壬集采用「平台 + 城市节点」的双层架构。平台提供统一的技术底座、交易规则、支付结算和数据接口；城市社区节点由本地运营方独立运营，拥有自己的主页、认证标识和服务资源。",
      "每个城市社区可以管理自己的商家资源、政策专区、招商数据和分成规则。平台与城市节点之间通过标准化 API 接口进行数据和业务协同。",
      "未来将连接高校创新创业中心、产业园区和产业链主企业，形成覆盖全国的 OPC 生态网络。"
    ],
    capabilities: [
      { title: "城市社区", desc: "每个城市拥有独立主页、认证商家和运营规则" },
      { title: "高校合作", desc: "连接高校创业中心，孵化学生 OPC 项目" },
      { title: "园区联动", desc: "与产业园区合作，提供入驻和资源对接" },
      { title: "链主协同", desc: "产业链主企业可发布需求，匹配 OPC 供应商" }
    ],
    relatedLinks: [
      { label: "申请商家入驻", to: "/merchant" },
      { label: "供应链协同", to: "/content/supply-chain" }
    ]
  },
  "sales-crm": {
    slug: "sales-crm",
    title: "销售与 CRM",
    subtitle: "线索、商机、报价、合同、回款和复购提醒",
    description: [
      "壬集销售与 CRM 模块为 OPC 创始人提供轻量但完整的客户关系管理能力。不需要学习复杂的 CRM 系统，专注于一人公司的实际销售场景。",
      "从潜在客户线索的捕获和整理开始，系统帮助您跟踪每个商机的进展阶段，自动生成专业报价单，管理与客户的合同签署流程。",
      "回款管理和复购提醒功能确保您不会错过任何收入机会。系统自动追踪合同到期和回款节点，在关键时间点发送提醒。"
    ],
    capabilities: [
      { title: "线索管理", desc: "捕获、整理和分类潜在客户线索，支持手动录入和表单接入" },
      { title: "商机管道", desc: "可视化的销售管道，跟踪每个商机从初步接触到成交的全过程" },
      { title: "报价管理", desc: "快速生成标准化报价单，支持自定义条款和定价" },
      { title: "合同管理", desc: "合同创建、签署跟踪和到期提醒" },
      { title: "回款追踪", desc: "跟踪每笔回款状态，自动提醒逾期款项" },
      { title: "复购提醒", desc: "基于历史交易数据，智能识别复购机会并推送提醒" }
    ],
    relatedLinks: [
      { label: "财务与经营", to: "/content/finance-management" },
      { label: "项目与履约", to: "/content/project-fulfillment" }
    ]
  },
  "project-fulfillment": {
    slug: "project-fulfillment",
    title: "项目与履约",
    subtitle: "任务、里程碑、交付物、验收、SLA 和争议",
    description: [
      "项目与履约模块是壬集平台的核心差异化功能。它将每个订单转化为可管理的项目，通过里程碑拆分、交付物管理和验收流程，确保项目按时按质完成。",
      "商家可以将大项目拆分为多个小里程碑，每个里程碑对应明确的交付物和付款金额。买家逐项验收，满意后才释放该阶段的款项，极大降低了双方的风险。",
      "系统内置 SLA（服务水平协议）追踪和争议处理机制。当交付延期或质量不达标时，系统自动触发预警并提供标准化的争议调解流程。"
    ],
    capabilities: [
      { title: "任务拆分", desc: "将订单分解为可管理的任务和子任务" },
      { title: "里程碑管理", desc: "设定关键节点，关联交付物和付款条件" },
      { title: "交付物提交", desc: "商家上传交付物，系统自动通知买家验收" },
      { title: "验收流程", desc: "买家逐项验收，支持通过/驳回/修改三种操作" },
      { title: "SLA 追踪", desc: "监控交付时间和质量标准，自动触发预警" },
      { title: "争议处理", desc: "标准化争议流程，平台调解保障双方权益" }
    ],
    relatedLinks: [
      { label: "浏览市场商品", to: "/market" },
      { label: "AI Agent 中心", to: "/content/ai-agent-center" }
    ]
  },
  "finance-management": {
    slug: "finance-management",
    title: "财务与经营",
    subtitle: "收入、成本、现金流、应收、发票和利润看板",
    description: [
      "财务与经营管理模块帮助 OPC 创始人实时掌握公司的财务状况和经营表现。不需要专业的财务背景，系统自动汇总交易数据，生成直观的经营看板和财务报表。",
      "收入看板展示各渠道、各商品和各时间段的收入分布；成本追踪帮助您了解每项业务的投入产出比；现金流预测让您提前做好资金规划。",
      "系统还提供应收账款管理、发票开具和利润分析等高级功能，支持与主流财务软件的数据对接。"
    ],
    capabilities: [
      { title: "收入看板", desc: "多维度收入分析：按商品、客户、时间段自动汇总" },
      { title: "成本追踪", desc: "记录直接成本和间接费用，计算每单利润" },
      { title: "现金流", desc: "实时现金流监控和未来90天预测" },
      { title: "应收管理", desc: "应收账款自动追踪和逾期提醒" },
      { title: "发票管理", desc: "支持电子发票开具和管理" },
      { title: "利润分析", desc: "多维度利润报表和经营健康度评分" }
    ],
    relatedLinks: [
      { label: "销售与 CRM", to: "/content/sales-crm" },
      { label: "供应链协同", to: "/content/supply-chain" }
    ]
  },
  "marketing-content": {
    slug: "marketing-content",
    title: "营销与内容",
    subtitle: "品牌素材、广告投放、私域内容和渠道归因",
    description: [
      "营销与内容模块帮助 OPC 商家提升品牌影响力和获客效率。从品牌基础素材的创建和管理，到多渠道广告投放和内容营销，再到效果归因分析，形成完整的营销闭环。",
      "您可以在平台内创建和管理品牌素材库，生成社交媒体内容模板，规划私域运营策略。系统还支持广告投放的渠道归因分析，帮助您了解每个获客渠道的投入产出比。"
    ],
    capabilities: [
      { title: "品牌素材库", desc: "集中管理 Logo、海报、视频等品牌资产" },
      { title: "内容模板", desc: "快速生成社交媒体、公众号、小红书等内容模板" },
      { title: "私域运营", desc: "客户分组、内容推送和互动管理" },
      { title: "渠道归因", desc: "跟踪各渠道获客效果，计算 ROI" }
    ],
    relatedLinks: [
      { label: "销售与 CRM", to: "/content/sales-crm" },
      { label: "浏览 OPC 市场", to: "/market" }
    ]
  },
  "supply-chain": {
    slug: "supply-chain",
    title: "供应链协同",
    subtitle: "供应商、采购需求、外包任务和交付评价",
    description: [
      "供应链协同模块为 OPC 商家提供供应商管理和任务外包能力。当您接到超出自身体量的项目时，可以通过平台寻找合适的合作伙伴，将部分工作外包出去。",
      "供应商管理功能帮助您维护合格供应商名录，记录每次合作的质量评价。采购需求发布后，匹配的供应商可以主动响应。系统还支持外包任务的进度追踪和交付验收。"
    ],
    capabilities: [
      { title: "供应商管理", desc: "维护合格供应商名录，记录合作历史和评价" },
      { title: "采购需求", desc: "发布采购或外包需求，匹配合格供应商" },
      { title: "外包协同", desc: "任务分配、进度追踪和交付验收" },
      { title: "质量评价", desc: "对供应商的交付质量、时效和服务进行评分" }
    ],
    relatedLinks: [
      { label: "项目与履约", to: "/content/project-fulfillment" },
      { label: "生态层", to: "/content/ecosystem-layer" }
    ]
  },
  "ai-agent-center": {
    slug: "ai-agent-center",
    title: "AI Agent 中心",
    subtitle: "客服、销售助理、项目助理和财务助理工作流",
    description: [
      "AI Agent 中心是壬集平台为 OPC 创始人提供的智能助手集合。通过可配置的 Agent 工作流，您可以自动处理重复性工作，将精力集中在高价值的核心业务上。",
      "每个 Agent 都针对 OPC 的具体场景设计：客服 Agent 自动回答常见问题并引导客户下单；销售助理 Agent 跟踪线索并发送个性化跟进消息；项目助理 Agent 监控里程碑进度并发送提醒；财务助理 Agent 自动生成报表和发票。"
    ],
    capabilities: [
      { title: "客服 Agent", desc: "7×24 自动回答客户问题，智能引导下单" },
      { title: "销售助理", desc: "自动跟踪线索、发送个性化消息、提醒跟进" },
      { title: "项目助理", desc: "监控里程碑节点，自动发送进度提醒" },
      { title: "财务助理", desc: "自动生成对账单、发票和经营报表" },
      { title: "知识库配置", desc: "为 Agent 配置业务知识库，提升回答准确度" },
      { title: "人工接管", desc: "复杂问题自动转交人工处理，无缝衔接" }
    ],
    relatedLinks: [
      { label: "项目与履约", to: "/content/project-fulfillment" },
      { label: "财务与经营", to: "/content/finance-management" }
    ]
  }
};

export default content;
