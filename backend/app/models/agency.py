from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, utc_now


class Agency(Base):
    """İşyeri Tanımı (Emlak İşletmesi) — GİB Case Madde 1."""

    __tablename__ = "agencies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    authorized_person: Mapped[str] = mapped_column(String(120), nullable=False)
    city: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)
    district: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    neighborhood: Mapped[str | None] = mapped_column(String(120), nullable=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    mobile_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    fax: Mapped[str | None] = mapped_column(String(32), nullable=True)
    tax_office: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tax_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ttbs_document_no: Mapped[str] = mapped_column(
        String(40), unique=True, nullable=False, index=True
    )
    is_ttbs_verified: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    users = relationship("User", back_populates="agency")
    customers = relationship("Customer", back_populates="agency")
    properties = relationship("Property", back_populates="agency")
    appointments = relationship("Appointment", back_populates="agency")
    blocked_slots = relationship("BlockedSlot", back_populates="agency")
