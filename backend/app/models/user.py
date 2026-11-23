from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, utc_now


class User(Base):
    """Sistem Kullanıcı Hesapları (Emlakçı ve Kayıtlı Müşteri)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(
        String(160), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    role: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    agency_id: Mapped[int | None] = mapped_column(
        ForeignKey("agencies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    agency = relationship("Agency", back_populates="users")
    customer = relationship("Customer")
    favorites = relationship("Favorite", back_populates="user")


class Favorite(Base):
    """Kayıtlı Müşterilerin Favori İlanları."""

    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "property_id", name="uq_user_property_favorite"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    property_id: Mapped[int] = mapped_column(
        ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    user = relationship("User", back_populates="favorites")
    property_item = relationship("Property", back_populates="favorited_by")
