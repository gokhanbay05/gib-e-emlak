import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.validators import (
    DIGIT_RE,
    EMAIL_RE,
    normalize_and_validate_phone,
    validate_tc_identity_no,
)
from app.models import Agency, Appointment, Customer, Property
from app.schemas.agency import AgencySellRequestCreate, AgencyUpdateRequest

VALID_SELL_LISTING_TYPES = {"SATILIK", "KIRALIK"}
VALID_SELL_PROPERTY_TYPES = {"DAIRE", "VILLA", "ISYERI", "ARSA"}

_SELL_REQUEST_NOTES_RE = re.compile(
    r"^\[EV SATIŞ/KİRALAMA BAŞVURUSU\]\s+"
    r"(?P<listing_type>[A-Z]+)\s+(?P<property_type>[A-Z]+)\s*\|\s*"
    r"(?P<room_count>[^|]+?)\s*\|\s*"
    r"(?P<gross_sqm>\d+)\s*m²\s*\|\s*"
    r"Beklenen Fiyat:\s*₺(?P<expected_price>[\d,]+)\s*\|\s*"
    r"Konum:\s*(?P<neighborhood>[^,]+),\s*(?P<district>[^/]+)/(?P<city>[^|]+)"
)

router = APIRouter(prefix="/api/agencies", tags=["İşyeri (Emlak Ofisi) Tanımı"])


def serialize_agency(agency: Agency, db: Session) -> dict:
    property_count = (
        db.scalar(
            select(func.count()).select_from(Property).where(Property.agency_id == agency.id)
        )
        or 0
    )
    active_property_count = (
        db.scalar(
            select(func.count())
            .select_from(Property)
            .where(Property.agency_id == agency.id, Property.status == "AKTIF")
        )
        or 0
    )
    customer_count = (
        db.scalar(
            select(func.count()).select_from(Customer).where(Customer.agency_id == agency.id)
        )
        or 0
    )
    appointment_count = (
        db.scalar(
            select(func.count())
            .select_from(Appointment)
            .where(Appointment.agency_id == agency.id)
        )
        or 0
    )

    return {
        "id": agency.id,
        "name": agency.name,
        "authorized_person": agency.authorized_person,
        "city": agency.city or "",
        "district": agency.district or "",
        "neighborhood": agency.neighborhood or "",
        "address": agency.address,
        "phone": agency.phone,
        "mobile_phone": agency.mobile_phone or "",
        "fax": agency.fax or "",
        "tax_office": agency.tax_office or "",
        "tax_number": agency.tax_number or "",
        "ttbs_document_no": agency.ttbs_document_no,
        "is_ttbs_verified": agency.is_ttbs_verified,
        "logo_url": agency.logo_url or "",
        "description": agency.description or "",
        "stats": {
            "property_count": property_count,
            "active_property_count": active_property_count,
            "customer_count": customer_count,
            "appointment_count": appointment_count,
        },
    }


@router.get("")
def list_agencies(db: Session = Depends(get_db)) -> dict:
    agencies = db.scalars(select(Agency).order_by(Agency.id)).all()
    return {"agencies": [serialize_agency(a, db) for a in agencies]}


@router.get("/{agency_id}")
def get_agency_detail(agency_id: int, db: Session = Depends(get_db)) -> dict:
    agency = db.get(Agency, agency_id)
    if agency is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emlak işletmesi kaydı bulunamadı.",
        )
    return {"agency": serialize_agency(agency, db)}


