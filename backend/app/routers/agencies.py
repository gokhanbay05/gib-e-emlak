import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.validators import normalize_and_validate_phone
from app.models import Agency, Appointment, Customer, Property
from app.schemas.agency import AgencyUpdateRequest

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
