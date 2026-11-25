from datetime import datetime
from pydantic import BaseModel, Field


class BlockedSlotCreateRequest(BaseModel):
    """Emlakçının takvimde belirli bir saat aralığını manuel kapatma isteği."""

    agency_id: int = Field(..., description="Bağlı Emlak İşletmesi ID")
    start_time: datetime = Field(
        ..., description="Kapatılacak saat aralığı başlangıcı (ISO 8601)"
    )
    end_time: datetime = Field(
        ..., description="Kapatılacak saat aralığı bitişi (ISO 8601)"
    )
    reason: str = Field(
        default="Emlakçı Manuel Kapattı",
        max_length=160,
        description="Manuel saat kapatma nedeni",
    )
