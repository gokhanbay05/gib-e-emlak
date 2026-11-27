import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.validators import (
    DIGIT_RE,
    EMAIL_RE,
    normalize_and_validate_phone,
    normalize_turkish_search,
    turkish_sort_key,
    validate_tc_identity_no,
)
from app.models import Agency, Appointment, Customer, Property
from app.schemas.customer import CustomerCreateRequest, CustomerUpdateRequest

router = APIRouter(prefix="/api/customers", tags=["Müşteri Tanımı (GİB Madde 2)"])

VALID_CUSTOMER_TYPES = ("ALICI", "SATICI", "KIRALAYAN", "KIRACI")


def serialize_customer(customer: Customer, db: Session) -> dict:
    property_count = (
        db.scalar(
            select(func.count())
            .select_from(Property)
            .where(Property.owner_customer_id == customer.id)
        )
        or 0
    )
    appointment_count = (
        db.scalar(
            select(func.count())
            .select_from(Appointment)
            .where(Appointment.customer_id == customer.id)
        )
        or 0
    )

    return {
        "id": customer.id,
        "agency_id": customer.agency_id,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "full_name": f"{customer.first_name} {customer.last_name}".strip(),
        "mobile_phone": customer.mobile_phone,
        "home_phone": customer.home_phone or "",
        "email": customer.email or "",
        "tc_identity_no": customer.tc_identity_no or "",
        "is_tc_verified": bool(customer.is_tc_verified),
        "customer_type": customer.customer_type,
        "source": customer.source,
        "notes": customer.notes or "",
        "property_count": int(property_count),
        "appointment_count": int(appointment_count),
        "created_at": customer.created_at.isoformat() if customer.created_at else "",
    }


def _validate_customer_fields(
    *,
    first_name: str,
    last_name: str,
    mobile_phone: str,
    home_phone: str | None,
    email: str | None,
    tc_identity_no: str | None,
    customer_type: str,
    notes: str | None,
    agency_id: int | None = None,
    check_agency: bool = False,
    db: Session,
) -> dict:
    field_errors: dict[str, str] = {}

    if check_agency:
        if agency_id is None or db.get(Agency, agency_id) is None:
            field_errors["agency_id"] = "Geçerli bir emlak işletmesi seçilmelidir."

    cleaned_first = (first_name or "").strip()
    if len(cleaned_first) < 2:
        field_errors["first_name"] = "Ad alanı en az 2 karakter olmalıdır."
    elif DIGIT_RE.search(cleaned_first):
        field_errors["first_name"] = "Ad alanı rakam içeremez."

    cleaned_last = (last_name or "").strip()
    if len(cleaned_last) < 2:
        field_errors["last_name"] = "Soyad alanı en az 2 karakter olmalıdır."
    elif DIGIT_RE.search(cleaned_last):
        field_errors["last_name"] = "Soyad alanı rakam içeremez."

    mob_ok, formatted_mobile, mob_err = normalize_and_validate_phone(
        mobile_phone, is_mobile=True
    )
    if not mob_ok:
        field_errors["mobile_phone"] = mob_err

    formatted_home: str | None = None
    if home_phone and home_phone.strip():
        home_ok, normalized_home, home_err = normalize_and_validate_phone(
            home_phone, is_mobile=False
        )
        if not home_ok:
            field_errors["home_phone"] = f"Ev telefonu geçersiz: {home_err}"
        else:
            formatted_home = normalized_home

    cleaned_email: str | None = None
    if email and email.strip():
        candidate_email = email.strip().lower()
        if not EMAIL_RE.match(candidate_email):
            field_errors["email"] = "Lütfen geçerli bir e-posta adresi giriniz."
        else:
            cleaned_email = candidate_email

    cleaned_tc: str | None = None
    is_tc_verified = False
    if tc_identity_no and tc_identity_no.strip():
        tc_ok, normalized_tc, tc_err = validate_tc_identity_no(tc_identity_no)
        if not tc_ok:
            field_errors["tc_identity_no"] = tc_err
        else:
            cleaned_tc = normalized_tc
            is_tc_verified = True

    cleaned_type = (customer_type or "").strip().upper()
    if cleaned_type not in VALID_CUSTOMER_TYPES:
        field_errors["customer_type"] = (
            "Geçerli bir müşteri tipi seçiniz "
            "(Alıcı, Satıcı, Kiralık Mülk Sahibi veya Kiracı)."
        )

    if field_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": next(iter(field_errors.values())),
                "field_errors": field_errors,
            },
        )

    cleaned_notes = notes.strip() if notes and notes.strip() else None

    return {
        "first_name": cleaned_first,
        "last_name": cleaned_last,
        "mobile_phone": formatted_mobile,
        "home_phone": formatted_home,
        "email": cleaned_email,
        "tc_identity_no": cleaned_tc,
        "is_tc_verified": is_tc_verified,
        "customer_type": cleaned_type,
        "notes": cleaned_notes,
    }


