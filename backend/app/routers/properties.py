import random
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.validators import (
    DEFAULT_PROPERTY_IMAGES,
    normalize_tr_search,
    validate_tc_identity_no,
)
from app.models import Agency, Customer, Property
from app.schemas.property import (
    PropertyCreateRequest,
    PropertyStatusUpdateRequest,
    PropertyUpdateRequest,
)

router = APIRouter(prefix="/api/properties", tags=["Portföy (Emlak) Yönetimi"])

VALID_LISTING_TYPES = {"SATILIK", "KIRALIK"}
VALID_PROPERTY_TYPES = {"DAIRE", "VILLA", "ISYERI", "ARSA"}
VALID_ROOM_COUNTS = {"1+0", "1+1", "2+1", "3+1", "4+1", "5+1"}
VALID_HEATING_TYPES = {
    "DOGALGAZ_KOMBI",
    "MERKEZI",
    "YERDEN_ISITMA",
    "KLIMA",
    "SOBA",
}
VALID_STATUSES = {"AKTIF", "SATILDI", "KIRALANDI", "PASIF"}

STATUS_LABELS = {
    "AKTIF": "Aktif",
    "SATILDI": "Satıldı",
    "KIRALANDI": "Kiralandı",
    "PASIF": "Pasif",
}


def serialize_property(prop: Property, db: Session) -> dict:
    owner = prop.owner_customer or db.get(Customer, prop.owner_customer_id)
    return {
        "id": prop.id,
        "agency_id": prop.agency_id,
        "owner_customer_id": prop.owner_customer_id,
        "title": prop.title,
        "listing_type": prop.listing_type,
        "property_type": prop.property_type,
        "gross_sqm": prop.gross_sqm,
        "net_sqm": prop.net_sqm,
        "room_count": prop.room_count,
        "floor_number": prop.floor_number,
        "building_floors": prop.building_floors,
        "heating_type": prop.heating_type,
        "price": float(prop.price),
        "city": prop.city,
        "district": prop.district,
        "neighborhood": prop.neighborhood,
        "address_detail": prop.address_detail,
        "agent_description": prop.agent_description,
        "status": prop.status,
        "is_owner_id_verified": prop.is_owner_id_verified,
        "image_url": prop.image_url or "",
        "created_at": prop.created_at.isoformat() if prop.created_at else "",
        "owner": (
            {
                "id": owner.id,
                "full_name": f"{owner.first_name} {owner.last_name}",
                "mobile_phone": owner.mobile_phone,
                "tc_identity_no": owner.tc_identity_no or "",
                "is_tc_verified": owner.is_tc_verified,
                "customer_type": owner.customer_type,
            }
            if owner
            else None
        ),
    }


