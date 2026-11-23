from collections.abc import Generator
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Tüm SQLAlchemy PostgreSQL modellerinin ortak taban sınıfı."""


def utc_now() -> datetime:
    """Tüm tablo zaman damgaları için ortak UTC saat üretici."""
    return datetime.now(timezone.utc)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> tuple[bool, str]:
    """PostgreSQL bağlantısını canlı test eder."""
    try:
        with engine.connect() as conn:
            version = conn.execute(text("SELECT version()")).scalar()
            return True, str(version)
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)
