from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Agency(Base):
    """1. İşyeri Tanımı (Emlak İşletmesi) — GİB Case Madde 1 & TTBS Yetki Belgesi."""

    __tablename__ = "agencies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    authorized_person: Mapped[str] = mapped_column(String(120), nullable=False)
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

    users: Mapped[list["User"]] = relationship("User", back_populates="agency")
    customers: Mapped[list["Customer"]] = relationship(
        "Customer", back_populates="agency"
    )
    properties: Mapped[list["Property"]] = relationship(
        "Property", back_populates="agency"
    )
    appointments: Mapped[list["Appointment"]] = relationship(
        "Appointment", back_populates="agency"
    )
    blocked_slots: Mapped[list["BlockedSlot"]] = relationship(
        "BlockedSlot", back_populates="agency"
    )


class Customer(Base):
    """2. Müşteri Tanımı (Alıcı, Satıcı, Kiralık Mülk Sahibi, Kiracı) — GİB Case Madde 2."""

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
    # ALICI | SATICI | KIRALAYAN | KIRACI
    customer_type: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True
    )
    # MANUEL | SELF_KAYIT
    source: Mapped[str] = mapped_column(
        String(24), default="MANUEL", nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    agency: Mapped["Agency | None"] = relationship(
        "Agency", back_populates="customers"
    )
    owned_properties: Mapped[list["Property"]] = relationship(
        "Property", back_populates="owner_customer"
    )
    search_requests: Mapped[list["CustomerSearchRequest"]] = relationship(
        "CustomerSearchRequest", back_populates="customer"
    )
    appointments: Mapped[list["Appointment"]] = relationship(
        "Appointment", back_populates="customer"
    )


class User(Base):
    """Sistem Kullanıcı Hesapları (Emlakçı & Kayıtlı Müşteri Girişi)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(
        String(160), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    # AGENT | CUSTOMER
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

    agency: Mapped["Agency | None"] = relationship("Agency", back_populates="users")
    customer: Mapped["Customer | None"] = relationship("Customer")
    favorites: Mapped[list["Favorite"]] = relationship(
        "Favorite", back_populates="user"
    )


class Property(Base):
    """3. Emlak (Portföy) Tanımı — GİB Case Madde 3 (BR-03: Sahipsiz Ev Olmaz)."""

    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agency_id: Mapped[int] = mapped_column(
        ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # SATILIK | KIRALIK
    listing_type: Mapped[str] = mapped_column(
        String(24), nullable=False, index=True
    )
    # DAIRE | VILLA | ISYERI | ARSA
    property_type: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True
    )
    gross_sqm: Mapped[int] = mapped_column(Integer, nullable=False)
    net_sqm: Mapped[int] = mapped_column(Integer, nullable=False)
    # 1+0, 1+1, 2+1, 3+1, 4+1, 5+1
    room_count: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    building_floors: Mapped[int] = mapped_column(Integer, nullable=False)
    # DOGALGAZ_KOMBI | MERKEZI | YERDEN_ISITMA | KLIMA | SOBA
    heating_type: Mapped[str] = mapped_column(
        String(40), nullable=False, index=True
    )
    price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    district: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    neighborhood: Mapped[str] = mapped_column(String(100), nullable=False)
    address_detail: Mapped[str] = mapped_column(Text, nullable=False)
    agent_description: Mapped[str] = mapped_column(Text, nullable=False)
    # AKTIF | SATILDI | KIRALANDI | PASIF
    status: Mapped[str] = mapped_column(
        String(24), default="AKTIF", nullable=False, index=True
    )
    is_owner_id_verified: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    agency: Mapped["Agency"] = relationship("Agency", back_populates="properties")
    owner_customer: Mapped["Customer"] = relationship(
        "Customer", back_populates="owned_properties"
    )
    appointments: Mapped[list["Appointment"]] = relationship(
        "Appointment", back_populates="property_item"
    )
    favorited_by: Mapped[list["Favorite"]] = relationship(
        "Favorite", back_populates="property_item"
    )


class CustomerSearchRequest(Base):
    """4. Emlak Arama Talepleri — GİB Case Madde 4 (Alıcı/Kiracı Talep Kayıtları)."""

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

    customer: Mapped["Customer"] = relationship(
        "Customer", back_populates="search_requests"
    )


class Appointment(Base):
    """Randevu Yönetimi (Fiziki/Telefon, 6 Saat İptal Kuralı ve Geçmiş Görüşme Notları)."""

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
    # FIZIKI | TELEFON
    appointment_type: Mapped[str] = mapped_column(String(24), nullable=False)
    # ILAN_GOSTERIMI | MULK_SATIS_YETKISI | GENEL_DANISMANLIK
    purpose: Mapped[str] = mapped_column(
        String(40), default="ILAN_GOSTERIMI", nullable=False
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    # AKTIF | TAMAMLANDI | IPTAL_EDILDI
    status: Mapped[str] = mapped_column(
        String(24), default="AKTIF", nullable=False, index=True
    )
    meeting_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    agency: Mapped["Agency"] = relationship("Agency", back_populates="appointments")
    property_item: Mapped["Property | None"] = relationship(
        "Property", back_populates="appointments"
    )
    customer: Mapped["Customer"] = relationship(
        "Customer", back_populates="appointments"
    )


class BlockedSlot(Base):
    """Emlakçının Takvimde Manuel Kapattığı Saat Dilimleri (Örn: 19:00-20:00)."""

    __tablename__ = "blocked_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agency_id: Mapped[int] = mapped_column(
        ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False, index=True
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

    agency: Mapped["Agency"] = relationship("Agency", back_populates="blocked_slots")


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

    user: Mapped["User"] = relationship("User", back_populates="favorites")
    property_item: Mapped["Property"] = relationship(
        "Property", back_populates="favorited_by"
    )
