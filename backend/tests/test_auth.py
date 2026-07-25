"""Test auth: registration, login, JWT, RBAC, multi-tenant isolation.

Uses shared test DB via conftest.py.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

REGISTER_URL = "/api/auth/register"
LOGIN_URL = "/api/auth/login"
REFRESH_URL = "/api/auth/refresh"
LOGOUT_URL = "/api/auth/logout"
ME_URL = "/api/auth/me"

SEQUENCE = [0]


def _next_email(base="test"):
    SEQUENCE[0] += 1
    return f"{base}-{SEQUENCE[0]}@example.com"


def _register(email=None, password="TestPass123!", display_name="Test User"):
    return client.post(REGISTER_URL, json={
        "email": email or _next_email(),
        "password": password,
        "display_name": display_name,
    })


def _login(email, password="TestPass123!"):
    return client.post(LOGIN_URL, json={"email": email, "password": password})


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestAuthRegistration:
    def test_register_success(self):
        resp = _register()
        assert resp.status_code == 201
        data = resp.json()
        assert "password" not in data
        assert data["role"] == "buyer"

    def test_register_duplicate_email(self):
        email = _next_email("dup")
        assert _register(email=email).status_code == 201
        resp = _register(email=email)
        assert resp.status_code == 409

    def test_register_weak_password(self):
        resp = _register(email=_next_email("weak"), password="short")
        assert resp.status_code == 422

    def test_register_invalid_email(self):
        resp = _register(email="not-an-email", password="ValidPass123!")
        assert resp.status_code == 422


class TestAuthLogin:
    def test_login_success(self):
        email = _next_email("login")
        _register(email=email)
        resp = _login(email=email)
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_wrong_password(self):
        email = _next_email("badpw")
        _register(email=email)
        resp = _login(email=email, password="WrongPassword!")
        assert resp.status_code == 401

    def test_login_nonexistent_user(self):
        resp = _login(email=_next_email("nobody"))
        assert resp.status_code == 401

    def test_login_inactive_user(self):
        email = _next_email("inactive")
        _register(email=email)
        from app.database import SessionLocal
        with SessionLocal() as db:
            from app.models import User
            user = db.query(User).filter(User.email == email).first()
            user.is_active = False
            db.commit()
        resp = _login(email=email)
        assert resp.status_code == 403


class TestTokenRefresh:
    def test_refresh_success(self):
        email = _next_email("refresh")
        _register(email=email)
        login_resp = _login(email=email)
        refresh_token = login_resp.json()["refresh_token"]
        resp = client.post(REFRESH_URL, json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_with_access_token_fails(self):
        email = _next_email("ref-bad")
        _register(email=email)
        login_resp = _login(email=email)
        access_token = login_resp.json()["access_token"]
        resp = client.post(REFRESH_URL, json={"refresh_token": access_token})
        assert resp.status_code == 401

    def test_refresh_revoked_token_fails(self):
        """A token used for refresh is revoked; reusing it should fail."""
        from app.database import SessionLocal
        email = _next_email("ref-rev")
        _register(email=email)
        login_resp = _login(email=email)
        refresh_token = login_resp.json()["refresh_token"]
        # First refresh revokes old token and creates a new one
        resp1 = client.post(REFRESH_URL, json={"refresh_token": refresh_token})
        assert resp1.status_code == 200
        # Second refresh with same token should fail (revoked)
        resp2 = client.post(REFRESH_URL, json={"refresh_token": refresh_token})
        assert resp2.status_code == 401, (
            f"Expected 401, got {resp2.status_code}: {resp2.text}"
        )

    def test_logout_revokes_token(self):
        email = _next_email("ref-logout")
        _register(email=email)
        login_resp = _login(email=email)
        refresh_token = login_resp.json()["refresh_token"]
        access_token = login_resp.json()["access_token"]
        resp = client.post(
            LOGOUT_URL,
            json={"refresh_token": refresh_token},
            headers=_auth_header(access_token),
        )
        assert resp.status_code == 204
        refresh_resp = client.post(REFRESH_URL, json={"refresh_token": refresh_token})
        assert refresh_resp.status_code == 401


class TestGetMe:
    def test_get_me(self):
        email = _next_email("getme")
        _register(email=email)
        login_resp = _login(email=email)
        token = login_resp.json()["access_token"]
        resp = client.get(ME_URL, headers=_auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["email"] == email

    def test_get_me_no_token(self):
        resp = client.get(ME_URL)
        assert resp.status_code == 401

    def test_get_me_invalid_token(self):
        resp = client.get(ME_URL, headers=_auth_header("invalid.token.here"))
        assert resp.status_code == 401


class TestRBAC:
    def test_list_users_admin(self):
        email = _next_email("rbac-op")
        _register(email=email)
        from app.database import SessionLocal
        from app.models import User, UserRole
        with SessionLocal() as db:
            user = db.query(User).filter(User.email == email).first()
            user.role = UserRole.PLATFORM_OPERATOR
            db.commit()
        resp = _login(email=email)
        token = resp.json()["access_token"]
        resp = client.get("/api/users/", headers=_auth_header(token))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_users_forbidden_for_buyer(self):
        email = _next_email("rbac-buyer")
        _register(email=email)
        resp = _login(email=email)
        token = resp.json()["access_token"]
        resp = client.get("/api/users/", headers=_auth_header(token))
        assert resp.status_code == 403

    def test_update_role_admin(self):
        email_target = _next_email("rbac-tgt")
        email_admin = _next_email("rbac-admin")
        _register(email=email_target)
        _register(email=email_admin)
        from app.database import SessionLocal
        from app.models import User, UserRole
        with SessionLocal() as db:
            target = db.query(User).filter(User.email == email_target).first()
            target_id = target.id
            admin = db.query(User).filter(User.email == email_admin).first()
            admin.role = UserRole.PLATFORM_OPERATOR
            db.commit()
        resp = _login(email=email_admin)
        token = resp.json()["access_token"]
        resp = client.patch(
            f"/api/users/{target_id}/role?new_role=merchant_staff",
            headers=_auth_header(token),
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "merchant_staff"


class TestMultiTenantIsolation:
    def test_cross_merchant_blocked(self):
        """Merchant owner cannot list users filtered by another merchant."""
        from app.database import SessionLocal
        from app.models import Community, Merchant, User, UserRole
        from app.auth import hash_password

        # Create merchants and user via HTTP register + DB upgrade
        # Use HTTP to create user so password hashing is correct
        email = _next_email("tenant-a")
        _register(email=email, display_name="Tenant A")
        resp = _login(email=email)
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        token = resp.json()["access_token"]

        with SessionLocal() as db:
            comm1 = db.query(Community).first()
            m1 = Merchant(
                company_name="Tenant A Multi",
                display_name="Tenant A M",
                unified_social_credit_code="TENANTA_MULTI",
                community_id=comm1.id if comm1 else None,
                verified=True,
            )
            db.add(m1)
            db.flush()
            m2 = Merchant(
                company_name="Tenant B Multi",
                display_name="Tenant B M",
                unified_social_credit_code="TENANTB_MULTI",
                community_id=comm1.id if comm1 else None,
                verified=True,
            )
            db.add(m2)
            db.flush()
            user = db.query(User).filter(User.email == email).first()
            user.merchant_id = m1.id
            user.role = UserRole.MERCHANT_OWNER
            m2_id = m2.id
            db.commit()

        resp = client.get(f"/api/users/?merchant_id={m2_id}", headers=_auth_header(token))
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"


class TestExistingOrderFlowStillWorks:
    def test_health(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_milestone_payment_flow(self):
        products = client.get("/api/products").json()
        assert products
        product_id = products[0]["id"]
        order_resp = client.post(
            "/api/orders",
            json={
                "buyer_name": "测试客户",
                "buyer_contact": "buyer@example.com",
                "product_id": product_id,
                "contract_snapshot": "测试合同快照",
                "milestones": [
                    {"title": "需求确认", "description": "确认方案", "amount": "1000.00", "due_days": 3},
                    {"title": "最终交付", "description": "交付文件", "amount": "2000.00", "due_days": 7},
                ],
            },
        )
        assert order_resp.status_code == 201
        order = order_resp.json()
        paid = client.post(
            f"/api/orders/{order['id']}/pay",
            headers={"Idempotency-Key": "test-payment-auth-final"},
        )
        assert paid.status_code == 200
        paid_order = paid.json()
        assert paid_order["status"] == "in_progress"
        milestone = paid_order["milestones"][0]
        submitted = client.post(
            f"/api/milestones/{milestone['id']}/submit",
            json={"deliverable_url": "https://example.com/deliverable/1"},
        )
        assert submitted.status_code == 200
        accepted = client.post(f"/api/milestones/{milestone['id']}/accept")
        assert accepted.status_code == 200
        result = accepted.json()
        assert result["status"] == "partially_released"
