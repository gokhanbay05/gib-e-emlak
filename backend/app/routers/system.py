from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import check_database_connection, get_db
from app.models import (
    Agency,
    Appointment,
    BlockedSlot,
    Customer,
    CustomerSearchRequest,
    Favorite,
    Property,
    User,
)
from app.seed import init_db_and_seed

router = APIRouter(tags=["Sistem & Veritabanı"])


@router.get("/api/health")
def health_check() -> dict:
    db_ok, db_info = check_database_connection()
    return {
        "status": "ok",
        "project": "gib-e-emlak",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "engine": "PostgreSQL 16 (SQLAlchemy 2.0)",
            "connected": db_ok,
            "info": db_info if db_ok else "PostgreSQL çalışmıyor (docker compose up -d).",
        },
    }


@router.post("/api/system/seed")
def trigger_seed() -> dict:
    return init_db_and_seed()


@router.get("/api/system/overview")
def database_overview(db: Session = Depends(get_db)) -> dict:
    db_ok, db_info = check_database_connection()
    if not db_ok:
        return {"connected": False, "info": db_info, "tables": []}

    init_db_and_seed()
    tables_summary = [
        {
            "table_name": "agencies",
            "module": "İşyeri Tanımı",
            "description": "Emlak işletmeleri, yetkili, adres, tel/fax, vergi no ve TTBS yetki belgesi",
            "row_count": db.scalar(select(func.count()).select_from(Agency)) or 0,
        },
        {
            "table_name": "users",
            "module": "Kullanıcı Hesapları",
            "description": "Emlakçı ve kayıtlı müşteri tekil e-posta giriş hesapları",
            "row_count": db.scalar(select(func.count()).select_from(User)) or 0,
        },
        {
            "table_name": "customers",
            "module": "Müşteri Yönetimi",
            "description": "Alıcı, satıcı, kiralık mülk sahibi ve kiracı müşteri kayıtları",
            "row_count": db.scalar(select(func.count()).select_from(Customer)) or 0,
        },
        {
            "table_name": "properties",
            "module": "Portföy (Emlak)",
            "description": "Satılık/kiralık ilanlar, teknik özellikler ve mülk sahibi bağı",
            "row_count": db.scalar(select(func.count()).select_from(Property)) or 0,
        },
        {
            "table_name": "customer_search_requests",
            "module": "Arama Talepleri",
            "description": "Müşterilerin aradıkları emlak kriterleri ve doğal dil istemleri",
            "row_count": (
                db.scalar(select(func.count()).select_from(CustomerSearchRequest)) or 0
            ),
        },
        {
            "table_name": "appointments",
            "module": "Randevular",
            "description": "Fiziki/telefon randevuları, 6 saat iptal kuralı ve görüşme notları",
            "row_count": db.scalar(select(func.count()).select_from(Appointment)) or 0,
        },
        {
            "table_name": "blocked_slots",
            "module": "Kapalı Saatler",
            "description": "Emlakçının takvimde manuel kapattığı saat dilimleri",
            "row_count": db.scalar(select(func.count()).select_from(BlockedSlot)) or 0,
        },
        {
            "table_name": "favorites",
            "module": "Favoriler",
            "description": "Kayıtlı müşterilerin favori ilanları",
            "row_count": db.scalar(select(func.count()).select_from(Favorite)) or 0,
        },
    ]

    return {"connected": True, "info": db_info, "tables": tables_summary}
