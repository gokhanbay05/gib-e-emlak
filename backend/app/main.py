from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import check_database_connection

app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
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
        "current_piece": "P0 - Repo İskeleti, PostgreSQL & Astryx Kurulumu",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "engine": "PostgreSQL 16 (SQLAlchemy 2.0)",
            "connected": db_ok,
            "info": db_info if db_ok else "PostgreSQL henüz çalışmıyor (docker compose up -d ile başlatın)",
        },
        "roadmap": [
            {"code": "P0", "title": "Repo İskeleti, PostgreSQL & Astryx Kurulumu", "status": "completed"},
            {"code": "P1", "title": "PostgreSQL İlişkisel Şema (7 Tablo) & Seed Data", "status": "next"},
            {"code": "P2", "title": "Auth, İşyeri Tanımı & TTBS Yetki Belgesi Doğrulama", "status": "planned"},
            {"code": "P3", "title": "Müşteri Yönetimi & Yan Panel (Drawer) Detay", "status": "planned"},
            {"code": "P4", "title": "Portföy Yönetimi (Sahipsiz Ev Olmaz & Kimlik Kontrolü)", "status": "planned"},
            {"code": "P5", "title": "Emlak Arama, Talep Eşleştirme & Yazıcı/PDF Çıktısı", "status": "planned"},
            {"code": "P6", "title": "AI Doğal Dil Akıllı Arama & Müşteri Eşleştirme", "status": "planned"},
            {"code": "P7", "title": "Müşteri Vitrini, Favoriler & Ev Satma Talebi", "status": "planned"},
            {"code": "P8", "title": "Randevu & Takvim Yönetimi (Saat Kapatma & 6 Saat Kuralı)", "status": "planned"},
            {"code": "P9", "title": "Raporlama, Pytest Test Paketi & Analist DB Dokümanı", "status": "planned"},
        ],
    }
