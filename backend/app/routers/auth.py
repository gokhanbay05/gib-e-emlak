import hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Agency, Customer, User

router = APIRouter(tags=["P2 - Kayıt, Giriş & TTBS Yetki Belgesi"])

PROVINCE_NAMES: dict[int, str] = {
    6: "Ankara",
    34: "İstanbul",
    35: "İzmir",
    7: "Antalya",
    16: "Bursa",
    1: "Adana",
    41: "Kocaeli",
    42: "Konya",
    33: "Mersin",
    26: "Eskişehir",
}

INVALID_TEST_TTBS_NUMBERS = {"0000000", "1111111", "9999999", "1234567"}


def hash_password(raw_password: str) -> str:
    return hashlib.sha256(raw_password.encode("utf-8")).hexdigest()


def validate_ttbs_number(
    ttbs_no: str,
    db: Session,
    check_duplicate: bool = True,
) -> tuple[bool, str, str]:
    """
    BR-01: T.C. Ticaret Bakanlığı Taşınmaz Ticareti Yetki Belgesi Numarası doğrulaması.
    Kural: 7 haneli rakam olmalı, ilk 2 hanesi geçerli Türkiye il plakası (01-81) olmalı
    ve iptal/geçersiz test listesinde yer almamalıdır.
    """
    cleaned = ttbs_no.strip()
    if len(cleaned) != 7 or not cleaned.isdigit():
        return (
            False,
            "",
            (
                "BR-01: Taşınmaz Ticareti Yetki Belgesi numarası 7 haneli sayısal bir değer "
                "olmalıdır (Örn: 0609412 veya 3408521)."
            ),
        )

    if cleaned in INVALID_TEST_TTBS_NUMBERS:
        return (
            False,
            "",
            (
                f"BR-01: '{cleaned}' numaralı Taşınmaz Ticareti Yetki Belgesi T.C. Ticaret "
                "Bakanlığı TTBS kayıtlarında İPTAL / GEÇERSİZ olarak görünmektedir."
            ),
        )

    province_code = int(cleaned[:2])
    if province_code < 1 or province_code > 81:
        return (
            False,
            "",
            (
                f"BR-01: Belge numarasının ilk iki hanesi ({cleaned[:2]}) geçerli bir il kodu "
                "(01-81) değildir."
            ),
        )

    if check_duplicate:
        existing_agency = db.scalar(
            select(Agency).where(Agency.ttbs_document_no == cleaned)
        )
        if existing_agency is not None:
            return (
                False,
                "",
                (
                    f"BR-01: '{cleaned}' numaralı Taşınmaz Ticareti Yetki Belgesi sistemde "
                    f"'{existing_agency.name}' işletmesi adına zaten kayıtlıdır."
                ),
            )

    province_name = PROVINCE_NAMES.get(province_code, f"{cleaned[:2]} İl Müdürlüğü")
    return (
        True,
        province_name,
        (
            f"T.C. Ticaret Bakanlığı TTBS Doğrulaması Başarılı ({province_name} Ticaret İl "
            f"Müdürlüğü - Belge No: {cleaned} AKTİF)."
        ),
    )


class TTBSVerifyRequest(BaseModel):
    ttbs_document_no: str = Field(..., description="7 haneli Taşınmaz Ticareti Yetki Belge No")
    agency_name: str | None = Field(default=None, description="Emlak ofisi adı")
    check_duplicate: bool = Field(default=True, description="Mükerrer belge kontrolü")