def _validate_and_resolve_property(
    payload: PropertyCreateRequest | PropertyUpdateRequest,
    agency_id: int,
    db: Session,
) -> tuple[Customer, str]:
    agency = db.get(Agency, agency_id)
    if agency is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emlak işletmesi kaydı bulunamadı.",
        )

    field_errors: dict[str, str] = {}

    # BR-03: Sahipsiz Ev Olmaz
    owner: Customer | None = None
    if not payload.owner_customer_id or payload.owner_customer_id <= 0:
        field_errors["owner_customer_id"] = (
            "BR-03: Sahipsiz gayrimenkul kaydedilemez. Lütfen geçerli bir mülk sahibi seçiniz."
        )
    else:
        owner = db.get(Customer, payload.owner_customer_id)
        if owner is None or (
            owner.agency_id is not None and owner.agency_id != agency_id
        ):
            owner = None
            field_errors["owner_customer_id"] = (
                "BR-03: Sahipsiz gayrimenkul kaydedilemez. Lütfen geçerli bir mülk sahibi seçiniz."
            )

    # BR-04: İlan Yüklerken Kimlik Doğrulama
    candidate_tc = ""
    if payload.owner_tc_identity_no and payload.owner_tc_identity_no.strip():
        candidate_tc = payload.owner_tc_identity_no.strip()
    elif owner is not None and owner.tc_identity_no:
        candidate_tc = owner.tc_identity_no.strip()

    tc_ok, cleaned_tc, _tc_err = validate_tc_identity_no(candidate_tc)
    if not tc_ok:
        field_errors["owner_tc_identity_no"] = (
            "BR-04: İlan yüklenebilmesi için mülk sahibinin geçerli 11 haneli "
            "T.C. Kimlik Numarası doğrulanmalıdır."
        )

    # Teknik alan doğrulamaları
    if len(payload.title.strip()) < 5:
        field_errors["title"] = "İlan başlığı en az 5 karakter olmalıdır."

    listing_type = payload.listing_type.strip().upper()
    if listing_type not in VALID_LISTING_TYPES:
        field_errors["listing_type"] = "Geçerli bir işlem türü seçiniz (Satılık / Kiralık)."

    property_type = payload.property_type.strip().upper()
    if property_type not in VALID_PROPERTY_TYPES:
        field_errors["property_type"] = "Geçerli bir emlak türü seçiniz."

    room_count = payload.room_count.strip()
    if room_count not in VALID_ROOM_COUNTS:
        field_errors["room_count"] = "Geçerli bir oda sayısı seçiniz."

    heating_type = payload.heating_type.strip().upper()
    if heating_type not in VALID_HEATING_TYPES:
        field_errors["heating_type"] = "Geçerli bir ısınma türü seçiniz."

    prop_status = payload.status.strip().upper()
    if prop_status not in VALID_STATUSES:
        field_errors["status"] = "Geçerli bir ilan durumu seçiniz."

    if payload.gross_sqm <= 0:
        field_errors["gross_sqm"] = "Brüt m² 0'dan büyük olmalıdır."
    if payload.net_sqm <= 0:
        field_errors["net_sqm"] = "Net m² 0'dan büyük olmalıdır."
    elif payload.gross_sqm > 0 and payload.net_sqm > payload.gross_sqm:
        field_errors["net_sqm"] = "Net m² değeri brüt m² değerinden büyük olamaz."

    if property_type == "ARSA":
        if payload.building_floors < 0:
            field_errors["building_floors"] = "Bina toplam kat sayısı 0 veya daha büyük olmalıdır."
        if payload.floor_number < 0:
            field_errors["floor_number"] = "Arsa için bulunduğu kat 0 veya daha büyük olmalıdır."
        elif payload.building_floors >= 0 and payload.floor_number > payload.building_floors:
            field_errors["floor_number"] = "Bulunduğu kat bina toplam kat sayısından büyük olamaz."
    else:
        if payload.building_floors < 1:
            field_errors["building_floors"] = "Bina toplam kat sayısı en az 1 olmalıdır."
        if payload.floor_number < -3:
            field_errors["floor_number"] = "Bulunduğu kat bilgisi geçersizdir."
        elif payload.building_floors >= 1 and payload.floor_number > payload.building_floors:
            field_errors["floor_number"] = "Bulunduğu kat bina toplam kat sayısından büyük olamaz."

    if payload.price <= 0:
        field_errors["price"] = "İlan fiyatı 0 TL'den büyük olmalıdır."

    if not payload.city.strip():
        field_errors["city"] = "Lütfen il seçiniz."
    if not payload.district.strip():
        field_errors["district"] = "Lütfen ilçe seçiniz."
    if not payload.neighborhood.strip():
        field_errors["neighborhood"] = "Lütfen mahalle seçiniz."
    if len(payload.address_detail.strip()) < 5:
        field_errors["address_detail"] = "Açık adres detayı en az 5 karakter olmalıdır."
    if len(payload.agent_description.strip()) < 15:
        field_errors["agent_description"] = (
            "Emlakçı özel tasviri en az 15 karakter olmalıdır."
        )

    if field_errors or owner is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": next(iter(field_errors.values())),
                "field_errors": field_errors,
            },
        )

    return owner, cleaned_tc


@router.get("")
def list_properties(
    agency_id: int | None = Query(default=None),
    listing_type: str | None = Query(default=None),
    property_type: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    owner_customer_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Property).order_by(Property.created_at.desc(), Property.id.desc())
    if agency_id is not None:
        stmt = stmt.where(Property.agency_id == agency_id)

    scoped_props = list(db.scalars(stmt).all())

    counts = {
        "ALL": len(scoped_props),
        "AKTIF": 0,
        "SATILDI": 0,
        "KIRALANDI": 0,
        "PASIF": 0,
    }
    for item in scoped_props:
        if item.status in counts:
            counts[item.status] += 1

    filtered = scoped_props
    if listing_type and listing_type.strip().upper() not in {"", "ALL"}:
        lt = listing_type.strip().upper()
        filtered = [p for p in filtered if p.listing_type == lt]

    if property_type and property_type.strip().upper() not in {"", "ALL"}:
        pt = property_type.strip().upper()
        filtered = [p for p in filtered if p.property_type == pt]

    if status_filter and status_filter.strip().upper() not in {"", "ALL"}:
        st = status_filter.strip().upper()
        filtered = [p for p in filtered if p.status == st]

    if owner_customer_id is not None:
        filtered = [p for p in filtered if p.owner_customer_id == owner_customer_id]

    if search and search.strip():
        q = normalize_tr_search(search.strip())
        matched: list[Property] = []
        for p in filtered:
            owner = p.owner_customer or db.get(Customer, p.owner_customer_id)
            owner_name = f"{owner.first_name} {owner.last_name}" if owner else ""
            owner_phone = owner.mobile_phone if owner else ""
            haystack = normalize_tr_search(
                f"{p.title} {p.city} {p.district} {p.neighborhood} "
                f"{p.address_detail} {p.agent_description} {owner_name} {owner_phone}"
            )
            if q in haystack:
                matched.append(p)
        filtered = matched

    return {
        "properties": [serialize_property(p, db) for p in filtered],
        "counts": counts,
    }


