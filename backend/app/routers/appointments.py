from datetime import date, datetime, time, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Agency, Appointment, BlockedSlot, Customer, Property
from app.schemas.appointment import BlockedSlotCreateRequest

router = APIRouter(
    prefix="/api/appointments",
    tags=["Randevu Takvimi & Saat Kapatma"],
)

WORKING_START_HOUR = 9
WORKING_END_HOUR = 21


def _ensure_utc(dt: datetime) -> datetime:
    """Naive veya farklı zaman dilimindeki datetime nesnesini UTC'ye normalize eder."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _parse_iso_date(value: str, param_name: str) -> date:
    """YYYY-MM-DD biçimindeki tarih parametresini doğrular ve çözümler."""
    try:
        return date.fromisoformat(value.strip())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": f"{param_name} parametresi YYYY-AA-GG formatında olmalıdır.",
                "field_errors": {param_name: "Geçersiz tarih formatı (YYYY-AA-GG)."},
            },
        ) from exc


def serialize_appointment(appt: Appointment, db: Session) -> dict:
    """Randevu modelini müşteri, emlak ve BR-07 iptal uygunluğu alanlarıyla serileştirir."""
    customer = appt.customer or db.get(Customer, appt.customer_id)
    prop = appt.property_item or (
        db.get(Property, appt.property_id) if appt.property_id else None
    )
    agency = appt.agency or db.get(Agency, appt.agency_id)

    start_utc = _ensure_utc(appt.start_time)
    end_utc = _ensure_utc(appt.end_time)
    now_utc = datetime.now(timezone.utc)
    hours_until_start = round((start_utc - now_utc).total_seconds() / 3600.0, 2)
    can_cancel = appt.status == "AKTIF" and hours_until_start >= 6.0

    customer_name = (
        f"{customer.first_name} {customer.last_name}".strip()
        if customer
        else "Bilinmeyen Müşteri"
    )
    property_location = (
        f"{prop.neighborhood}, {prop.district} / {prop.city}" if prop else ""
    )

    return {
        "id": appt.id,
        "agency_id": appt.agency_id,
        "agency_name": agency.name if agency else "",
        "property_id": appt.property_id,
        "property_title": prop.title if prop else "",
        "property_location": property_location,
        "customer_id": appt.customer_id,
        "customer_name": customer_name,
        "customer_phone": customer.mobile_phone if customer else "",
        "customer_type": customer.customer_type if customer else "",
        "appointment_type": appt.appointment_type,
        "purpose": appt.purpose,
        "start_time": start_utc.isoformat(),
        "end_time": end_utc.isoformat(),
        "status": appt.status,
        "meeting_notes": appt.meeting_notes or "",
        "cancelled_at": (
            _ensure_utc(appt.cancelled_at).isoformat() if appt.cancelled_at else None
        ),
        "can_cancel": can_cancel,
        "hours_until_start": hours_until_start,
        "created_at": (
            _ensure_utc(appt.created_at).isoformat() if appt.created_at else ""
        ),
    }


def serialize_blocked_slot(slot: BlockedSlot) -> dict:
    """Manuel kapatılmış saat dilimi kaydını JSON sözlüğüne dönüştürür."""
    return {
        "id": slot.id,
        "agency_id": slot.agency_id,
        "start_time": _ensure_utc(slot.start_time).isoformat(),
        "end_time": _ensure_utc(slot.end_time).isoformat(),
        "reason": slot.reason,
        "created_at": (
            _ensure_utc(slot.created_at).isoformat() if slot.created_at else ""
        ),
    }


@router.get("/calendar")
def get_calendar_overview(
    agency_id: int = Query(default=1),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Seçilen emlak işletmesinin randevularını ve manuel kapalı saatlerini getirir."""
    range_start: datetime | None = None
    range_end: datetime | None = None

    if start_date:
        parsed_start = _parse_iso_date(start_date, "start_date")
        range_start = datetime.combine(
            parsed_start, time.min, tzinfo=timezone.utc
        )
    if end_date:
        parsed_end = _parse_iso_date(end_date, "end_date")
        range_end = datetime.combine(
            parsed_end, time.max, tzinfo=timezone.utc
        )

    if range_start and range_end and range_end < range_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bitiş tarihi başlangıç tarihinden önce olamaz.",
        )

    appt_stmt = (
        select(Appointment)
        .where(Appointment.agency_id == agency_id)
        .order_by(Appointment.start_time.asc())
    )
    slot_stmt = (
        select(BlockedSlot)
        .where(BlockedSlot.agency_id == agency_id)
        .order_by(BlockedSlot.start_time.asc())
    )

    all_appointments = list(db.scalars(appt_stmt).all())
    all_slots = list(db.scalars(slot_stmt).all())

    def _in_range(start_dt: datetime, end_dt: datetime) -> bool:
        s_utc = _ensure_utc(start_dt)
        e_utc = _ensure_utc(end_dt)
        if range_start and e_utc <= range_start:
            return False
        if range_end and s_utc >= range_end + timedelta(microseconds=1):
            return False
        return True

    filtered_appointments = [
        appt for appt in all_appointments if _in_range(appt.start_time, appt.end_time)
    ]
    filtered_slots = [
        slot for slot in all_slots if _in_range(slot.start_time, slot.end_time)
    ]

    active_count = sum(1 for a in filtered_appointments if a.status == "AKTIF")
    completed_count = sum(
        1 for a in filtered_appointments if a.status == "TAMAMLANDI"
    )
    cancelled_count = sum(
        1 for a in filtered_appointments if a.status == "IPTAL_EDILDI"
    )

    return {
        "agency_id": agency_id,
        "appointments": [
            serialize_appointment(appt, db) for appt in filtered_appointments
        ],
        "blocked_slots": [serialize_blocked_slot(slot) for slot in filtered_slots],
        "counts": {
            "total_appointments": len(filtered_appointments),
            "active_appointments": active_count,
            "completed_appointments": completed_count,
            "cancelled_appointments": cancelled_count,
            "blocked_slots_count": len(filtered_slots),
        },
        "working_hours": {
            "start_hour": WORKING_START_HOUR,
            "end_hour": WORKING_END_HOUR,
        },
    }