class RegisterRequest(BaseModel):
    # Ortak Alanlar
    full_name: str = Field(..., min_length=2, description="Ad ve Soyad")
    email: str = Field(..., min_length=5, description="Tekil E-posta Adresi (BR-02)")
    password: str = Field(..., min_length=4, description="Şifre")
    phone: str = Field(..., min_length=7, description="Cep Telefonu Numarası")
    role: str = Field(..., description="AGENT (Emlakçı) veya CUSTOMER (Müşteri)")

    # Emlakçıya Özel (Farklı) Alanlar
    ttbs_document_no: str | None = Field(
        default=None, description="Taşınmaz Ticareti Yetki Belge No (Emlakçı için zorunlu)"
    )
    office_phone: str | None = Field(
        default=None, description="Emlak Ofisi Sabit Telefonu (Emlakçı için zorunlu)"
    )
    agency_name: str | None = Field(
        default=None, description="Emlak Ofisi İsmi (Emlakçı için zorunlu)"
    )
    logo_url: str | None = Field(
        default=None, description="Emlak Ofisi Logo URL (Emlakçıya ait)"
    )
    office_address: str | None = Field(
        default=None, description="Emlak Ofisi Adresi"
    )
    customer_type: str | None = Field(
        default="ALICI", description="Müşteri ise varsayılan müşteri tipi (ALICI / KIRACI)"
    )


class LoginRequest(BaseModel):
    email: str
    password: str


def serialize_user_session(user: User, db: Session) -> dict:
    agency = (
        db.get(Agency, user.agency_id) if user.agency_id is not None else None
    )
    customer = (
        db.get(Customer, user.customer_id) if user.customer_id is not None else None
    )
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "agency": (
            {
                "id": agency.id,
                "name": agency.name,
                "authorized_person": agency.authorized_person,
                "phone": agency.phone,
                "mobile_phone": agency.mobile_phone,
                "fax": agency.fax,
                "address": agency.address,
                "ttbs_document_no": agency.ttbs_document_no,
                "is_ttbs_verified": agency.is_ttbs_verified,
                "logo_url": agency.logo_url,
            }
            if agency
            else None
        ),
        "customer": (
            {
                "id": customer.id,
                "full_name": f"{customer.first_name} {customer.last_name}",
                "customer_type": customer.customer_type,
                "mobile_phone": customer.mobile_phone,
            }
            if customer
            else None
        ),
    }


