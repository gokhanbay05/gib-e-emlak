from datetime import datetime
from pydantic import BaseModel, Field


class BlockedSlotCreateRequest(BaseModel):
    """Emlakçının takvimde belirli bir saat aralığını manuel kapatma isteği."""

    agency_id: int = Field(..., description="Bağlı Emlak İşletmesi ID")
    advisor_name: str | None = Field(
        default="Selim Karahan", description="Danışman Adı Soyadı"
    )
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


class AppointmentCreateRequest(BaseModel):
    """Müşterinin ilan detay sayfasından randevu oluşturma isteği."""

    agency_id: int = Field(..., description="Emlak Ofisi ID")
    property_id: int | None = Field(default=None, description="İlan ID")
    user_id: int | None = Field(default=None, description="Kullanıcı ID")
    advisor_name: str | None = Field(
        default="Selim Karahan", description="Sorumlu Danışman Adı Soyadı"
    )
    customer_name: str = Field(..., description="Müşteri Ad Soyad")
    customer_phone: str = Field(..., description="Müşteri Telefon")
    tc_identity_no: str | None = Field(
        default=None, description="11 haneli T.C. Kimlik Numarası (BR-04)"
    )
    appointment_type: str = Field(
        default="FIZIKI", description="FIZIKI veya TELEFON"
    )
    purpose: str = Field(
        default="ILAN_GOSTERIMI",
        description="ILAN_GOSTERIMI, MULK_SATIS_YETKISI veya GENEL_DANISMANLIK",
    )
    start_time: datetime = Field(..., description="Randevu başlangıcı (ISO 8601)")
    end_time: datetime = Field(..., description="Randevu bitişi (ISO 8601)")
    meeting_notes: str | None = Field(default=None, description="Randevu notu")


class AppointmentCancelRequest(BaseModel):
    """Müşterinin randevuyu iptal ederken iletebileceği isteğe bağlı iptal nedeni."""

    reason: str | None = Field(default=None, max_length=400)


class AppointmentUpdateRequest(BaseModel):
    """Emlakçının takvim içinden randevu durumunu ve görüşme notunu güncelleme isteği."""

    status: str | None = Field(
        default=None, description="AKTIF, TAMAMLANDI veya IPTAL_EDILDI"
    )
    meeting_notes: str | None = Field(
        default=None, description="Görüşme değerlendirme notu"
    )