@router.get("/{property_id}")
def get_property_detail(property_id: int, db: Session = Depends(get_db)) -> dict:
    prop = db.get(Property, property_id)
    if prop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gayrimenkul ilanı bulunamadı.",
        )
    return {"property": serialize_property(prop, db)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_property(
    payload: PropertyCreateRequest, db: Session = Depends(get_db)
) -> dict:
    owner, cleaned_tc = _validate_and_resolve_property(
        payload=payload, agency_id=payload.agency_id, db=db
    )

    if owner.agency_id is None:
        owner.agency_id = payload.agency_id
    owner.tc_identity_no = cleaned_tc
    owner.is_tc_verified = True

    assigned_image = (
        payload.image_url.strip()
        if payload.image_url and payload.image_url.strip()
        else random.choice(DEFAULT_PROPERTY_IMAGES)
    )

    new_prop = Property(
        agency_id=payload.agency_id,
        owner_customer_id=owner.id,
        title=payload.title.strip(),
        listing_type=payload.listing_type.strip().upper(),
        property_type=payload.property_type.strip().upper(),
        gross_sqm=payload.gross_sqm,
        net_sqm=payload.net_sqm,
        room_count=payload.room_count.strip(),
        floor_number=payload.floor_number,
        building_floors=payload.building_floors,
        heating_type=payload.heating_type.strip().upper(),
        price=payload.price,
        city=payload.city.strip(),
        district=payload.district.strip(),
        neighborhood=payload.neighborhood.strip(),
        address_detail=payload.address_detail.strip(),
        agent_description=payload.agent_description.strip(),
        status=payload.status.strip().upper(),
        is_owner_id_verified=True,
        image_url=assigned_image,
    )
    db.add(new_prop)
    db.commit()
    db.refresh(new_prop)

    return {
        "message": "Gayrimenkul ilanı kimlik doğrulaması yapılarak portföye eklendi.",
        "property": serialize_property(new_prop, db),
    }


@router.put("/{property_id}")
def update_property(
    property_id: int,
    payload: PropertyUpdateRequest,
    db: Session = Depends(get_db),
) -> dict:
    prop = db.get(Property, property_id)
    if prop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Güncellenecek gayrimenkul ilanı bulunamadı.",
        )

    if payload.agency_id is not None and payload.agency_id != prop.agency_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu gayrimenkul ilanı farklı bir emlak işletmesine aittir.",
        )

    owner, cleaned_tc = _validate_and_resolve_property(
        payload=payload, agency_id=prop.agency_id, db=db
    )

    if owner.agency_id is None:
        owner.agency_id = prop.agency_id
    owner.tc_identity_no = cleaned_tc
    owner.is_tc_verified = True

    prop.owner_customer_id = owner.id
    prop.title = payload.title.strip()
    prop.listing_type = payload.listing_type.strip().upper()
    prop.property_type = payload.property_type.strip().upper()
    prop.gross_sqm = payload.gross_sqm
    prop.net_sqm = payload.net_sqm
    prop.room_count = payload.room_count.strip()
    prop.floor_number = payload.floor_number
    prop.building_floors = payload.building_floors
    prop.heating_type = payload.heating_type.strip().upper()
    prop.price = payload.price
    prop.city = payload.city.strip()
    prop.district = payload.district.strip()
    prop.neighborhood = payload.neighborhood.strip()
    prop.address_detail = payload.address_detail.strip()
    prop.agent_description = payload.agent_description.strip()
    prop.status = payload.status.strip().upper()
    prop.is_owner_id_verified = True
    if payload.image_url is not None:
        prop.image_url = (
            payload.image_url.strip()
            if payload.image_url.strip()
            else random.choice(DEFAULT_PROPERTY_IMAGES)
        )

    db.commit()
    db.refresh(prop)

    return {
        "message": "Gayrimenkul ilanı başarıyla güncellendi.",
        "property": serialize_property(prop, db),
    }


@router.patch("/{property_id}/status")
def update_property_status(
    property_id: int,
    payload: PropertyStatusUpdateRequest,
    db: Session = Depends(get_db),
) -> dict:
    prop = db.get(Property, property_id)
    if prop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Durumu güncellenecek gayrimenkul ilanı bulunamadı.",
        )

    next_status = payload.status.strip().upper()
    if next_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Geçersiz ilan durumu seçildi.",
                "field_errors": {"status": "Geçerli bir ilan durumu seçiniz."},
            },
        )

    prop.status = next_status
    db.commit()
    db.refresh(prop)

    label = STATUS_LABELS.get(next_status, next_status)
    return {
        "message": f"İlan durumu '{label}' olarak güncellendi.",
        "property": serialize_property(prop, db),
    }
