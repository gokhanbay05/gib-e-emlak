import re
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.validators import (
    DIGIT_RE,
    EMAIL_RE,
    hash_password,
    normalize_and_validate_phone,
    validate_password_strength,
    validate_tc_identity_no,
)
from app.models import (
    Agency,
    AgencyReview,
    Appointment,
    ChatMessage,
    ChatThread,
    Customer,
    Property,
    User,
)
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

    review_count = (
        db.scalar(
            select(func.count())
            .select_from(AgencyReview)
            .where(AgencyReview.agency_id == agency.id)
        )
        or 0
    )
    review_avg_raw = db.scalar(
        select(func.avg(AgencyReview.rating)).where(
            AgencyReview.agency_id == agency.id
        )
    )
    review_avg = round(float(review_avg_raw), 1) if review_avg_raw else 0.0

    work_days_str = agency.working_days or "Pzt,Sal,Çar,Per,Cum,Cmt"
    work_days = [d.strip() for d in work_days_str.split(",") if d.strip()]

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
        "working_hours": {
            "start_hour": agency.work_start_hour or 9,
            "end_hour": agency.work_end_hour or 18,
            "working_days": work_days,
        },
        "review_stats": {
            "average": review_avg,
            "count": int(review_count),
        },
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
    agency_id: int,
    customer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    if agency_id == 0 and customer_id is not None:
        base_cust = db.get(Customer, customer_id)
        if base_cust is None:
            return {"sell_requests": []}
        match_filters = [Customer.id == base_cust.id]
        if base_cust.tc_identity_no:
            match_filters.append(Customer.tc_identity_no == base_cust.tc_identity_no)
        if base_cust.mobile_phone:
            match_filters.append(Customer.mobile_phone == base_cust.mobile_phone)
        if base_cust.email:
            match_filters.append(Customer.email == base_cust.email)
        customers = db.scalars(
            select(Customer)
            .where(
                Customer.customer_type.in_(["SATICI", "KIRALAYAN"]),
                or_(*match_filters),
            )
            .order_by(Customer.created_at.desc(), Customer.id.desc())
        ).all()
        agencies_map = {a.id: a for a in db.scalars(select(Agency)).all()}
        return {
            "sell_requests": [
                _serialize_sell_request(c, agencies_map.get(c.agency_id) or Agency(id=c.agency_id or 1, name="Emlak Ofisi", authorized_person="", phone="", mobile_phone="", address="", city="", district="", neighborhood="", tax_office="", tax_number="", ttbs_document_no=""))
                for c in customers
            ]
        }

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
    if not payload.tc_identity_no or not payload.tc_identity_no.strip():
        field_errors["tc_identity_no"] = (
            "BR-04: Mülk satış / kiralama başvurusu için 11 haneli T.C. Kimlik Numarası zorunludur."
        )
    else:
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
    db.flush()

    # Satıcı / Mülk Sahibi emlak ofisi yetkilisine her zaman doğrudan yazabilsin (Sohbet Odası aç)
    seller_thread = ChatThread(
        agency_id=agency.id,
        customer_id=customer.id,
        advisor_name=agency.authorized_person,
        thread_type="SELL_INQUIRY",
        subject=f"{listing_type} {property_type} Satış Başvurusu ({district}/{city})",
    )
    db.add(seller_thread)
    db.flush()

    db.add(
        ChatMessage(
            thread_id=seller_thread.id,
            sender_role="AGENT",
            sender_name=agency.authorized_person,
            content=(
                f"Merhaba {first_name} {last_name}, {district}/{city} bölgesindeki "
                f"{room_count} ({payload.gross_sqm} m²) taşınmaz başvurunuz ekibimize ulaştı. "
                f"Ekspertiz ve süreç hakkında buradan doğrudan bize yazabilirsiniz."
            ),
        )
    )

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


@router.post("/{agency_id}/advisors", status_code=status.HTTP_201_CREATED)
def create_agency_advisor_account(
    agency_id: int,
    payload: dict,
    db: Session = Depends(get_db),
) -> dict:
    agency = db.get(Agency, agency_id)
    if agency is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emlak işletmesi bulunamadı.",
        )

    full_name = str(payload.get("full_name") or "").strip()
    phone = str(payload.get("phone") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")

    if len(full_name) < 3:
        raise HTTPException(status_code=400, detail="Ad soyad en az 3 karakter olmalıdır.")
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Geçerli bir e-posta adresi giriniz.")
    pwd_ok, pwd_err = validate_password_strength(password)
    if not pwd_ok:
        raise HTTPException(status_code=400, detail=pwd_err)

    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user is not None:
        raise HTTPException(status_code=409, detail="Bu e-posta adresi zaten sistemde kayıtlı.")

    new_user = User(
        full_name=full_name,
        email=email,
        phone=phone or agency.phone,
        password_hash=hash_password(password),
        role="AGENT",
        agency_id=agency_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Danışman hesabı oluşturuldu. E-posta ve şifresiyle sisteme giriş yapabilir.",
        "user": {
            "id": new_user.id,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "phone": new_user.phone,
            "agency_id": new_user.agency_id,
        },
    }


@router.put("/{agency_id}/working-hours")
def update_agency_working_hours(
    agency_id: int,
    payload: dict,
    db: Session = Depends(get_db),
) -> dict:
    """Emlak ofisinin mesai saatlerini ve çalışma günlerini günceller."""
    agency = db.get(Agency, agency_id)
    if agency is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emlak işletmesi bulunamadı.",
        )

    start_hour = int(payload.get("start_hour", 9))
    end_hour = int(payload.get("end_hour", 18))
    if end_hour <= start_hour:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mesai bitiş saati başlangıç saatinden büyük olmalıdır.",
        )

    raw_days = payload.get("working_days") or []
    if isinstance(raw_days, list) and len(raw_days) > 0:
        days_csv = ",".join(str(d).strip() for d in raw_days if str(d).strip())
    else:
        days_csv = "Pzt,Sal,Çar,Per,Cum"

    agency.work_start_hour = start_hour
    agency.work_end_hour = end_hour
    agency.working_days = days_csv
    db.commit()
    db.refresh(agency)

    return {
        "message": f"Mesai saatleri ({start_hour:02d}:00 - {end_hour:02d}:00) ve çalışma günleri güncellendi.",
        "working_hours": {
            "start_hour": agency.work_start_hour,
            "end_hour": agency.work_end_hour,
            "working_days": [d.strip() for d in days_csv.split(",") if d.strip()],
        },
    }