@router.put("/{agency_id}")
def update_agency_profile(
    agency_id: int, payload: AgencyUpdateRequest, db: Session = Depends(get_db)
) -> dict:
    agency = db.get(Agency, agency_id)
    if agency is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Güncellenecek emlak işletmesi bulunamadı.",
        )

    field_errors: dict[str, str] = {}
    if len(payload.name.strip()) < 3:
        field_errors["name"] = "İşletme adı en az 3 karakter olmalıdır."
    if len(payload.authorized_person.strip()) < 3:
        field_errors["authorized_person"] = "Yetkili kişi en az 3 karakter olmalıdır."
    if not payload.city.strip():
        field_errors["city"] = "Lütfen il seçiniz."
    if not payload.district.strip():
        field_errors["district"] = "Lütfen ilçe seçiniz."
    if not payload.neighborhood.strip():
        field_errors["neighborhood"] = "Lütfen mahalle seçiniz."
    if len(payload.address.strip()) < 5:
        field_errors["address"] = "Açık adres en az 5 karakter olmalıdır."

    phone_ok, formatted_phone, phone_err = normalize_and_validate_phone(
        payload.phone, is_mobile=False
    )
    if not phone_ok:
        field_errors["phone"] = phone_err

    formatted_mobile = ""
    if payload.mobile_phone and payload.mobile_phone.strip():
        mob_ok, formatted_mobile, mob_err = normalize_and_validate_phone(
            payload.mobile_phone, is_mobile=True
        )
        if not mob_ok:
            field_errors["mobile_phone"] = mob_err

    formatted_fax = ""
    if payload.fax and payload.fax.strip():
        fax_ok, formatted_fax, fax_err = normalize_and_validate_phone(
            payload.fax, is_mobile=False
        )
        if not fax_ok:
            field_errors["fax"] = f"Fax numarası geçersiz: {fax_err}"

    cleaned_tax_no = ""
    if payload.tax_number and payload.tax_number.strip():
        cleaned_tax_no = re.sub(r"\D", "", payload.tax_number)
        if len(cleaned_tax_no) not in {10, 11}:
            field_errors["tax_number"] = "Vergi No 10 veya 11 haneli olmalıdır."

    if field_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": next(iter(field_errors.values())),
                "field_errors": field_errors,
            },
        )

    agency.name = payload.name.strip()
    agency.authorized_person = payload.authorized_person.strip()
    agency.city = payload.city.strip()
    agency.district = payload.district.strip()
    agency.neighborhood = payload.neighborhood.strip()
    agency.address = payload.address.strip()
    agency.phone = formatted_phone
    agency.mobile_phone = formatted_mobile or None
    agency.fax = formatted_fax or None
    agency.tax_office = payload.tax_office.strip() if payload.tax_office else None
    agency.tax_number = cleaned_tax_no or None
    if payload.logo_url and payload.logo_url.strip():
        agency.logo_url = payload.logo_url.strip()
    agency.description = payload.description.strip() if payload.description else None

    db.commit()
    db.refresh(agency)
    return {
        "message": "İşyeri bilgileri başarıyla güncellendi.",
        "agency": serialize_agency(agency, db),
    }


def _serialize_sell_request(customer: Customer, agency: Agency) -> dict:
    raw_notes = customer.notes or ""
    match = _SELL_REQUEST_NOTES_RE.match(raw_notes)
    if match:
        listing_type = match.group("listing_type")
        property_type = match.group("property_type")
        room_count = match.group("room_count").strip()
        gross_sqm = int(match.group("gross_sqm"))
        expected_price = float(match.group("expected_price").replace(",", ""))
        neighborhood = match.group("neighborhood").strip()
        district = match.group("district").strip()
        city = match.group("city").strip()
    else:
        listing_type = "SATILIK" if customer.customer_type == "SATICI" else "KIRALIK"
        property_type = "DAIRE"
        room_count = "3+1"
        gross_sqm = 0
        expected_price = 0.0
        neighborhood = agency.neighborhood or ""
        district = agency.district or ""
        city = agency.city or ""

    return {
        "reference_no": f"BASVURU-{agency.id:02d}-{customer.id:04d}",
        "agency_id": agency.id,
        "agency_name": agency.name,
        "customer_id": customer.id,
        "owner_full_name": f"{customer.first_name} {customer.last_name}".strip(),
        "mobile_phone": customer.mobile_phone,
        "listing_type": listing_type,
        "property_type": property_type,
        "room_count": room_count,
        "gross_sqm": gross_sqm,
        "expected_price": expected_price,
        "city": city,
        "district": district,
        "neighborhood": neighborhood,
        "notes": raw_notes,
        "created_at": customer.created_at.isoformat() if customer.created_at else "",
    }


@router.get("/{agency_id}/sell-requests")
def list_agency_sell_requests(
    agency_id: int, db: Session = Depends(get_db)
) -> dict:
    agency = db.get(Agency, agency_id)
    if agency is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emlak işletmesi kaydı bulunamadı.",
        )

    customers = db.scalars(
        select(Customer)
        .where(
            Customer.agency_id == agency_id,
            Customer.customer_type.in_(["SATICI", "KIRALAYAN"]),
        )
        .order_by(Customer.created_at.desc(), Customer.id.desc())
    ).all()

    return {
        "sell_requests": [_serialize_sell_request(c, agency) for c in customers]
    }


