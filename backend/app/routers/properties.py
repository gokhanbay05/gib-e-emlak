from datetime import datetime, timezone
import html
import random
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.validators import (
    DEFAULT_PROPERTY_IMAGES,
    normalize_tr_search,
    validate_tc_identity_no,
)
from app.models import Agency, Customer, CustomerSearchRequest, Property
from app.schemas.property import (
    CustomerSearchRequestCreate,
    PropertyCreateRequest,
    PropertyStatusUpdateRequest,
    PropertyUpdateRequest,
)

router = APIRouter(
    prefix="/api/properties",
    tags=["Portföy, Detaylı Arama & Yazıcı Çıktısı"],
)

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

LISTING_LABELS = {
    "SATILIK": "Satılık",
    "KIRALIK": "Kiralık",
}

PROPERTY_TYPE_LABELS = {
    "DAIRE": "Daire",
    "VILLA": "Villa",
    "ISYERI": "İşyeri",
    "ARSA": "Arsa",
}

HEATING_LABELS = {
    "DOGALGAZ_KOMBI": "Doğalgaz Kombi",
    "MERKEZI": "Merkezi Sistem",
    "YERDEN_ISITMA": "Yerden Isıtma",
    "KLIMA": "Klima",
    "SOBA": "Soba",
}

CUSTOMER_TYPE_LABELS = {
    "ALICI": "Alıcı",
    "SATICI": "Satıcı",
    "KIRALAYAN": "Kiralık Mülk Sahibi",
    "KIRACI": "Kiracı",
}


def _format_try_currency(amount: float | int) -> str:
    formatted = f"{int(round(float(amount))):,}".replace(",", ".")
    return f"₺{formatted}"


def serialize_agency_summary(agency: Agency | None) -> dict | None:
    if agency is None:
        return None
    return {
        "id": agency.id,
        "name": agency.name,
        "authorized_person": agency.authorized_person,
        "phone": agency.phone,
        "mobile_phone": agency.mobile_phone or "",
        "fax": agency.fax or "",
        "tax_office": agency.tax_office or "",
        "tax_number": agency.tax_number or "",
        "city": agency.city or "",
        "district": agency.district or "",
        "neighborhood": agency.neighborhood or "",
        "address": agency.address,
        "ttbs_document_no": agency.ttbs_document_no,
        "is_ttbs_verified": bool(agency.is_ttbs_verified),
        "logo_url": agency.logo_url or "",
    }


def serialize_property(prop: Property, db: Session) -> dict:
    owner = prop.owner_customer or db.get(Customer, prop.owner_customer_id)
    agency = prop.agency or db.get(Agency, prop.agency_id)
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
                "home_phone": owner.home_phone or "",
                "email": owner.email or "",
                "tc_identity_no": owner.tc_identity_no or "",
                "is_tc_verified": owner.is_tc_verified,
                "customer_type": owner.customer_type,
            }
            if owner
            else None
        ),
        "agency": serialize_agency_summary(agency),
    }


