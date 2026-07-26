from collections.abc import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.effective_database_url.startswith("sqlite") else {}
engine = create_engine(
    settings.effective_database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def run_migrations() -> None:
    """Add missing columns for existing databases (SQLite and PostgreSQL)."""
    is_sqlite = settings.effective_database_url.startswith("sqlite")
    with engine.connect() as conn:
        if is_sqlite:
            cols = [row[1] for row in conn.execute(text("PRAGMA table_info('products')")).fetchall()]
            migrations = [
                ("contact_wechat", "VARCHAR(100) DEFAULT ''"),
                ("contact_phone", "VARCHAR(30) DEFAULT ''"),
                ("contact_qq", "VARCHAR(30) DEFAULT ''"),
                ("display_url", "VARCHAR(500)"),
                ("images", "TEXT"),
                ("deliverable_url", "VARCHAR(500)"),
            ]
            for col_name, col_def in migrations:
                if col_name not in cols:
                    conn.execute(text(f"ALTER TABLE products ADD COLUMN {col_name} {col_def}"))
                    conn.commit()
            # SQLite orders table
            order_cols = [row[1] for row in conn.execute(text("PRAGMA table_info('orders')")).fetchall()]
            if "payment_method" not in order_cols:
                conn.execute(text("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20) DEFAULT 'alipay'"))
                conn.commit()
            # SQLite merchants table
            merchant_cols = [row[1] for row in conn.execute(text("PRAGMA table_info('merchants')")).fetchall()]
            merchant_migrations = [
                ("alipay_account", "VARCHAR(200)"),
                ("wechatpay_merchant_id", "VARCHAR(200)"),
                ("bank_account_info", "TEXT"),
                ("alipay_qr_url", "VARCHAR(500)"),
                ("wechat_qr_url", "VARCHAR(500)"),
            ]
            for col_name, col_def in merchant_migrations:
                if col_name not in merchant_cols:
                    conn.execute(text(f"ALTER TABLE merchants ADD COLUMN {col_name} {col_def}"))
                    conn.commit()
        else:
            # PostgreSQL: ADD COLUMN IF NOT EXISTS
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS display_url VARCHAR(500)"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS deliverable_url VARCHAR(500)"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'alipay'"))
            conn.execute(text("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS alipay_account VARCHAR(200)"))
            conn.execute(text("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS wechatpay_merchant_id VARCHAR(200)"))
            conn.execute(text("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bank_account_info TEXT"))
            conn.execute(text("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS alipay_qr_url VARCHAR(500)"))
            conn.execute(text("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS wechat_qr_url VARCHAR(500)"))
            conn.commit()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
