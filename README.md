# 壬集 OPC 平台 MVP

**品牌建议：壬集 RENJI**  
口号：**一人一店，万企成市。**

这是一个面向 OPC（一人公司）的双边交易平台与经营管理系统 MVP，适合作为壬镜科技后续使用 Codex 持续开发的基础代码。

## 当前包含

- OPC 社区、商家、商品分类和商品展示
- 标准商品、订阅软件、项目服务、咨询服务等交付类型
- 里程碑订单
- 模拟支付冻结、验收后分阶段释放
- 争议发起后暂停放款
- 平台服务费计算
- 商家端和平台端可扩展的数据模型
- React 前端首页
- FastAPI 后端和自动生成的 OpenAPI 文档
- SQLite 本地运行；Docker Compose 可切换 PostgreSQL
- 微信支付/支付宝平台型支付适配器预留接口

> 重要：代码中的 MockPaymentProvider 只模拟支付状态，不处理真实资金。
> 正式上线时，应接入持牌支付机构的平台收付、分账、延期结算等产品，
> 不得将买家资金直接沉淀在壬镜科技普通银行账户中。

## 一键启动

### 方式一：本地快速运行

后端：

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

前端：

```bash
cd frontend
npm install
npm run dev
```

打开：

- 前端：http://localhost:5173
- API 文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

### 方式二：Docker Compose

```bash
docker compose up --build
```

## 演示流程

1. 首页查看 OPC 服务商品。
2. 调用 `POST /api/orders` 创建订单并设置里程碑。
3. 调用 `POST /api/orders/{order_id}/pay` 模拟买家付款，资金进入“冻结”状态。
4. 调用 `POST /api/milestones/{milestone_id}/submit` 提交阶段成果。
5. 调用 `POST /api/milestones/{milestone_id}/accept` 验收并释放该阶段资金。
6. 有争议时调用 `POST /api/milestones/{milestone_id}/dispute`，订单暂停放款。

## 推荐正式架构

MVP 阶段坚持“模块化单体”，避免过早拆分微服务：

- Web：Next.js 或 React
- API：FastAPI
- 数据库：PostgreSQL
- 缓存与任务：Redis
- 文件：S3/OSS/COS/MinIO
- 搜索：PostgreSQL Full Text，规模扩大后接 OpenSearch
- 支付：微信支付平台收付通、支付宝互联网平台型支付产品或银行存管
- 电子签：接入合规电子签服务商
- 发票：接入税务数字账户或合规开票服务
- 监控：OpenTelemetry + Prometheus + Grafana

## Codex 开发顺序

详见：

- `docs/product-blueprint.md`
- `docs/codex-prompts.md`
- `docs/payment-integration.md`