def serialize_search_request(req: CustomerSearchRequest, db: Session) -> dict:
    customer = req.customer or db.get(Customer, req.customer_id)
    return {
        "id": req.id,
        "agency_id": req.agency_id,
        "customer_id": req.customer_id,
        "customer_name": (
            f"{customer.first_name} {customer.last_name}".strip() if customer else ""
        ),
        "customer_type": customer.customer_type if customer else "",
        "customer_phone": customer.mobile_phone if customer else "",
        "listing_type": req.listing_type,
        "property_type": req.property_type or "",
        "min_sqm": req.min_sqm,
        "max_sqm": req.max_sqm,
        "room_count": req.room_count or "",
        "floor_preference": req.floor_preference,
        "heating_type": req.heating_type or "",
        "min_price": float(req.min_price) if req.min_price is not None else None,
        "max_price": float(req.max_price) if req.max_price is not None else None,
        "city": req.city or "",
        "district": req.district or "",
        "natural_language_prompt": req.natural_language_prompt or "",
        "created_at": req.created_at.isoformat() if req.created_at else "",
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
    city: str | None = Query(default=None),
    district: str | None = Query(default=None),
    neighborhood: str | None = Query(default=None),
    min_price: float | None = Query(default=None),
    max_price: float | None = Query(default=None),
    min_sqm: int | None = Query(default=None),
    max_sqm: int | None = Query(default=None),
    room_count: str | None = Query(default=None),
    floor_number: int | None = Query(default=None),
    building_floors: int | None = Query(default=None),
    heating_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc"),
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

    if city and city.strip():
        city_norm = normalize_tr_search(city.strip())
        filtered = [
            p for p in filtered if city_norm == normalize_tr_search(p.city)
        ]

    if district and district.strip():
        dist_norm = normalize_tr_search(district.strip())
        filtered = [
            p for p in filtered if dist_norm == normalize_tr_search(p.district)
        ]

    if neighborhood and neighborhood.strip():
        nb_norm = normalize_tr_search(neighborhood.strip())
        filtered = [
            p
            for p in filtered
            if nb_norm in normalize_tr_search(p.neighborhood)
            or normalize_tr_search(p.neighborhood) in nb_norm
        ]

    if min_price is not None:
        filtered = [p for p in filtered if float(p.price) >= float(min_price)]

    if max_price is not None:
        filtered = [p for p in filtered if float(p.price) <= float(max_price)]

    if min_sqm is not None:
        filtered = [p for p in filtered if p.gross_sqm >= min_sqm]

    if max_sqm is not None:
        filtered = [p for p in filtered if p.gross_sqm <= max_sqm]

    if room_count and room_count.strip() not in {"", "ALL"}:
        rc = room_count.strip()
        filtered = [p for p in filtered if p.room_count == rc]

    if floor_number is not None:
        filtered = [p for p in filtered if p.floor_number == floor_number]

    if building_floors is not None:
        filtered = [p for p in filtered if p.building_floors == building_floors]

    if heating_type and heating_type.strip().upper() not in {"", "ALL"}:
        ht = heating_type.strip().upper()
        filtered = [p for p in filtered if p.heating_type == ht]

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

    reverse = (sort_dir or "desc").strip().lower() == "desc"
    sf = (sort_by or "created_at").strip().lower()
    if sf == "price":
        filtered.sort(key=lambda p: (float(p.price), p.id), reverse=reverse)
    elif sf in {"gross_sqm", "sqm"}:
        filtered.sort(key=lambda p: (p.gross_sqm, p.id), reverse=reverse)
    elif sf == "net_sqm":
        filtered.sort(key=lambda p: (p.net_sqm, p.id), reverse=reverse)
    else:
        filtered.sort(
            key=lambda p: (
                p.created_at.isoformat() if p.created_at else "",
                p.id,
            ),
            reverse=reverse,
        )

    return {
        "properties": [serialize_property(p, db) for p in filtered],
        "counts": counts,
    }


@router.get("/search-requests")
def list_search_requests(
    agency_id: int | None = Query(default=None),
    customer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(CustomerSearchRequest).order_by(
        CustomerSearchRequest.created_at.desc(),
        CustomerSearchRequest.id.desc(),
    )
    if agency_id is not None:
        stmt = stmt.where(CustomerSearchRequest.agency_id == agency_id)
    if customer_id is not None:
        stmt = stmt.where(CustomerSearchRequest.customer_id == customer_id)

    requests = db.scalars(stmt).all()
    return {
        "search_requests": [serialize_search_request(r, db) for r in requests]
    }


@router.post("/search-requests", status_code=status.HTTP_201_CREATED)
def create_search_request(
    payload: CustomerSearchRequestCreate, db: Session = Depends(get_db)
) -> dict:
    customer = db.get(Customer, payload.customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Talep kaydedilecek müşteri bulunamadı.",
        )

    listing_type = payload.listing_type.strip().upper()
    if listing_type not in VALID_LISTING_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Talep kaydı için işlem türü (Satılık veya Kiralık) seçilmelidir.",
        )

    prop_type = (
        payload.property_type.strip().upper()
        if payload.property_type and payload.property_type.strip().upper() in VALID_PROPERTY_TYPES
        else None
    )
    room_cnt = (
        payload.room_count.strip()
        if payload.room_count and payload.room_count.strip() in VALID_ROOM_COUNTS
        else None
    )
    heat_type = (
        payload.heating_type.strip().upper()
        if payload.heating_type and payload.heating_type.strip().upper() in VALID_HEATING_TYPES
        else None
    )

    new_req = CustomerSearchRequest(
        agency_id=payload.agency_id,
        customer_id=customer.id,
        listing_type=listing_type,
        property_type=prop_type,
        min_sqm=payload.min_sqm,
        max_sqm=payload.max_sqm,
        room_count=room_cnt,
        floor_preference=payload.floor_preference,
        heating_type=heat_type,
        min_price=payload.min_price,
        max_price=payload.max_price,
        city=payload.city.strip() if payload.city and payload.city.strip() else None,
        district=(
            payload.district.strip()
            if payload.district and payload.district.strip()
            else None
        ),
        natural_language_prompt=(
            payload.natural_language_prompt.strip()
            if payload.natural_language_prompt
            and payload.natural_language_prompt.strip()
            else None
        ),
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    return {
        "message": f"{customer.first_name} {customer.last_name} için emlak arama talebi kaydedildi.",
        "search_request": serialize_search_request(new_req, db),
    }


@router.get("/{property_id}/info-sheet")
def get_property_info_sheet_data(
    property_id: int,
    customer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """BR-05: Yazıcı / PDF Kurumsal Bilgi Fişi verisini tek pakette döner."""
    prop = db.get(Property, property_id)
    if prop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bilgi fişi üretilecek gayrimenkul ilanı bulunamadı.",
        )

    seeker = db.get(Customer, customer_id) if customer_id is not None else None
    now_str = datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M")

    return {
        "document_no": f"GIB-EMLAK-{prop.agency_id:02d}-{prop.id:04d}",
        "generated_at": now_str,
        "property": serialize_property(prop, db),
        "seeker_customer": (
            {
                "id": seeker.id,
                "full_name": f"{seeker.first_name} {seeker.last_name}".strip(),
                "customer_type": seeker.customer_type,
                "mobile_phone": seeker.mobile_phone,
                "home_phone": seeker.home_phone or "",
                "email": seeker.email or "",
                "tc_identity_no": seeker.tc_identity_no or "",
                "notes": seeker.notes or "",
            }
            if seeker
            else None
        ),
    }


@router.get("/{property_id}/print-sheet", response_class=HTMLResponse)
def render_property_print_sheet(
    property_id: int,
    customer_id: int | None = Query(default=None),
    auto_print: int = Query(default=1),
    db: Session = Depends(get_db),
) -> HTMLResponse:
    """
    BR-05 (GİB 4. Madde & Altın Senaryo):
    A4 Yazıcı / PDF Bilgi Fişi Çıktısı.
    Üstte Emlak Ofisi Logosu + İşyeri ve TTBS Yetki Belgesi bilgileri,
    ortada Gayrimenkulün tüm teknik özellikleri ve emlakçı özel tasviri,
    altta Mülk Sahibi, Talep Eden (Arayan) Müşteri ve Danışman iletişim/imza alanları yer alır.
    """
    prop = db.get(Property, property_id)
    if prop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Yazdırılacak gayrimenkul ilanı bulunamadı.",
        )

    agency = prop.agency or db.get(Agency, prop.agency_id)
    owner = prop.owner_customer or db.get(Customer, prop.owner_customer_id)
    seeker = db.get(Customer, customer_id) if customer_id is not None else None

    doc_no = f"GIB-EMLAK-{(agency.id if agency else 1):02d}-{prop.id:04d}"
    generated_at = datetime.now().strftime("%d.%m.%Y %H:%M")

    e = html.escape
    agency_name = e(agency.name if agency else "Yetki Belgeli Emlak İşletmesi")
    agency_auth = e(agency.authorized_person if agency else "-")
    agency_ttbs = e(agency.ttbs_document_no if agency else "-")
    agency_phone = e(agency.phone if agency else "-")
    agency_mobile = e(agency.mobile_phone or "-") if agency else "-"
    agency_fax = e(agency.fax or "-") if agency else "-"
    agency_tax = (
        e(f"{agency.tax_office or '-'} / {agency.tax_number or '-'}")
        if agency
        else "-"
    )
    agency_address = (
        e(
            f"{agency.neighborhood or ''} {agency.address} "
            f"{agency.district or ''} / {agency.city or ''}".strip()
        )
        if agency
        else "-"
    )
    logo_html = (
        f'<img src="{e(agency.logo_url)}" alt="Logo" class="logo" />'
        if agency and agency.logo_url
        else '<div class="logo-placeholder">GİB e-Emlak</div>'
    )

    prop_image_html = (
        f'<img src="{e(prop.image_url)}" alt="{e(prop.title)}" class="prop-img" />'
        if prop.image_url
        else ""
    )

    listing_label = e(LISTING_LABELS.get(prop.listing_type, prop.listing_type))
    prop_type_label = e(
        PROPERTY_TYPE_LABELS.get(prop.property_type, prop.property_type)
    )
    heating_label = e(HEATING_LABELS.get(prop.heating_type, prop.heating_type))
    status_label = e(STATUS_LABELS.get(prop.status, prop.status))
    price_str = e(_format_try_currency(float(prop.price)))

    owner_name = (
        e(f"{owner.first_name} {owner.last_name}".strip()) if owner else "-"
    )
    owner_phone = e(owner.mobile_phone) if owner else "-"
    owner_tc = (
        e(f"{owner.tc_identity_no} (BR-04 Doğrulandı)")
        if owner and owner.tc_identity_no
        else "Doğrulandı"
    )

    if seeker is not None:
        seeker_name = e(f"{seeker.first_name} {seeker.last_name}".strip())
        seeker_type = e(
            CUSTOMER_TYPE_LABELS.get(seeker.customer_type, seeker.customer_type)
        )
        seeker_mobile = e(seeker.mobile_phone)
        seeker_home = e(seeker.home_phone or "Belirtilmedi")
        seeker_email = e(seeker.email or "Belirtilmedi")
    else:
        seeker_name = "Genel Müşteri Bilgilendirme Fişi"
        seeker_type = "Alıcı / Kiracı Adayı"
        seeker_mobile = "-"
        seeker_home = "-"
        seeker_email = "-"

    auto_print_script = (
        "<script>window.addEventListener('load', () => { setTimeout(() => window.print(), 250); });</script>"
        if auto_print == 1
        else ""
    )

    html_doc = f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>{e(doc_no)} — Gayrimenkul Bilgi Fişi</title>
  <style>
    @page {{ size: A4; margin: 12mm; }}
    * {{ box-sizing: border-box; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #111827;
      background: #f3f4f6;
      margin: 0;
      padding: 16px;
      line-height: 1.45;
    }}
    .toolbar {{
      max-width: 210mm;
      margin: 0 auto 12px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #111827;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 8px;
    }}
    .toolbar button {{
      background: #ffffff;
      color: #111827;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }}
    .sheet {{
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 20px 24px;
    }}
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      border-bottom: 2px solid #111827;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }}
    .agency-box {{
      display: flex;
      gap: 14px;
      align-items: center;
    }}
    .logo {{
      width: 68px;
      height: 68px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #d1d5db;
    }}
    .logo-placeholder {{
      width: 68px;
      height: 68px;
      border-radius: 8px;
      background: #111827;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      text-align: center;
    }}
    .agency-title {{
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 700;
    }}
    .meta-line {{
      margin: 2px 0;
      font-size: 12px;
      color: #374151;
    }}
    .doc-box {{
      text-align: right;
      font-size: 12px;
    }}
    .doc-badge {{
      display: inline-block;
      background: #111827;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 11px;
      margin-bottom: 6px;
    }}
    .title-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }}
    .prop-title {{
      margin: 0;
      font-size: 16px;
      font-weight: 700;
    }}
    .prop-sub {{
      margin: 3px 0 0 0;
      font-size: 12px;
      color: #4b5563;
    }}
    .price-box {{
      font-size: 20px;
      font-weight: 800;
      color: #111827;
      white-space: nowrap;
    }}
    .main-grid {{
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }}
    table.specs {{
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }}
    table.specs th, table.specs td {{
      border: 1px solid #e5e7eb;
      padding: 7px 10px;
      text-align: left;
    }}
    table.specs th {{
      background: #f9fafb;
      width: 44%;
      color: #374151;
      font-weight: 600;
    }}
    .prop-img {{
      width: 100%;
      height: 225px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }}
    .section {{
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 14px;
    }}
    .section h3 {{
      margin: 0 0 6px 0;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #374151;
    }}
    .section p {{
      margin: 0;
      font-size: 13px;
      color: #111827;
    }}
    .parties {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }}
    .signatures {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px dashed #9ca3af;
      font-size: 12px;
      color: #4b5563;
    }}
    .sig-box {{
      height: 54px;
    }}
    @media print {{
      body {{ background: #ffffff; padding: 0; }}
      .toolbar {{ display: none; }}
      .sheet {{ border: none; padding: 0; max-width: 100%; }}
    }}
  </style>
  {auto_print_script}
</head>
<body>
  <div class="toolbar">
    <span><strong>GİB e-Emlak</strong> · Kurumsal Gayrimenkul Bilgi Fişi ({e(doc_no)})</span>
    <button onclick="window.print()">Yazdır / PDF Olarak Kaydet</button>
  </div>

  <div class="sheet">
    <div class="header">
      <div class="agency-box">
        {logo_html}
        <div>
          <h1 class="agency-title">{agency_name}</h1>
          <div class="meta-line"><strong>Yetkili:</strong> {agency_auth} · <strong>TTBS Yetki Belge No:</strong> {agency_ttbs} (DOĞRULANDI)</div>
          <div class="meta-line"><strong>Tel:</strong> {agency_phone} · <strong>Cep:</strong> {agency_mobile} · <strong>Fax:</strong> {agency_fax}</div>
          <div class="meta-line"><strong>Vergi Dairesi / No:</strong> {agency_tax}</div>
          <div class="meta-line"><strong>İşyeri Adresi:</strong> {agency_address}</div>
        </div>
      </div>
      <div class="doc-box">
        <div class="doc-badge">GAYRİMENKUL BİLGİ FİŞİ</div>
        <div><strong>Belge No:</strong> {e(doc_no)}</div>
        <div><strong>Tarih:</strong> {e(generated_at)}</div>
        <div><strong>İlan Durumu:</strong> {status_label}</div>
      </div>
    </div>

    <div class="title-bar">
      <div>
        <h2 class="prop-title">{e(prop.title)}</h2>
        <p class="prop-sub">{listing_label} · {prop_type_label} · {e(prop.neighborhood)}, {e(prop.district)} / {e(prop.city)}</p>
      </div>
      <div class="price-box">{price_str}</div>
    </div>

    <div class="main-grid">
      <table class="specs">
        <tbody>
          <tr><th>İlan Kayıt No</th><td>#{prop.id}</td></tr>
          <tr><th>İşlem / Emlak Türü</th><td>{listing_label} / {prop_type_label}</td></tr>
          <tr><th>Oda Sayısı</th><td>{e(prop.room_count)}</td></tr>
          <tr><th>Brüt / Net Metrekare</th><td>{prop.gross_sqm} m² Brüt / {prop.net_sqm} m² Net</td></tr>
          <tr><th>Bulunduğu Kat / Bina Katı</th><td>{prop.floor_number}. Kat / {prop.building_floors} Katlı Bina</td></tr>
          <tr><th>Isınma Sistemi</th><td>{heating_label}</td></tr>
          <tr><th>İl / İlçe / Mahalle</th><td>{e(prop.city)} / {e(prop.district)} / {e(prop.neighborhood)}</td></tr>
          <tr><th>Açık Adres</th><td>{e(prop.address_detail)}</td></tr>
        </tbody>
      </table>
      <div>
        {prop_image_html}
      </div>
    </div>

    <div class="section">
      <h3>Emlakçı Özel Tasviri ve Gayrimenkul Notları</h3>
      <p>{e(prop.agent_description)}</p>
    </div>

    <div class="parties">
      <div class="section" style="margin-bottom:0;">
        <h3>Talep Eden (Arayan) Müşteri Bilgileri</h3>
        <p><strong>Adı Soyadı:</strong> {seeker_name}</p>
        <p><strong>Müşteri Kategorisi:</strong> {seeker_type}</p>
        <p><strong>Cep Telefonu:</strong> {seeker_mobile} · <strong>Ev Tel:</strong> {seeker_home}</p>
        <p><strong>E-Posta:</strong> {seeker_email}</p>
      </div>
      <div class="section" style="margin-bottom:0;">
        <h3>Mülk Sahibi ve Kimlik Doğrulama</h3>
        <p><strong>Mülk Sahibi:</strong> {owner_name}</p>
        <p><strong>İletişim:</strong> {owner_phone}</p>
        <p><strong>T.C. Kimlik Kontrolü:</strong> {owner_tc}</p>
        <p><strong>Sorumlu Danışman:</strong> {agency_auth} ({agency_phone})</p>
      </div>
    </div>

    <div class="signatures">
      <div class="sig-box">
        <strong>Gayrimenkul Danışmanı / İşletme Yetkilisi</strong><br />
        {agency_name} — {agency_auth}<br />
        İmza / Kaşe:
      </div>
      <div class="sig-box">
        <strong>Bilgi Fişini Teslim Alan Müşteri</strong><br />
        {seeker_name}<br />
        İmza:
      </div>
    </div>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html_doc)


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
