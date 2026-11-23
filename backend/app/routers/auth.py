import random
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.validators import (
    DEFAULT_AGENCY_LOGOS,
    DIGIT_RE,
    EMAIL_RE,
    hash_password,
    normalize_and_validate_phone,
    validate_password_strength,
    validate_ttbs_number,
)
from app.models import Agency, Customer, User
from app.schemas.auth import LoginRequest, RegisterRequest, TTBSVerifyRequest

router = APIRouter(tags=["Kayıt, Giriş & TTBS Yetki Belgesi"])


def serialize_user_session(user: User, db: Session) -> dict:
    agency = db.get(Agency, user.agency_id) if user.agency_id is not None else None
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
    payload: TTBSVerifyRequest, db: Session = Depends(get_db)
) -> dict:
    is_valid, province, message = validate_ttbs_number(
        payload.ttbs_document_no,
        db=db,
        agency_model=Agency,
        check_duplicate=payload.check_duplicate,
    )
    return {
        "is_valid": is_valid,
        "ttbs_document_no": re.sub(r"\s+", "", payload.ttbs_document_no or ""),
        "province": province,
        "ministry": "T.C. Ticaret Bakanlığı — TTBS",
        "status": "DOĞRULANDI" if is_valid else "DOĞRULANAMADI",
        "message": message,
    }


@router.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)) -> dict:
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
    elif db.scalar(select(User).where(func.lower(User.email) == normalized_email)):
        field_errors["email"] = "BR-02: Bu e-posta adresi sistemde zaten kayıtlı."

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
        ttbs_ok, province_name, ttbs_msg = validate_ttbs_number(
            payload.ttbs_document_no or "",
            db=db,
            agency_model=Agency,
            check_duplicate=True,
        )
        if not ttbs_ok:
            field_errors["ttbs_document_no"] = ttbs_msg

        if not payload.agency_name or len(payload.agency_name.strip()) < 3:
            field_errors["agency_name"] = "Emlak ofisi ismi en az 3 karakter olmalıdır."

        off_ok, formatted_office_phone, off_err = normalize_and_validate_phone(
            payload.office_phone or "", is_mobile=False
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
            field_errors["address_detail"] = "Açık adres detayı en az 5 karakter olmalıdır."

    if field_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": next(iter(field_errors.values())),
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
        new_agency = Agency(
            name=payload.agency_name.strip(),  # type: ignore[union-attr]
            authorized_person=full_name,
            city=payload.city.strip(),  # type: ignore[union-attr]
            district=payload.district.strip(),  # type: ignore[union-attr]
            neighborhood=payload.neighborhood.strip(),  # type: ignore[union-attr]
            address=payload.address_detail.strip(),  # type: ignore[union-attr]
            phone=formatted_office_phone,
            mobile_phone=formatted_phone,
            ttbs_document_no=re.sub(r"\s+", "", payload.ttbs_document_no or ""),
            is_ttbs_verified=True,
            logo_url=assigned_logo,
            description=f"{payload.agency_name.strip()} ({province_name})",
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
            "message": f"Emlakçı kaydı tamamlandı. {ttbs_msg}",
            "user": serialize_user_session(new_user, db),
        }

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
        "message": "Müşteri kaydınız başarıyla oluşturuldu.",
        "user": serialize_user_session(new_user, db),
    }


@router.post("/api/auth/login")
def login_user(payload: LoginRequest, db: Session = Depends(get_db)) -> dict:
    normalized_email = payload.email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "Bu e-posta adresine ait kullanıcı bulunamadı.",
                "field_errors": {"login_email": "Bu e-posta sistemde kayıtlı değil."},
            },
        )

    is_demo_hash = user.password_hash.startswith("demo_hash_")
    if not is_demo_hash and user.password_hash != hash_password(payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "Girilen şifre hatalı.",
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
    return {"users": [serialize_user_session(u, db) for u in users]}
