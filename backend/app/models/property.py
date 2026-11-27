from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, utc_now


class Property(Base):
    """Emlak / Portföy Tanımı — GİB Case Madde 3 (BR-03: Sahipsiz Ev Olmaz)."""

    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agency_id: Mapped[int] = mapped_column(
        ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    listing_type: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    property_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    gross_sqm: Mapped[int] = mapped_column(Integer, nullable=False)
    net_sqm: Mapped[int] = mapped_column(Integer, nullable=False)
    room_count: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    building_floors: Mapped[int] = mapped_column(Integer, nullable=False)
    heating_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    district: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    neighborhood: Mapped[str] = mapped_column(String(100), nullable=False)
    address_detail: Mapped[str] = mapped_column(Text, nullable=False)
    agent_description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(24), default="AKTIF", nullable=False, index=True
    )
    is_owner_id_verified: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    building_age: Mapped[int | None] = mapped_column(Integer, default=3, nullable=True)
    bathroom_count: Mapped[int | None] = mapped_column(Integer, default=1, nullable=True)
    is_credit_eligible: Mapped[bool | None] = mapped_column(
        Boolean, default=True, nullable=True
    )
    is_furnished: Mapped[bool | None] = mapped_column(
        Boolean, default=False, nullable=True
    )
    deed_status: Mapped[str | None] = mapped_column(
        String(80), default="Kat Mülkiyetli", nullable=True
    )
    usage_status: Mapped[str | None] = mapped_column(
        String(80), default="Boş / Hemen Teslim", nullable=True
    )
    features_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    images_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    advisor_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    agency = relationship("Agency", back_populates="properties")
    owner_customer = relationship("Customer", back_populates="owned_properties")
    appointments = relationship("Appointment", back_populates="property_item")
    favorited_by = relationship("Favorite", back_populates="property_item")
