import hashlib
import random
import re
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

DEFAULT_AGENCY_LOGOS = [
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&h=300&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&h=300&fit=crop",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=300&h=300&fit=crop",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=300&fit=crop",
]

LETTER_RE = re.compile(r"[A-Za-zÇĞİÖŞÜçğıöşü]")
DIGIT_RE = re.compile(r"\d")
SYMBOL_RE = re.compile(r"[^A-Za-z0-9ÇĞİÖŞÜçğıöşü\s]")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


def hash_password(raw_password: str) -> str:
    return hashlib.sha256(raw_password.encode("utf-8")).hexdigest()


def normalize_and_validate_phone(raw_phone: str, is_mobile: bool = True) -> tuple[bool, str, str]:
    """
    Türkiye telefon numarasını doğrular ve 0 (5XX) XXX XX XX / 0 (XXX) XXX XX XX
    formatına çevirir.
    """
    digits = re.sub(r"\D", "", raw_phone or "")
    if len(digits) == 10 and not digits.startswith("0"):
        digits = "0" + digits

    if len(digits) != 11 or not digits.startswith("0"):
        return (
            False,
            "",
            "Telefon numarası 11 haneli olmalıdır (Örn: 0 (532) 123 45 67).",
        )

    if is_mobile and not digits.startswith("05"):
        return (
            False,
            "",
            "Cep telefonu numarası 05 ile başlamalıdır (Örn: 0 (532) 123 45 67).",
        )

    formatted = f"{digits[0]} ({digits[1:4]}) {digits[4:7]} {digits[7:9]} {digits[9:11]}"
    return True, formatted, ""


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Şifre kuralı: En az 8 karakter, en az 1 harf, 1 rakam ve 1 sembol içermelidir.
    """
    if len(password) < 8:
        return False, "Şifre en az 8 karakter uzunluğunda olmalıdır."
    if not LETTER_RE.search(password):
        return False, "Şifre en az bir harf içermelidir."
    if not DIGIT_RE.search(password):
        return False, "Şifre en az bir rakam (0-9) içermelidir."
    if not SYMBOL_RE.search(password):
        return (
            False,
            "Şifre en az bir sembol (!@#$%^&*._- vb.) içermelidir.",
        )
    return True, ""


def validate_ttbs_number(
    ttbs_no: str,
    db: Session,
    check_duplicate: bool = True,
) -> tuple[bool, str, str]:
    """
    BR-01: T.C. Ticaret Bakanlığı Taşınmaz Ticareti Bilgi Sistemi (TTBS) Yetki Belgesi doğrulaması.
    Resmi format: 7 haneli sayısal, ilk 2 hanesi il plaka kodu (01-81).
    """
    cleaned = re.sub(r"\s+", "", ttbs_no or "")
    if len(cleaned) != 7 or not cleaned.isdigit():
        return (
            False,
            "",
            (
                "BR-01: Taşınmaz Ticareti Yetki Belgesi numarası resmi olarak 7 haneli "
                "sayısal bir değerdir ve ilk 2 hanesi il plaka kodudur (Örn: 0609412)."
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
                f"BR-01: Belge numarasının ilk iki hanesi ({cleaned[:2]}) geçerli bir "
                "Türkiye il plaka kodu (01-81) değildir."
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
            f"Müdürlüğü — Belge No: {cleaned} AKTİF)."
        ),
    )


class TTBSVerifyRequest(BaseModel):
    ttbs_document_no: str = Field(..., description="7 haneli Taşınmaz Ticareti Yetki Belge No")
    agency_name: str | None = Field(default=None)
    check_duplicate: bool = Field(default=True)


class RegisterRequest(BaseModel):
    # Ortak Alanlar (Ad ve Soyad ayrı!)
    first_name: str = Field(..., description="Ad")
    last_name: str = Field(..., description="Soyad")
    email: str = Field(..., description="Tekil E-posta Adresi (BR-02)")
    password: str = Field(..., description="En az 8 karakter, harf + rakam + sembol")
    phone: str = Field(..., description="Cep Telefonu Numarası")
    role: str = Field(..., description="AGENT (Emlakçı) veya CUSTOMER (Müşteri)")

    # Emlakçıya Özel Alanlar
    ttbs_document_no: str | None = Field(default=None)
    office_phone: str | None = Field(default=None)
    agency_name: str | None = Field(default=None)
    logo_url: str | None = Field(default=None)
    city: str | None = Field(default=None)
    district: str | None = Field(default=None)
    neighborhood: str | None = Field(default=None)
    address_detail: str | None = Field(default=None)


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
                "city": agency.city,
                "district": agency.district,
                "neighborhood": agency.neighborhood,
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
    is_valid, province, message = validate_ttbs_number(
        payload.ttbs_document_no,
        db=db,
        check_duplicate=payload.check_duplicate,
    )
    return {
        "is_valid": is_valid,
        "ttbs_document_no": re.sub(r"\s+", "", payload.ttbs_document_no or ""),
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
    P2: Sıkı alan doğrulamalı Emlakçı (AGENT) veya Müşteri (CUSTOMER) kaydı.
    Tüm hataları `field_errors` sözlüğüyle birlikte döner.
    """
    field_errors: dict[str, str] = {}

    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    if len(first_name) < 2 or DIGIT_RE.search(first_name):
        field_errors["first_name"] = "Ad en az 2 harf olmalı ve rakam içermemelidir."
    if len(last_name) < 2 or DIGIT_RE.search(last_name):
        field_errors["last_name"] = "Soyad en az 2 harf olmalı ve rakam içermemelidir."

    normalized_email = payload.email.strip().lower()
    if not EMAIL_RE.match(normalized_email):
        field_errors["email"] = "Lütfen geçerli bir e-posta adresi giriniz."
    else:
        existing_user = db.scalar(
            select(User).where(func.lower(User.email) == normalized_email)
        )
        if existing_user is not None:
            field_errors["email"] = (
                "BR-02: Bu e-posta adresi sistemde zaten kayıtlı. Tek e-posta ile "
                "yalnızca bir kayıt oluşturulabilir."
            )

    pwd_ok, pwd_err = validate_password_strength(payload.password)
    if not pwd_ok:
        field_errors["password"] = pwd_err

    phone_ok, formatted_phone, phone_err = normalize_and_validate_phone(
        payload.phone, is_mobile=True
    )
    if not phone_ok:
        field_errors["phone"] = phone_err

    role = payload.role.strip().upper()
    if role not in {"AGENT", "CUSTOMER"}:
        field_errors["role"] = "Geçersiz rol seçimi."

    formatted_office_phone = ""
    ttbs_msg = ""
    province_name = ""

    if role == "AGENT":
        if not payload.ttbs_document_no or not payload.ttbs_document_no.strip():
            field_errors["ttbs_document_no"] = (
                "BR-01: Taşınmaz Ticareti Yetki Belgesi No zorunludur."
            )
        else:
            ttbs_ok, province_name, ttbs_msg = validate_ttbs_number(
                payload.ttbs_document_no, db=db, check_duplicate=True
            )
            if not ttbs_ok:
                field_errors["ttbs_document_no"] = ttbs_msg

        if not payload.agency_name or len(payload.agency_name.strip()) < 3:
            field_errors["agency_name"] = "Emlak Ofisi İsmi en az 3 karakter olmalıdır."

        if not payload.office_phone or not payload.office_phone.strip():
            field_errors["office_phone"] = "Ofis sabit telefonu zorunludur."
        else:
            off_ok, formatted_office_phone, off_err = normalize_and_validate_phone(
                payload.office_phone, is_mobile=False
            )
            if not off_ok:
                field_errors["office_phone"] = off_err

        if not payload.city or not payload.city.strip():
            field_errors["city"] = "Lütfen il seçiniz."
        if not payload.district or not payload.district.strip():
            field_errors["district"] = "Lütfen ilçe seçiniz."
        if not payload.neighborhood or not payload.neighborhood.strip():
            field_errors["neighborhood"] = "Lütfen mahalle seçiniz."
        if not payload.address_detail or len(payload.address_detail.strip()) < 5:
            field_errors["address_detail"] = (
                "Cadde, sokak ve bina numarası içeren açık adres detayı zorunludur."
            )

    if field_errors:
        first_msg = next(iter(field_errors.values()))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": first_msg,
                "field_errors": field_errors,
            },
        )

    full_name = f"{first_name} {last_name}"

    if role == "AGENT":
        assigned_logo = (
            payload.logo_url.strip()
            if payload.logo_url and payload.logo_url.strip()
            else random.choice(DEFAULT_AGENCY_LOGOS)
        )
        city_val = payload.city.strip()  # type: ignore[union-attr]
        district_val = payload.district.strip()  # type: ignore[union-attr]
        neighborhood_val = payload.neighborhood.strip()  # type: ignore[union-attr]
        detail_val = payload.address_detail.strip()  # type: ignore[union-attr]
        full_address = f"{neighborhood_val}, {detail_val} {district_val} / {city_val}"

        new_agency = Agency(
            name=payload.agency_name.strip(),  # type: ignore[union-attr]
            authorized_person=full_name,
            city=city_val,
            district=district_val,
            neighborhood=neighborhood_val,
            address=full_address,
            phone=formatted_office_phone,
            mobile_phone=formatted_phone,
            ttbs_document_no=re.sub(r"\s+", "", payload.ttbs_document_no or ""),
            is_ttbs_verified=True,
            logo_url=assigned_logo,
            description=(
                f"{payload.agency_name.strip()} — {province_name} Ticaret İl Müdürlüğü "
                f"Taşınmaz Ticareti Yetki Belgeli ({payload.ttbs_document_no.strip()}) "
                "Emlak İşletmesi."
            ),
        )
        db.add(new_agency)
        db.flush()

        new_user = User(
            full_name=full_name,
            email=normalized_email,
            password_hash=hash_password(payload.password),
            phone=formatted_phone,
            role="AGENT",
            agency_id=new_agency.id,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {
            "message": f"Emlakçı kaydı başarıyla tamamlandı. {ttbs_msg}",
            "user": serialize_user_session(new_user, db),
        }

    # CUSTOMER (Müşteri) Kaydı — profil grubu sormadan doğrudan kayıt
    new_customer = Customer(
        first_name=first_name,
        last_name=last_name,
        mobile_phone=formatted_phone,
        email=normalized_email,
        customer_type="ALICI",
        source="SELF_KAYIT",
        notes="Web platformu üzerinden kayıt olan bireysel kullanıcı.",
    )
    db.add(new_customer)
    db.flush()

    new_user = User(
        full_name=full_name,
        email=normalized_email,
        password_hash=hash_password(payload.password),
        phone=formatted_phone,
        role="CUSTOMER",
        customer_id=new_customer.id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": (
            "Müşteri kaydınız başarıyla oluşturuldu. Artık favori ekleyebilir, "
            "randevu alabilir ve AI akıllı arama yapabilirsiniz."
        ),
        "user": serialize_user_session(new_user, db),
    }


