"""Test merchant onboarding: application workflow, review, audit logs.

Uses shared test DB via conftest.py.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

_SEQ = [0]


def _next_email(base="onb"):
    _SEQ[0] += 1
    return f"{base}-{_SEQ[0]}@example.com"


def _register(email, password="Password123!", display_name=None):
    return client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "display_name": display_name or email.split("@")[0],
    })


def _login(email, password="Password123!"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _new_application_payload(company_suffix=""):
    _SEQ[0] += 1
    return {
        "company_name": f"测试科技有限公司{company_suffix}{_SEQ[0]}",
        "display_name": f"测试科技{company_suffix}{_SEQ[0]}",
        "unified_social_credit_code": f"91440101MA{_SEQ[0]:08d}",
        "legal_representative": "张三",
        "contact_phone": "13800138000",
        "contact_email": f"contact{_SEQ[0]}@test.test",
        "registered_address": "北京市海淀区中关村大街1号",
        "business_scope": "软件开发；人工智能技术开发",
        "community_id": None,
        "industry_category": "软件与 AI 智能体",
        "professional_qualifications": "ISO 9001 认证",
        "cases": "曾服务 50+ 客户",
        "receiving_account_identifier": "银行账户尾号8888",
    }


class TestMerchantApplication:
    def test_create_application(self):
        email = _next_email("ma-create")
        _register(email)
        resp = _login(email)
        token = resp.json()["access_token"]
        resp = client.post(
            "/api/merchant-applications/",
            json=_new_application_payload("创建"),
            headers=_auth(token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "draft"
        assert "password" not in str(data.keys())

    def test_list_own_applications(self):
        email = _next_email("ma-list")
        _register(email)
        resp = _login(email)
        token = resp.json()["access_token"]
        client.post(
            "/api/merchant-applications/",
            json=_new_application_payload("列表"),
            headers=_auth(token),
        )
        resp = client.get(
            "/api/merchant-applications/",
            headers=_auth(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    def test_create_application_unauthenticated(self):
        resp = client.post(
            "/api/merchant-applications/",
            json=_new_application_payload("无认证"),
        )
        assert resp.status_code == 401

    def test_cannot_view_other_user_application(self):
        email_a = _next_email("ma-other-a")
        email_b = _next_email("ma-other-b")
        _register(email_a)
        resp = _login(email_a)
        token_a = resp.json()["access_token"]
        _register(email_b)
        resp = _login(email_b)
        token_b = resp.json()["access_token"]
        resp = client.post(
            "/api/merchant-applications/",
            json=_new_application_payload("其他"),
            headers=_auth(token_a),
        )
        app_id = resp.json()["id"]
        resp = client.get(
            f"/api/merchant-applications/{app_id}",
            headers=_auth(token_b),
        )
        assert resp.status_code == 403

    def test_submit_and_review_workflow(self):
        """Full workflow: create, submit, review (approve), verify."""
        buyer_email = _next_email("ma-flow")
        op_email = _next_email("ma-flow-op")
        _register(buyer_email)
        _register(op_email)
        from app.database import SessionLocal
        from app.models import User, UserRole, Merchant
        with SessionLocal() as db:
            op = db.query(User).filter(User.email == op_email).first()
            op.role = UserRole.PLATFORM_OPERATOR
            db.commit()
        resp = _login(buyer_email)
        buyer_token = resp.json()["access_token"]
        resp = _login(op_email)
        op_token = resp.json()["access_token"]

        payload = _new_application_payload("流程审批")
        resp = client.post(
            "/api/merchant-applications/",
            json=payload,
            headers=_auth(buyer_token),
        )
        assert resp.status_code == 201
        app_id = resp.json()["id"]

        resp = client.post(
            f"/api/merchant-applications/{app_id}/submit",
            headers=_auth(buyer_token),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "submitted"

        resp = client.post(
            f"/api/merchant-applications/{app_id}/review",
            json={"status": "verified", "review_comment": "审核通过", "risk_level": "low"},
            headers=_auth(op_token),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "verified"

        with SessionLocal() as db:
            merchant = db.query(Merchant).filter(
                Merchant.unified_social_credit_code == payload["unified_social_credit_code"]
            ).first()
            assert merchant is not None
            assert merchant.verified is True
            user = db.query(User).filter(User.email == buyer_email).first()
            assert user.merchant_id == merchant.id
            assert user.role.value == "merchant_owner"

    def test_reject_application(self):
        buyer_email = _next_email("ma-reject")
        op_email = _next_email("ma-reject-op")
        _register(buyer_email)
        _register(op_email)
        from app.database import SessionLocal
        from app.models import User, UserRole
        with SessionLocal() as db:
            op = db.query(User).filter(User.email == op_email).first()
            op.role = UserRole.PLATFORM_OPERATOR
            db.commit()
        resp = _login(buyer_email)
        buyer_token = resp.json()["access_token"]
        resp = _login(op_email)
        op_token = resp.json()["access_token"]

        payload = _new_application_payload("被拒")
        resp = client.post(
            "/api/merchant-applications/",
            json=payload,
            headers=_auth(buyer_token),
        )
        app_id = resp.json()["id"]
        client.post(f"/api/merchant-applications/{app_id}/submit", headers=_auth(buyer_token))
        resp = client.post(
            f"/api/merchant-applications/{app_id}/review",
            json={"status": "rejected", "review_comment": "资质不完整", "risk_level": "high"},
            headers=_auth(op_token),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"

    def test_review_requires_platform_role(self):
        email = _next_email("ma-norole")
        _register(email)
        resp = _login(email)
        token = resp.json()["access_token"]
        resp = client.post(
            "/api/merchant-applications/",
            json=_new_application_payload("无权限审核"),
            headers=_auth(token),
        )
        app_id = resp.json()["id"]
        resp = client.post(
            f"/api/merchant-applications/{app_id}/review",
            json={"status": "verified", "review_comment": "ok", "risk_level": "normal"},
            headers=_auth(token),
        )
        assert resp.status_code == 403

    def test_audit_logs_written(self):
        buyer_email = _next_email("ma-audit")
        op_email = _next_email("ma-audit-op")
        _register(buyer_email)
        _register(op_email)
        from app.database import SessionLocal
        from app.models import User, UserRole
        with SessionLocal() as db:
            op = db.query(User).filter(User.email == op_email).first()
            op.role = UserRole.PLATFORM_OPERATOR
            db.commit()
        resp = _login(buyer_email)
        buyer_token = resp.json()["access_token"]
        resp = _login(op_email)
        op_token = resp.json()["access_token"]

        payload = _new_application_payload("审计")
        resp = client.post(
            "/api/merchant-applications/",
            json=payload,
            headers=_auth(buyer_token),
        )
        app_id = resp.json()["id"]
        client.post(f"/api/merchant-applications/{app_id}/submit", headers=_auth(buyer_token))
        client.post(
            f"/api/merchant-applications/{app_id}/review",
            json={"status": "verified", "review_comment": "ok", "risk_level": "low"},
            headers=_auth(op_token),
        )
        resp = client.get(
            f"/api/merchant-applications/{app_id}/audit-logs",
            headers=_auth(op_token),
        )
        assert resp.status_code == 200
        logs = resp.json()
        assert len(logs) >= 2, f"Expected >=2 audit logs, got {len(logs)}: {logs}"
        assert any(log["action"] == "merchant_application.create" for log in logs), (
            f"No create log found: {logs}"
        )
        assert any(log["action"] == "merchant_application.verified" for log in logs)


class TestMerchantSuspension:
    def test_suspend_verified_merchant(self):
        """Platform operator can suspend a verified merchant."""
        buyer_email = _next_email("suspend-buyer")
        op_email = _next_email("suspend-op")
        _register(buyer_email)
        _register(op_email)
        from app.database import SessionLocal
        from app.models import User, UserRole
        with SessionLocal() as db:
            op = db.query(User).filter(User.email == op_email).first()
            op.role = UserRole.PLATFORM_OPERATOR
            db.commit()
        resp = _login(buyer_email)
        buyer_token = resp.json()["access_token"]
        resp = _login(op_email)
        op_token = resp.json()["access_token"]

        payload = _new_application_payload("暂停测试")
        resp = client.post(
            "/api/merchant-applications/",
            json=payload,
            headers=_auth(buyer_token),
        )
        assert resp.status_code == 201
        app_id = resp.json()["id"]

        resp = client.post(
            f"/api/merchant-applications/{app_id}/submit",
            headers=_auth(buyer_token),
        )
        assert resp.status_code == 200, f"Submit failed: {resp.text}"

        resp = client.post(
            f"/api/merchant-applications/{app_id}/review",
            json={"status": "verified", "review_comment": "ok", "risk_level": "normal"},
            headers=_auth(op_token),
        )
        assert resp.status_code == 200, f"Review failed: {resp.text}"

        resp = client.post(
            f"/api/merchant-applications/{app_id}/suspend?reason=违规经营",
            headers=_auth(op_token),
        )
        assert resp.status_code == 200, f"Suspend failed: {resp.text}"
        assert resp.json()["status"] == "suspended", f"Status not suspended: {resp.json()}"
        assert resp.json()["suspended_reason"] == "违规经营", (
            f"Unexpected reason: {resp.json().get('suspended_reason')}"
        )

    def test_suspend_requires_platform_role(self):
        """Regular user cannot suspend a merchant."""
        buyer_email = _next_email("suspend-norole")
        op_email = _next_email("suspend-norole-op")
        _register(buyer_email)
        _register(op_email)
        from app.database import SessionLocal
        from app.models import User, UserRole
        with SessionLocal() as db:
            op = db.query(User).filter(User.email == op_email).first()
            op.role = UserRole.PLATFORM_OPERATOR
            db.commit()
        resp = _login(buyer_email)
        buyer_token = resp.json()["access_token"]
        resp = _login(op_email)
        op_token = resp.json()["access_token"]

        payload = _new_application_payload("暂停权限")
        resp = client.post(
            "/api/merchant-applications/",
            json=payload,
            headers=_auth(buyer_token),
        )
        app_id = resp.json()["id"]
        client.post(f"/api/merchant-applications/{app_id}/submit", headers=_auth(buyer_token))
        client.post(
            f"/api/merchant-applications/{app_id}/review",
            json={"status": "verified", "review_comment": "ok", "risk_level": "normal"},
            headers=_auth(op_token),
        )

        resp = client.post(
            f"/api/merchant-applications/{app_id}/suspend?reason=test",
            headers=_auth(buyer_token),
        )
        assert resp.status_code == 403


class TestHealthAndExisting:
    def test_health(self):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_products_list(self):
        resp = client.get("/api/products")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) > 0
