from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, utc_now


class Customer(Base):
    """Müşteri Tanımı (Alıcı, Satıcı, Kiralayan, Kiracı) — GİB Case Madde 2."""

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agency_id: Mapped[int | None] = mapped_column(
        ForeignKey("agencies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    mobile_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    home_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    tc_identity_no: Mapped[str | None] = mapped_column(
        String(11), nullable=True, index=True
    )
    is_tc_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    customer_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(24), default="MANUEL", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    agency = relationship("Agency", back_populates="customers")
    owned_properties = relationship("Property", back_populates="owner_customer")
    search_requests = relationship("CustomerSearchRequest", back_populates="customer")
    appointments = relationship("Appointment", back_populates="customer")


class CustomerSearchRequest(Base):
    """Müşteri Emlak Arama Talepleri — GİB Case Madde 4."""

    __tablename__ = "customer_search_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agency_id: Mapped[int | None] = mapped_column(
        ForeignKey("agencies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    listing_type: Mapped[str] = mapped_column(String(24), nullable=False)
    property_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    min_sqm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_sqm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    room_count: Mapped[str | None] = mapped_column(String(20), nullable=True)
    floor_preference: Mapped[int | None] = mapped_column(Integer, nullable=True)
    heating_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    min_price: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    max_price: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    city: Mapped[str | None] = mapped_column(String(60), nullable=True)
    district: Mapped[str | None] = mapped_column(String(80), nullable=True)
    natural_language_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    customer = relationship("Customer", back_populates="search_requests")
