from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import check_database_connection
from app.routers.agencies import router as agencies_router
from app.routers.auth import router as auth_router
from app.routers.locations import router as locations_router
from app.routers.properties import router as properties_router
from app.routers.system import router as system_router
from app.routers.uploads import router as uploads_router
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
    description="GİB e-Emlak Kurumsal Taşınmaz ve Emlak İşletmesi Platformu REST API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system_router)
app.include_router(auth_router)
app.include_router(agencies_router)
app.include_router(properties_router)
app.include_router(locations_router)
app.include_router(uploads_router)

uploads_root = Path(__file__).resolve().parent.parent / "uploads"
uploads_root.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_root)), name="uploads")