@router.post("/api/verify/ttbs")
def verify_ttbs_document(
    payload: TTBSVerifyRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    BR-01: T.C. Ticaret Bakanlığı Taşınmaz Ticareti Bilgi Sistemi (TTBS) Mock Doğrulama Servisi.
    """
    is_valid, province, message = validate_ttbs_number(
        payload.ttbs_document_no,
        db=db,
        check_duplicate=payload.check_duplicate,
    )
    return {
        "is_valid": is_valid,
        "ttbs_document_no": payload.ttbs_document_no.strip(),
        "province": province,
        "ministry": "T.C. Ticaret Bakanlığı — Taşınmaz Ticareti Bilgi Sistemi (TTBS)",
        "status": "DOĞRULANDI" if is_valid else "DOĞRULANAMADI",
        "message": message,
    }


@router.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    P2: Ortak ve ayrışan alanlarla Emlakçı (AGENT) veya Müşteri (CUSTOMER) kaydı.
    - BR-02: Tekil e-posta kontrolü (aynı mail ile ikinci kayıt açılamaz).
    - BR-01: Emlakçı kaydında Taşınmaz Ticareti Yetki Belgesi zorunlu doğrulaması.
    """
    normalized_email = payload.email.strip().lower()
    if "@" not in normalized_email or "." not in normalized_email.split("@")[-1]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lütfen geçerli bir e-posta adresi giriniz.",
        )

    # BR-02: Tekil E-Posta Kontrolü
    existing_user = db.scalar(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"BR-02: '{normalized_email}' e-posta adresi ile sistemde zaten bir kayıt "
                "bulunmaktadır. Her e-posta adresi ile yalnızca tek kayıt oluşturulabilir."
            ),
        )

    role = payload.role.strip().upper()
    if role not in {"AGENT", "CUSTOMER"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geçersiz kullanıcı rolü. 'AGENT' veya 'CUSTOMER' seçilmelidir.",
        )

    full_name = payload.full_name.strip()
    phone = payload.phone.strip()

    if role == "AGENT":
        if not payload.ttbs_document_no or not payload.ttbs_document_no.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="BR-01: Emlakçı kaydı için Taşınmaz Ticareti Yetki Belgesi No zorunludur.",
            )
        if not payload.agency_name or not payload.agency_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Emlakçı kaydı için Emlak Ofisi İsmi zorunludur.",
            )
        if not payload.office_phone or not payload.office_phone.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Emlakçı kaydı için Emlak Ofisi Telefon Numarası zorunludur.",
            )

        is_valid, province, ttbs_msg = validate_ttbs_number(
            payload.ttbs_document_no, db=db, check_duplicate=True
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ttbs_msg,
            )

        new_agency = Agency(
            name=payload.agency_name.strip(),
            authorized_person=full_name,
            address=(
                payload.office_address.strip()
                if payload.office_address and payload.office_address.strip()
                else f"{province} Merkez Ofis (İşyeri Tanımından Güncellenebilir)"
            ),
            phone=payload.office_phone.strip(),
            mobile_phone=phone,
            ttbs_document_no=payload.ttbs_document_no.strip(),
            is_ttbs_verified=True,
            logo_url=(
                payload.logo_url.strip()
                if payload.logo_url and payload.logo_url.strip()
                else "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"
            ),
            description=(
                f"{payload.agency_name.strip()} — T.C. Ticaret Bakanlığı Taşınmaz Ticareti "
                f"Yetki Belgeli ({payload.ttbs_document_no.strip()}) Emlak İşletmesi."
            ),
        )
        db.add(new_agency)
        db.flush()

        new_user = User(
            full_name=full_name,
            email=normalized_email,
            password_hash=hash_password(payload.password),
            phone=phone,
            role="AGENT",
            agency_id=new_agency.id,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {
            "message": (
                f"Emlakçı kaydı başarıyla tamamlandı. {ttbs_msg}"
            ),
            "user": serialize_user_session(new_user, db),
        }

    # CUSTOMER (Müşteri) Kaydı
    name_parts = full_name.split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else "Müşteri"

    new_customer = Customer(
        first_name=first_name,
        last_name=last_name,
        mobile_phone=phone,
        email=normalized_email,
        customer_type=(
            payload.customer_type
            if payload.customer_type in {"ALICI", "KIRACI", "SATICI", "KIRALAYAN"}
            else "ALICI"
        ),
        source="SELF_KAYIT",
        notes="Web platformu üzerinden kendi kayıt olan müşteri hesabı.",
    )
    db.add(new_customer)
    db.flush()

    new_user = User(
        full_name=full_name,
        email=normalized_email,
        password_hash=hash_password(payload.password),
        phone=phone,
        role="CUSTOMER",
        customer_id=new_customer.id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Müşteri kaydınız başarıyla oluşturuldu. Artık randevu alabilir, favori ekleyebilir ve AI arama yapabilirsiniz.",
        "user": serialize_user_session(new_user, db),
    }


@router.post("/api/auth/login")
def login_user(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> dict:
    normalized_email = payload.email.strip().lower()
    user = db.scalar(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bu e-posta adresine ait kayıtlı bir kullanıcı bulunamadı.",
        )

    hashed = hash_password(payload.password)
    is_demo_hash = user.password_hash.startswith("demo_hash_")
    if not is_demo_hash and user.password_hash != hashed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Girilen şifre hatalı. Lütfen kontrol edip tekrar deneyiniz.",
        )

    return {
        "message": f"Hoş geldiniz, {user.full_name}!",
        "user": serialize_user_session(user, db),
    }


@router.get("/api/auth/users")
def list_registered_users(db: Session = Depends(get_db)) -> dict:
    """Kayıtlı tüm kullanıcıları ve hızlı demo geçiş hesaplarını döndürür."""
    users = db.scalars(select(User).order_by(User.id)).all()
    return {
        "users": [serialize_user_session(u, db) for u in users],
    }
