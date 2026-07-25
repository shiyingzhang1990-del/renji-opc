"""Shared test configuration - ensures a single test DB for all test files."""

from pathlib import Path
import os

# Use a single test database for all test files
TEST_DB = Path(__file__).with_name("test_renji.db")
if TEST_DB.exists():
    TEST_DB.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["PAYMENT_PROVIDER"] = "mock"
os.environ["PLATFORM_FEE_RATE"] = "0.08"
os.environ["SECRET_KEY"] = "test-secret-key-for-conftest"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"

# Import app.main which imports all models, then create tables + seed
from app.database import Base, engine  # noqa: E402
from app.models import (  # noqa: E402
    AuditLog, Category, Community, Dispute, Merchant,
    MerchantApplication, Milestone, Order, PaymentLedger,
    Product, RefreshToken, User,
)
from app.seed import seed_data  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

Base.metadata.create_all(bind=engine)
with Session(engine) as db:
    seed_data(db)