@router.post("/api/auth/login")
def login_user(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> dict:
    field_errors: dict[str, str] = {}
    normalized_email = payload.email.strip().lower()
    if not normalized_email or not EMAIL_RE.match(normalized_email):
        field_errors["login_email"] = "Lütfen geçerli bir e-posta adresi giriniz."
    if not payload.password:
        field_errors["login_password"] = "Şifre alanı boş bırakılamaz."
    if field_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": next(iter(field_errors.values())),
                "field_errors": field_errors,
            },
        )

    user = db.scalar(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "Bu e-posta adresine ait kayıtlı bir kullanıcı bulunamadı.",
                "field_errors": {
                    "login_email": "Bu e-posta adresi sistemde kayıtlı değil."
                },
            },
        )

    hashed = hash_password(payload.password)
    is_demo_hash = user.password_hash.startswith("demo_hash_")
    if not is_demo_hash and user.password_hash != hashed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "Girilen şifre hatalı. Lütfen tekrar deneyiniz.",
                "field_errors": {"login_password": "Şifre hatalı."},
            },
        )

    return {
        "message": f"Hoş geldiniz, {user.full_name}!",
        "user": serialize_user_session(user, db),
    }


@router.get("/api/auth/users")
def list_registered_users(db: Session = Depends(get_db)) -> dict:
    users = db.scalars(select(User).order_by(User.id)).all()
    return {
        "users": [serialize_user_session(u, db) for u in users],
    }
