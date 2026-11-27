from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, utc_now


class Appointment(Base):
    """Randevu Yönetimi (Fiziki/Telefon, 6 Saat İptal Kuralı ve Geçmiş Notlar)."""

    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agency_id: Mapped[int] = mapped_column(
        ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    property_id: Mapped[int | None] = mapped_column(
        ForeignKey("properties.id", ondelete="SET NULL"), nullable=True, index=True
    )
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    advisor_name: Mapped[str | None] = mapped_column(
        String(120), default="Selim Karahan", nullable=True, index=True
    )
    appointment_type: Mapped[str] = mapped_column(String(24), nullable=False)
    purpose: Mapped[str] = mapped_column(
        String(40), default="ILAN_GOSTERIMI", nullable=False
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(24), default="AKTIF", nullable=False, index=True
    )
    meeting_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    rating_dismissed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    rating_submitted: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    cancelled_by: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancel_ack_dismissed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    agency = relationship("Agency", back_populates="appointments")
    property_item = relationship("Property", back_populates="appointments")
    customer = relationship("Customer", back_populates="appointments")


class BlockedSlot(Base):
    """Emlakçının Takvimde Manuel Kapattığı Saat Dilimleri."""

    __tablename__ = "blocked_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agency_id: Mapped[int] = mapped_column(
        ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    advisor_name: Mapped[str | None] = mapped_column(
        String(120), default="Selim Karahan", nullable=True, index=True
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    reason: Mapped[str] = mapped_column(
        String(160), default="Emlakçı Manuel Kapattı", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    agency = relationship("Agency", back_populates="blocked_slots")
