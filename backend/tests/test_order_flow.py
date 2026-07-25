"""Existing order flow tests - shared DB via conftest.py."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    with client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_milestone_payment_flow():
    with client:
        products = client.get("/api/products").json()
        assert products
        product_id = products[0]["id"]

        order_response = client.post(
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
        assert order_response.status_code == 201
        order = order_response.json()

        paid = client.post(
            f"/api/orders/{order['id']}/pay",
            headers={"Idempotency-Key": "test-payment-001"},
        )
        assert paid.status_code == 200
        paid_order = paid.json()
        assert paid_order["status"] == "in_progress"
        assert paid_order["payment"]["frozen_amount"] == "3000.00"

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
        assert result["payment"]["released_to_merchant"] == "920.00"
        assert result["payment"]["platform_fee_accrued"] == "80.00"
