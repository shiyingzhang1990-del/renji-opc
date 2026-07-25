import os
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import hash_password
from .models import (
    Category,
    Community,
    Merchant,
    Product,
    ProductDeliveryType,
    User,
    UserRole,
)


def ensure_admin(db: Session) -> None:
    """Create a super_admin user if none exists, and ensure existing admin keeps super_admin role."""
    admin_email = os.getenv("ADMIN_EMAIL", "admin@renji-opc.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "renji-admin-2024")

    admin = db.scalar(select(User).where(User.email == admin_email).limit(1))
    if admin is not None:
        if admin.role != UserRole.SUPER_ADMIN:
            admin.role = UserRole.SUPER_ADMIN
            db.commit()
        return

    existing = db.scalar(select(User).where(User.role == UserRole.SUPER_ADMIN).limit(1))
    if existing is not None:
        return

    admin = User(
        email=admin_email,
        hashed_password=hash_password(admin_password),
        display_name="壬集管理员",
        role=UserRole.SUPER_ADMIN,
        is_active=True,
    )
    db.add(admin)
    db.commit()


def seed_data(db: Session) -> None:
    ensure_admin(db)

    if db.scalar(select(Category.id).limit(1)) is not None:
        return

    categories = [
        Category(name="品牌与广告设计", slug="brand-design", description="品牌、海报、视频、AIGC 创意", sort_order=10),
        Category(name="软件与 AI 智能体", slug="software-ai", description="SaaS、Agent、自动化与定制开发", sort_order=20),
        Category(name="财税与企业服务", slug="finance-tax", description="财务软件、代理记账、预算与税务", sort_order=30),
        Category(name="销售与客户运营", slug="sales-crm", description="获客、私域、客服、CRM 与销售外包", sort_order=40),
        Category(name="供应链与采购", slug="supply-chain", description="供应商匹配、采购、履约和协同", sort_order=50),
        Category(name="法律、知识产权与合规", slug="legal-ip", description="合同、商标、版权、数据与 AI 合规", sort_order=60),
        Category(name="管理咨询", slug="consulting", description="战略、组织、内控、风控与商业计划", sort_order=70),
        Category(name="教育培训与知识产品", slug="education", description="课程、模板、报告和知识订阅", sort_order=80),
    ]

    communities = [
        Community(name="壬镜科技 OPC 社区", city="天津", operator_name="壬镜科技", verified=True),
        Community(name="华东 OPC 联盟节点", city="上海", operator_name="示例运营方", verified=True),
    ]

    db.add_all(categories + communities)
    db.flush()

    merchants = [
        Merchant(
            company_name="天津市滨海新区壬镜人工智能科技有限责任公司",
            display_name="壬镜科技",
            unified_social_credit_code="DEMO000000000001",
            community_id=communities[0].id,
            verified=True,
            service_score=Decimal("5.00"),
        ),
        Merchant(
            company_name="示例一人广告设计有限公司",
            display_name="一人创意局",
            unified_social_credit_code="DEMO000000000002",
            community_id=communities[1].id,
            verified=True,
            service_score=Decimal("4.86"),
        ),
        Merchant(
            company_name="示例智能财务软件有限公司",
            display_name="轻账 OPC",
            unified_social_credit_code="DEMO000000000003",
            community_id=communities[0].id,
            verified=True,
            service_score=Decimal("4.92"),
        ),
    ]

    db.add_all(merchants)
    db.flush()

    products = [
        Product(
            merchant_id=merchants[1].id,
            category_id=categories[0].id,
            title="AI 品牌视觉全案",
            summary="包含品牌定位梳理、Logo 方向、主视觉和五套社交媒体模板，按三个里程碑交付。",
            delivery_type=ProductDeliveryType.PROJECT_SERVICE,
            price_from=Decimal("4999.00"),
            delivery_days=14,
            ai_generated_content=True,
        ),
        Product(
            merchant_id=merchants[2].id,
            category_id=categories[2].id,
            title="OPC 智能财务与现金流看板",
            summary="面向一人公司的收入、成本、应收、开票和现金流管理 SaaS，可按月订阅。",
            delivery_type=ProductDeliveryType.SUBSCRIPTION,
            price_from=Decimal("199.00"),
            delivery_days=1,
            ai_generated_content=False,
        ),
        Product(
            merchant_id=merchants[0].id,
            category_id=categories[6].id,
            title="OPC 商业闭环诊断与增长方案",
            summary="围绕产品化、获客、报价、履约、复购和平台化设计，交付诊断报告与实施路线图。",
            delivery_type=ProductDeliveryType.CONSULTING,
            price_from=Decimal("2999.00"),
            delivery_days=7,
            ai_generated_content=False,
        ),
        Product(
            merchant_id=merchants[0].id,
            category_id=categories[1].id,
            title="企业专属 AI Agent 工作流搭建",
            summary="根据业务场景搭建知识库、任务编排、审核节点和自动化工作流，支持阶段验收。",
            delivery_type=ProductDeliveryType.PROJECT_SERVICE,
            price_from=Decimal("9999.00"),
            delivery_days=21,
            ai_generated_content=True,
        ),
    ]
    db.add_all(products)
    db.commit()