def _matches_search(item: dict, raw_search: str) -> bool:
    query_norm = normalize_turkish_search(raw_search.strip())
    if not query_norm:
        return True

    text_fields = (
        item["first_name"],
        item["last_name"],
        item["full_name"],
        item["mobile_phone"],
        item["home_phone"],
        item["email"],
        item["tc_identity_no"],
    )
    for val in text_fields:
        if val and query_norm in normalize_turkish_search(val):
            return True

    query_digits = re.sub(r"\D", "", raw_search)
    if query_digits:
        for phone_or_id in (
            item["mobile_phone"],
            item["home_phone"],
            item["tc_identity_no"],
        ):
            if phone_or_id and query_digits in re.sub(r"\D", "", phone_or_id):
                return True

    return False


@router.get("")
def list_customers(
    agency_id: int | None = None,
    customer_type: str | None = None,
    search: str | None = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    db: Session = Depends(get_db),
) -> dict:
    from sqlalchemy import or_

    base_stmt = select(Customer)
    if agency_id is not None:
        appt_cust_ids = select(Appointment.customer_id).where(
            Appointment.agency_id == agency_id
        )
        if agency_id == 1:
            base_stmt = base_stmt.where(
                or_(
                    Customer.agency_id == agency_id,
                    Customer.agency_id.is_(None),
                    Customer.id.in_(appt_cust_ids),
                    Customer.source.in_(["SELF_KAYIT", "ONLINE_RANDEVU"]),
                )
            )
        else:
            base_stmt = base_stmt.where(
                or_(
                    Customer.agency_id == agency_id,
                    Customer.id.in_(appt_cust_ids),
                )
            )

    scoped_customers = db.scalars(base_stmt).all()

    counts: dict[str, int] = {
        "ALL": len(scoped_customers),
        "ALICI": 0,
        "SATICI": 0,
        "KIRALAYAN": 0,
        "KIRACI": 0,
    }
    for cust in scoped_customers:
        if cust.customer_type in VALID_CUSTOMER_TYPES:
            counts[cust.customer_type] += 1

    normalized_type = (customer_type or "").strip().upper()
    if normalized_type in VALID_CUSTOMER_TYPES:
        filtered_models = [
            c for c in scoped_customers if c.customer_type == normalized_type
        ]
    else:
        filtered_models = list(scoped_customers)

    serialized = [serialize_customer(c, db) for c in filtered_models]

    if search and search.strip():
        serialized = [item for item in serialized if _matches_search(item, search)]

    reverse = (sort_dir or "desc").strip().lower() == "desc"
    sort_field = (sort_by or "created_at").strip().lower()

    if sort_field == "name":
        serialized.sort(
            key=lambda item: turkish_sort_key(item["full_name"]),
            reverse=reverse,
        )
    elif sort_field == "property_count":
        serialized.sort(
            key=lambda item: (item["property_count"], item["id"]),
            reverse=reverse,
        )
    elif sort_field == "customer_type":
        serialized.sort(
            key=lambda item: (
                turkish_sort_key(item["customer_type"]),
                turkish_sort_key(item["full_name"]),
            ),
            reverse=reverse,
        )
    else:
        serialized.sort(
            key=lambda item: (item["created_at"], item["id"]),
            reverse=reverse,
        )

    return {"customers": serialized, "counts": counts}


