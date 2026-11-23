from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import check_database_connection, get_db
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


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    db_ok, _ = check_database_connection()
    if db_ok:
        init_db_and_seed()
    yield


app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    lifespan=lifespan,
    description=(
        "Gelir İdaresi Başkanlığı (GİB) İş Analisti Case Çalışması — "
        "Taşınmaz Ticareti Yetki Belgeli Emlak İşletmesi & Akıllı Emlak Platformu REST API"
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["Sistem & Sağlık"])
def health_check() -> dict:
    db_ok, db_info = check_database_connection()
    return {
        "status": "ok",
        "project": "gib-e-emlak",
        "current_piece": "P1 - PostgreSQL İlişkisel Şema (8 Tablo) & Seed Data",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "engine": "PostgreSQL 16 (SQLAlchemy 2.0)",
            "connected": db_ok,
            "info": (
                db_info
                if db_ok
                else "PostgreSQL henüz çalışmıyor (docker compose up -d ile başlatın)"
            ),
        },
    }


@app.post("/api/system/seed", tags=["Sistem & Veritabanı (P1)"])
def trigger_seed() -> dict:
    """PostgreSQL tablolarını oluşturur ve başlangıç verilerini yükler."""
    return init_db_and_seed()


@app.get("/api/system/overview", tags=["Sistem & Veritabanı (P1)"])
def database_overview(db: Session = Depends(get_db)) -> dict:
    """P1: PostgreSQL üzerindeki 8 ilişkisel tablonun satır sayılarını ve örnek kayıtlarını döndürür."""
    db_ok, db_info = check_database_connection()
    if not db_ok:
        return {
            "connected": False,
            "info": db_info,
            "tables": [],
            "sample_agencies": [],
            "sample_customers": [],
            "sample_properties": [],
        }

    init_db_and_seed()

    tables_summary = [
        {
            "table_name": "agencies",
            "module": "1. İşyeri Tanımı (GİB Madde 1)",
            "description": "Emlak işletmeleri, Yetkili, Adres, Tel, Fax, Vergi No ve TTBS Yetki Belgesi",
            "row_count": db.scalar(select(func.count()).select_from(Agency)) or 0,
        },
        {
            "table_name": "users",
            "module": "Kullanıcı & Rol Hesapları",
            "description": "Emlakçı (AGENT) ve Kayıtlı Müşteri (CUSTOMER) tekil e-posta giriş hesapları",
            "row_count": db.scalar(select(func.count()).select_from(User)) or 0,
        },
        {
            "table_name": "customers",
            "module": "2. Müşteri Tanımı (GİB Madde 2)",
            "description": "Alıcı, Satıcı, Kiralık Mülk Sahibi (Kiralayan) ve Kiracı müşteriler (Ev/Cep Tel, TC No)",
            "row_count": db.scalar(select(func.count()).select_from(Customer)) or 0,
        },
        {
            "table_name": "properties",
            "module": "3. Emlak / Portföy Tanımı (GİB Madde 3)",
            "description": "Satılık/Kiralık ilanlar, m², oda, kat, bina katı, ısınma, emlakçı tasviri ve mülk sahibi bağı",
            "row_count": db.scalar(select(func.count()).select_from(Property)) or 0,
        },
        {
            "table_name": "customer_search_requests",
            "module": "4. Emlak Arama Talepleri (GİB Madde 4)",
            "description": "Alıcı ve kiracı müşterilerin aradıkları emlak kriterleri ve doğal dil arama istemleri",
            "row_count": (
                db.scalar(select(func.count()).select_from(CustomerSearchRequest)) or 0
            ),
        },
        {
            "table_name": "appointments",
            "module": "Randevu Yönetimi",
            "description": "Fiziki ve telefon randevuları, 6 saat iptal kuralı takibi ve geçmiş görüşme notları",
            "row_count": db.scalar(select(func.count()).select_from(Appointment)) or 0,
        },
        {
            "table_name": "blocked_slots",
            "module": "Takvim Saat Kapatma",
            "description": "Emlakçının müsait olmadığı saat aralıklarını (örn. 19:00-20:00) manuel kapatma kayıtları",
            "row_count": db.scalar(select(func.count()).select_from(BlockedSlot)) or 0,
        },
        {
            "table_name": "favorites",
            "module": "Müşteri Vitrini Favoriler",
            "description": "Giriş yapan müşterilerin favorilerine eklediği gayrimenkul ilanları",
            "row_count": db.scalar(select(func.count()).select_from(Favorite)) or 0,
        },
    ]

    agencies = db.scalars(select(Agency).order_by(Agency.id)).all()
    customers = db.scalars(select(Customer).order_by(Customer.id)).all()
    properties = db.scalars(select(Property).order_by(Property.id)).all()

    customer_map = {c.id: f"{c.first_name} {c.last_name}" for c in customers}
    agency_map = {a.id: a.name for a in agencies}

    return {
        "connected": True,
        "info": db_info,
        "tables": tables_summary,
        "sample_agencies": [
            {
                "id": a.id,
                "name": a.name,
                "authorized_person": a.authorized_person,
                "phone": a.phone,
                "fax": a.fax or "-",
                "ttbs_document_no": a.ttbs_document_no,
                "is_ttbs_verified": a.is_ttbs_verified,
            }
            for a in agencies
        ],
        "sample_customers": [
            {
                "id": c.id,
                "full_name": f"{c.first_name} {c.last_name}",
                "customer_type": c.customer_type,
                "mobile_phone": c.mobile_phone,
                "home_phone": c.home_phone or "-",
                "tc_identity_no": c.tc_identity_no or "-",
                "source": c.source,
            }
            for c in customers
        ],
        "sample_properties": [
            {
                "id": p.id,
                "title": p.title,
                "listing_type": p.listing_type,
                "property_type": p.property_type,
                "room_count": p.room_count,
                "net_sqm": p.net_sqm,
                "floor_info": f"Kat {p.floor_number} / {p.building_floors}",
                "heating_type": p.heating_type,
                "price": float(p.price),
                "location": f"{p.district} / {p.city}",
                "owner_name": customer_map.get(p.owner_customer_id, "-"),
                "agency_name": agency_map.get(p.agency_id, "-"),
                "status": p.status,
            }
            for p in properties
        ],
    }
