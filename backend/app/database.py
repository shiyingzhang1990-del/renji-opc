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
    """Add missing columns for existing SQLite databases."""
    if not settings.effective_database_url.startswith("sqlite"):
        return
    with engine.connect() as conn:
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info('products')")).fetchall()]
        migrations = [
            ("contact_wechat", "VARCHAR(100) DEFAULT ''"),
            ("contact_phone", "VARCHAR(30) DEFAULT ''"),
            ("contact_qq", "VARCHAR(30) DEFAULT ''"),
        ]
        for col_name, col_def in migrations:
            if col_name not in cols:
                conn.execute(text(f"ALTER TABLE products ADD COLUMN {col_name} {col_def}"))
                conn.commit()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