@router.post("/{agency_id}/sell-requests", status_code=status.HTTP_201_CREATED)
def create_agency_sell_request(
    agency_id: int,
    payload: AgencySellRequestCreate,
    db: Session = Depends(get_db),
) -> dict:
    agency = db.get(Agency, agency_id)
    if agency is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Başvuru yapılacak emlak işletmesi bulunamadı.",
        )

    field_errors: dict[str, str] = {}

    first_name = (payload.owner_first_name or "").strip()
    if len(first_name) < 2:
        field_errors["owner_first_name"] = "Ad alanı en az 2 karakter olmalıdır."
    elif DIGIT_RE.search(first_name):
        field_errors["owner_first_name"] = "Ad alanı rakam içeremez."

    last_name = (payload.owner_last_name or "").strip()
    if len(last_name) < 2:
        field_errors["owner_last_name"] = "Soyad alanı en az 2 karakter olmalıdır."
    elif DIGIT_RE.search(last_name):
        field_errors["owner_last_name"] = "Soyad alanı rakam içeremez."

    mob_ok, formatted_mobile, mob_err = normalize_and_validate_phone(
        payload.mobile_phone, is_mobile=True
    )
    if not mob_ok:
        field_errors["mobile_phone"] = mob_err

    cleaned_email: str | None = None
    if payload.email and payload.email.strip():
        candidate_email = payload.email.strip().lower()
        if not EMAIL_RE.match(candidate_email):
            field_errors["email"] = "Lütfen geçerli bir e-posta adresi giriniz."
        else:
            cleaned_email = candidate_email

    cleaned_tc: str | None = None
    is_tc_verified = False
    if payload.tc_identity_no and payload.tc_identity_no.strip():
        tc_ok, normalized_tc, tc_err = validate_tc_identity_no(payload.tc_identity_no)
        if not tc_ok:
            field_errors["tc_identity_no"] = tc_err
        else:
            cleaned_tc = normalized_tc
            is_tc_verified = True

    listing_type = (payload.listing_type or "").strip().upper()
    if listing_type not in VALID_SELL_LISTING_TYPES:
        field_errors["listing_type"] = (
            "Geçerli bir işlem türü seçiniz (Satılık veya Kiralık)."
        )

    property_type = (payload.property_type or "").strip().upper()
    if property_type not in VALID_SELL_PROPERTY_TYPES:
        field_errors["property_type"] = "Geçerli bir emlak türü seçiniz."

    if payload.gross_sqm <= 0:
        field_errors["gross_sqm"] = "Brüt m² 0'dan büyük olmalıdır."

    if payload.expected_price <= 0:
        field_errors["expected_price"] = "Beklenen fiyat 0 TL'den büyük olmalıdır."

    city = (payload.city or "").strip()
    district = (payload.district or "").strip()
    neighborhood = (payload.neighborhood or "").strip()
    if not city:
        field_errors["city"] = "Lütfen il seçiniz."
    if not district:
        field_errors["district"] = "Lütfen ilçe seçiniz."
    if not neighborhood:
        field_errors["neighborhood"] = "Lütfen mahalle seçiniz."

    if field_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": next(iter(field_errors.values())),
                "field_errors": field_errors,
            },
        )

    room_count = (payload.room_count or "3+1").strip() or "3+1"
    customer_type = "SATICI" if listing_type == "SATILIK" else "KIRALAYAN"

    note_desc = (
        payload.property_notes.strip()
        if payload.property_notes and payload.property_notes.strip()
        else "-"
    )
    if payload.address_detail and payload.address_detail.strip():
        note_desc = f"{note_desc} (Adres: {payload.address_detail.strip()})"

    notes = (
        f"[EV SATIŞ/KİRALAMA BAŞVURUSU] {listing_type} {property_type} | "
        f"{room_count} | {payload.gross_sqm} m² | "
        f"Beklenen Fiyat: ₺{int(payload.expected_price):,} | "
        f"Konum: {neighborhood}, {district}/{city} | "
        f"Açıklama: {note_desc}"
    )

    customer = Customer(
        agency_id=agency.id,
        first_name=first_name,
        last_name=last_name,
        mobile_phone=formatted_mobile,
        email=cleaned_email,
        tc_identity_no=cleaned_tc,
        is_tc_verified=is_tc_verified,
        customer_type=customer_type,
        source="SELF_KAYIT",
        notes=notes,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    return {
        "message": "Gayrimenkul satış/kiralama başvurunuz yetki belgeli emlak işletmesine başarıyla iletildi.",
        "sell_request": {
            "reference_no": f"BASVURU-{agency.id:02d}-{customer.id:04d}",
            "agency_id": agency.id,
            "agency_name": agency.name,
            "customer_id": customer.id,
            "owner_full_name": f"{customer.first_name} {customer.last_name}".strip(),
            "mobile_phone": customer.mobile_phone,
            "listing_type": listing_type,
            "property_type": property_type,
            "room_count": room_count,
            "gross_sqm": payload.gross_sqm,
            "expected_price": float(payload.expected_price),
            "city": city,
            "district": district,
            "neighborhood": neighborhood,
            "notes": customer.notes or "",
            "created_at": customer.created_at.isoformat() if customer.created_at else "",
        },
    }