@router.get("/{customer_id}")
def get_customer_detail(customer_id: int, db: Session = Depends(get_db)) -> dict:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Müşteri kaydı bulunamadı.",
        )

    properties = db.scalars(
        select(Property)
        .where(Property.owner_customer_id == customer.id)
        .order_by(Property.created_at.desc(), Property.id.desc())
    ).all()

    owned_properties = [
        {
            "id": prop.id,
            "title": prop.title,
            "listing_type": prop.listing_type,
            "property_type": prop.property_type,
            "room_count": prop.room_count,
            "gross_sqm": prop.gross_sqm,
            "net_sqm": prop.net_sqm,
            "floor_number": prop.floor_number,
            "building_floors": prop.building_floors,
            "heating_type": prop.heating_type,
            "price": float(prop.price),
            "city": prop.city,
            "district": prop.district,
            "neighborhood": prop.neighborhood,
            "status": prop.status,
            "is_owner_id_verified": bool(prop.is_owner_id_verified),
            "image_url": prop.image_url or "",
            "created_at": prop.created_at.isoformat() if prop.created_at else "",
        }
        for prop in properties
    ]

    appts = db.scalars(
        select(Appointment)
        .where(Appointment.customer_id == customer.id)
        .order_by(Appointment.start_time.desc(), Appointment.id.desc())
    ).all()

    appointments = [
        {
            "id": appt.id,
            "appointment_type": appt.appointment_type,
            "purpose": appt.purpose,
            "property_id": appt.property_id,
            "property_title": appt.property_item.title if appt.property_item else "",
            "start_time": appt.start_time.isoformat() if appt.start_time else "",
            "end_time": appt.end_time.isoformat() if appt.end_time else "",
            "status": appt.status,
            "meeting_notes": appt.meeting_notes or "",
        }
        for appt in appts
    ]

    return {
        "customer": {
            **serialize_customer(customer, db),
            "owned_properties": owned_properties,
            "appointments": appointments,
        }
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreateRequest, db: Session = Depends(get_db)
) -> dict:
    cleaned = _validate_customer_fields(
        first_name=payload.first_name,
        last_name=payload.last_name,
        mobile_phone=payload.mobile_phone,
        home_phone=payload.home_phone,
        email=payload.email,
        tc_identity_no=payload.tc_identity_no,
        customer_type=payload.customer_type,
        notes=payload.notes,
        agency_id=payload.agency_id,
        check_agency=True,
        db=db,
    )

    customer = Customer(
        agency_id=payload.agency_id,
        first_name=cleaned["first_name"],
        last_name=cleaned["last_name"],
        mobile_phone=cleaned["mobile_phone"],
        home_phone=cleaned["home_phone"],
        email=cleaned["email"],
        tc_identity_no=cleaned["tc_identity_no"],
        is_tc_verified=cleaned["is_tc_verified"],
        customer_type=cleaned["customer_type"],
        source="MANUEL",
        notes=cleaned["notes"],
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    return {
        "message": "Müşteri kaydı başarıyla oluşturuldu.",
        "customer": serialize_customer(customer, db),
    }


@router.put("/{customer_id}")
def update_customer(
    customer_id: int, payload: CustomerUpdateRequest, db: Session = Depends(get_db)
) -> dict:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Güncellenecek müşteri kaydı bulunamadı.",
        )

    cleaned = _validate_customer_fields(
        first_name=payload.first_name,
        last_name=payload.last_name,
        mobile_phone=payload.mobile_phone,
        home_phone=payload.home_phone,
        email=payload.email,
        tc_identity_no=payload.tc_identity_no,
        customer_type=payload.customer_type,
        notes=payload.notes,
        db=db,
    )

    customer.first_name = cleaned["first_name"]
    customer.last_name = cleaned["last_name"]
    customer.mobile_phone = cleaned["mobile_phone"]
    customer.home_phone = cleaned["home_phone"]
    customer.email = cleaned["email"]
    customer.tc_identity_no = cleaned["tc_identity_no"]
    customer.is_tc_verified = cleaned["is_tc_verified"]
    customer.customer_type = cleaned["customer_type"]
    customer.notes = cleaned["notes"]

    db.commit()
    db.refresh(customer)

    return {
        "message": "Müşteri bilgileri başarıyla güncellendi.",
        "customer": serialize_customer(customer, db),
    }