@router.get("/blocked-slots")
def list_blocked_slots(
    agency_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Emlakçının manuel olarak kapattığı saat dilimlerini listeler."""
    stmt = select(BlockedSlot).order_by(BlockedSlot.start_time.asc())
    if agency_id is not None:
        stmt = stmt.where(BlockedSlot.agency_id == agency_id)
    slots = list(db.scalars(stmt).all())
    return {"blocked_slots": [serialize_blocked_slot(slot) for slot in slots]}


@router.post("/blocked-slots", status_code=status.HTTP_201_CREATED)
def create_blocked_slot(
    payload: BlockedSlotCreateRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Belirtilen saat aralığını manuel kapatır.
    BR-06: Seçilen aralıkta AKTIF randevu varsa kapatma işlemini engeller.
    """
    agency = db.get(Agency, payload.agency_id)
    if agency is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emlak işletmesi bulunamadı.",
        )

    req_start = _ensure_utc(payload.start_time)
    req_end = _ensure_utc(payload.end_time)

    if req_end <= req_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Bitiş saati başlangıç saatinden sonra olmalıdır.",
                "field_errors": {
                    "end_time": "Bitiş saati başlangıç saatinden sonra olmalıdır."
                },
            },
        )

    # BR-06: Aktif randevu çakışma kontrolü (timezone güvenli)
    active_appointments = list(
        db.scalars(
            select(Appointment)
            .where(
                Appointment.agency_id == payload.agency_id,
                Appointment.status == "AKTIF",
            )
            .order_by(Appointment.start_time.asc())
        ).all()
    )

    display_tz = payload.start_time.tzinfo or timezone.utc
    for existing in active_appointments:
        existing_start = _ensure_utc(existing.start_time)
        existing_end = _ensure_utc(existing.end_time)
        if existing_start < req_end and existing_end > req_start:
            customer = existing.customer or db.get(Customer, existing.customer_id)
            customer_name = (
                f"{customer.first_name} {customer.last_name}".strip()
                if customer
                else "Kayıtlı Müşteri"
            )
            start_str = existing_start.astimezone(display_tz).strftime(
                "%d.%m.%Y %H:%M"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": (
                        f"BR-06: Seçilen saat aralığında aktif bir müşteri randevusu "
                        f"({customer_name} — {start_str}) bulunduğu için bu saat dilimi manuel kapatılamaz."
                    ),
                    "field_errors": {
                        "start_time": "Bu saat diliminde aktif müşteri randevusu mevcuttur (BR-06)."
                    },
                },
            )

    # Mevcut manuel kapatma çakışma kontrolü
    existing_slots = list(
        db.scalars(
            select(BlockedSlot)
            .where(BlockedSlot.agency_id == payload.agency_id)
            .order_by(BlockedSlot.start_time.asc())
        ).all()
    )
    for slot in existing_slots:
        slot_start = _ensure_utc(slot.start_time)
        slot_end = _ensure_utc(slot.end_time)
        if slot_start < req_end and slot_end > req_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Seçilen saat aralığı zaten manuel olarak kapatılmış durumda.",
                    "field_errors": {
                        "start_time": "Bu saat diliminde mevcut bir manuel kapatma kaydı bulunmaktadır."
                    },
                },
            )

    cleaned_reason = (payload.reason or "").strip() or "Emlakçı Manuel Kapattı"
    new_slot = BlockedSlot(
        agency_id=payload.agency_id,
        start_time=req_start,
        end_time=req_end,
        reason=cleaned_reason,
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)

    return {
        "message": "Seçilen saat dilimi takvimde manuel olarak kapatıldı.",
        "blocked_slot": serialize_blocked_slot(new_slot),
    }


@router.delete("/blocked-slots/{slot_id}")
def delete_blocked_slot(
    slot_id: int,
    db: Session = Depends(get_db),
) -> dict:
    """Manuel olarak kapatılmış bir saat diliminin kilidini açar."""
    slot = db.get(BlockedSlot, slot_id)
    if slot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manuel kapatılmış saat dilimi kaydı bulunamadı.",
        )

    db.delete(slot)
    db.commit()
    return {
        "message": "Manuel kapatılan saat dilimi tekrar müsait duruma getirildi.",
        "deleted_id": slot_id,
    }
