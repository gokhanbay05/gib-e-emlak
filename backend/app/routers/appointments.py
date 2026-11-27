from datetime import date, datetime, time, timedelta, timezone
from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.validators import validate_tc_identity_no
from app.models import (
    Agency,
    Appointment,
    BlockedSlot,
    ChatMessage,
    ChatThread,
    Customer,
    Property,
    User,
)
from app.schemas.appointment import (
    AppointmentCancelRequest,
    AppointmentCreateRequest,
    AppointmentUpdateRequest,
    BlockedSlotCreateRequest,
)

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
        "advisor_name": appt.advisor_name or "Selim Karahan",
        "appointment_type": appt.appointment_type,
        "purpose": appt.purpose,
        "start_time": start_utc.isoformat(),
        "end_time": end_utc.isoformat(),
        "status": appt.status,
        "meeting_notes": appt.meeting_notes or "",
        "rating_dismissed": bool(appt.rating_dismissed),
        "rating_submitted": bool(appt.rating_submitted),
        "cancelled_by": appt.cancelled_by or "",
        "cancel_reason": appt.cancel_reason or "",
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
        "advisor_name": slot.advisor_name or "Selim Karahan",
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
    customer_id: int | None = Query(default=None),
    advisor_name: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Seçilen emlak işletmesinin/danışmanın randevularını ve manuel kapalı saatlerini getirir."""
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

    appt_stmt = select(Appointment).order_by(Appointment.start_time.asc())
    if customer_id is not None:
        appt_stmt = appt_stmt.where(Appointment.customer_id == customer_id)
    else:
        appt_stmt = appt_stmt.where(Appointment.agency_id == agency_id)

    slot_stmt = (
        select(BlockedSlot)
        .where(BlockedSlot.agency_id == (agency_id if agency_id > 0 else 1))
        .order_by(BlockedSlot.start_time.asc())
    )

    if advisor_name and advisor_name.strip() and advisor_name.strip() != "ALL":
        adv = advisor_name.strip()
        appt_stmt = appt_stmt.where(Appointment.advisor_name == adv)
        slot_stmt = slot_stmt.where(BlockedSlot.advisor_name == adv)

    all_appointments = list(db.scalars(appt_stmt).all())
    all_slots = list(db.scalars(slot_stmt).all())

    agency_obj = db.get(Agency, agency_id if agency_id > 0 else 1)
    work_start = agency_obj.work_start_hour if agency_obj else WORKING_START_HOUR
    work_end = agency_obj.work_end_hour if agency_obj else 18
    work_days_str = (
        agency_obj.working_days
        if agency_obj and agency_obj.working_days
        else "Pzt,Sal,Çar,Per,Cum,Cmt"
    )
    work_days = [d.strip() for d in work_days_str.split(",") if d.strip()]

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
            "start_hour": work_start,
            "end_hour": work_end,
            "working_days": work_days,
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

    cleaned_advisor = (payload.advisor_name or "").strip() or "Selim Karahan"
    # BR-06: Aktif randevu çakışma kontrolü (danışman bazlı + timezone güvenli)
    active_appointments = list(
        db.scalars(
            select(Appointment)
            .where(
                Appointment.agency_id == payload.agency_id,
                Appointment.status == "AKTIF",
                Appointment.advisor_name == cleaned_advisor,
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

    # Mevcut manuel kapatma çakışma kontrolü (danışman bazlı)
    existing_slots = list(
        db.scalars(
            select(BlockedSlot)
            .where(
                BlockedSlot.agency_id == payload.agency_id,
                BlockedSlot.advisor_name == cleaned_advisor,
            )
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
                    "message": "Seçilen saat aralığı bu danışman için zaten manuel olarak kapatılmış durumda.",
                    "field_errors": {
                        "start_time": "Bu saat diliminde mevcut bir manuel kapatma kaydı bulunmaktadır."
                    },
                },
            )

    cleaned_reason = (payload.reason or "").strip() or "Emlakçı Manuel Kapattı"
    new_slot = BlockedSlot(
        agency_id=payload.agency_id,
        advisor_name=cleaned_advisor,
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


@router.post("", status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreateRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Müşteri için seçilen emlak ofisi ve ilana randevu oluşturur."""
    agency = db.get(Agency, payload.agency_id)
    if agency is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emlak ofisi bulunamadı.",
        )

    tc_ok, cleaned_tc, tc_err = validate_tc_identity_no(payload.tc_identity_no or "")
    if not tc_ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"BR-04 Kimlik Doğrulaması: {tc_err}",
        )

    req_start = _ensure_utc(payload.start_time)
    req_end = _ensure_utc(payload.end_time)
    if req_end <= req_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bitiş saati başlangıç saatinden sonra olmalıdır.",
        )

    cleaned_advisor = (payload.advisor_name or "").strip() or (
        agency.authorized_person if agency else "Selim Karahan"
    )
    # Çakışma kontrolü (Danışman bazlı aktif randevular ve kapalı saatler)
    active_appointments = list(
        db.scalars(
            select(Appointment).where(
                Appointment.agency_id == payload.agency_id,
                Appointment.status == "AKTIF",
                Appointment.advisor_name == cleaned_advisor,
            )
        ).all()
    )
    for existing in active_appointments:
        if _ensure_utc(existing.start_time) < req_end and _ensure_utc(existing.end_time) > req_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Seçilen saat diliminde danışmanın başka bir randevusu bulunmaktadır. Lütfen farklı bir saat seçiniz.",
            )

    existing_slots = list(
        db.scalars(
            select(BlockedSlot).where(
                BlockedSlot.agency_id == payload.agency_id,
                BlockedSlot.advisor_name == cleaned_advisor,
            )
        ).all()
    )
    for slot in existing_slots:
        if _ensure_utc(slot.start_time) < req_end and _ensure_utc(slot.end_time) > req_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Seçilen saat dilimi emlak ofisi tarafından kapatılmıştır. Lütfen farklı bir saat seçiniz.",
            )

    customer_id: int | None = None
    linked_user: User | None = None
    if payload.user_id:
        linked_user = db.get(User, payload.user_id)
        if linked_user and linked_user.customer_id:
            customer_id = linked_user.customer_id
            existing_cust = db.get(Customer, customer_id)
            if existing_cust is not None:
                if existing_cust.agency_id is None:
                    existing_cust.agency_id = payload.agency_id
                if payload.customer_phone and payload.customer_phone.strip():
                    existing_cust.mobile_phone = payload.customer_phone.strip()
                existing_cust.tc_identity_no = cleaned_tc
                existing_cust.is_tc_verified = True

    if customer_id is None:
        # Aynı T.C. Kimlik Numarasına sahip mevcut müşteri varsa mükerrer kayıt oluşturma
        tc_match = db.scalar(
            select(Customer)
            .where(Customer.tc_identity_no == cleaned_tc)
            .order_by(Customer.id.asc())
        )
        if tc_match is not None:
            customer_id = tc_match.id
            if payload.customer_phone and payload.customer_phone.strip():
                tc_match.mobile_phone = payload.customer_phone.strip()
            tc_match.is_tc_verified = True
        else:
            parts = payload.customer_name.strip().split()
            first_name = parts[0] if parts else "Müşteri"
            last_name = " ".join(parts[1:]) if len(parts) > 1 else "Kaydı"
            new_cust = Customer(
                agency_id=payload.agency_id,
                first_name=first_name,
                last_name=last_name,
                mobile_phone=payload.customer_phone.strip(),
                tc_identity_no=cleaned_tc,
                is_tc_verified=True,
                customer_type="ALICI",
                source="ONLINE_RANDEVU",
                notes="İlan detay sayfasından T.C. doğrulamalı randevu oluşturdu.",
            )
            db.add(new_cust)
            db.flush()
            customer_id = new_cust.id

    if linked_user is not None and not linked_user.customer_id:
        linked_user.customer_id = customer_id

    appt = Appointment(
        agency_id=payload.agency_id,
        property_id=payload.property_id,
        customer_id=customer_id,
        advisor_name=cleaned_advisor,
        appointment_type=payload.appointment_type or "FIZIKI",
        purpose=payload.purpose or "ILAN_GOSTERIMI",
        start_time=req_start,
        end_time=req_end,
        status="AKTIF",
        meeting_notes=(payload.meeting_notes or "").strip(),
    )
    db.add(appt)
    db.flush()

    # Randevu gönderildiğinde Alıcı/Kiracı ile Sorumlu Danışman arasında kontrollü sohbet odası oluştur
    prop_obj = db.get(Property, payload.property_id) if payload.property_id else None
    thread = ChatThread(
        agency_id=payload.agency_id,
        customer_id=customer_id,
        property_id=payload.property_id,
        appointment_id=appt.id,
        advisor_name=cleaned_advisor,
        thread_type="APPOINTMENT",
        subject=(
            prop_obj.title
            if prop_obj
            else f"{agency.name} — Gösterim Randevusu"
        ),
    )
    db.add(thread)
    db.flush()

    welcome_msg = ChatMessage(
        thread_id=thread.id,
        sender_role="AGENT",
        sender_name=cleaned_advisor,
        content=(
            f"Merhaba {payload.customer_name.strip()}, "
            f"{prop_obj.title if prop_obj else 'gayrimenkul gösterim'} randevunuz alındı. "
            f"Randevu öncesi tüm sorularınızı buradan bana iletebilirsiniz."
        ),
    )
    db.add(welcome_msg)

    db.commit()
    db.refresh(appt)

    return {
        "message": "Randevunuz başarıyla oluşturuldu ve danışmanla mesajlaşma odası açıldı.",
        "appointment": serialize_appointment(appt, db),
        "thread_id": thread.id,
    }


@router.post("/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: int,
    payload: AppointmentCancelRequest | None = Body(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Randevuyu iptal eder (Randevuya 6 saatten az kaldıysa iptal engellenir)."""
    appt = db.get(Appointment, appointment_id)
    if appt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Randevu kaydı bulunamadı.",
        )

    start_utc = _ensure_utc(appt.start_time)
    now_utc = datetime.now(timezone.utc)
    hours_until = (start_utc - now_utc).total_seconds() / 3600.0
    if hours_until < 6.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Randevu saatine 6 saatten az kaldığı için online iptal yapılamaz. Lütfen emlak ofisi ile iletişime geçiniz.",
        )

    appt.status = "IPTAL_EDILDI"
    appt.cancelled_by = "CUSTOMER"
    appt.cancel_reason = (payload.reason or "").strip() if payload and payload.reason else ""
    appt.cancel_ack_dismissed = False
    appt.cancelled_at = now_utc
    db.commit()
    db.refresh(appt)
    return {
        "message": "Randevunuz iptal edildi ve danışman bilgilendirildi.",
        "appointment": serialize_appointment(appt, db),
    }


@router.get("/cancelled-pending")
def get_pending_cancellation_notice(
    agency_id: int = Query(...),
    db: Session = Depends(get_db),
) -> dict:
    """Müşteri tarafından iptal edilmiş ve danışman tarafından henüz onaylanmamış ilk randevuyu döner."""
    appt = db.scalar(
        select(Appointment)
        .where(
            Appointment.agency_id == agency_id,
            Appointment.status == "IPTAL_EDILDI",
            Appointment.cancelled_by == "CUSTOMER",
            Appointment.cancel_ack_dismissed.is_(False),
        )
        .order_by(Appointment.cancelled_at.desc(), Appointment.id.desc())
        .limit(1)
    )
    if appt is None:
        return {"pending": None}
    return {"pending": serialize_appointment(appt, db)}


@router.post("/{appointment_id}/dismiss-cancel-notice")
def dismiss_cancellation_notice(
    appointment_id: int,
    db: Session = Depends(get_db),
) -> dict:
    appt = db.get(Appointment, appointment_id)
    if appt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Randevu kaydı bulunamadı.",
        )
    appt.cancel_ack_dismissed = True
    db.commit()
    return {"message": "İptal bildirimi kapatıldı."}


@router.get("/property-access")
def check_property_chat_access(
    property_id: int = Query(...),
    customer_id: int = Query(...),
    db: Session = Depends(get_db),
) -> dict:
    """Müşterinin ilgili ilana randevu veya satış başvurusu üzerinden sohbet yetkisi olup olmadığını döner."""
    prop = db.get(Property, property_id)
    is_owner = prop is not None and prop.owner_customer_id == customer_id
    appt = db.scalar(
        select(Appointment)
        .where(
            Appointment.customer_id == customer_id,
            Appointment.property_id == property_id,
            Appointment.status.in_(["AKTIF", "TAMAMLANDI"]),
        )
        .limit(1)
    )
    return {"has_access": bool(is_owner or appt is not None)}


@router.patch("/{appointment_id}")
def update_appointment_details(
    appointment_id: int,
    payload: AppointmentUpdateRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Takvim içinden randevu durumunu ve görüşme notunu günceller."""
    appt = db.get(Appointment, appointment_id)
    if appt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Randevu kaydı bulunamadı.",
        )

    if payload.status and payload.status in {"AKTIF", "TAMAMLANDI", "IPTAL_EDILDI"}:
        appt.status = payload.status
        if payload.status == "IPTAL_EDILDI":
            appt.cancelled_by = "AGENT"
            appt.cancel_ack_dismissed = True
            appt.cancelled_at = datetime.now(timezone.utc)

    if payload.meeting_notes is not None:
        appt.meeting_notes = payload.meeting_notes.strip()

    db.commit()
    db.refresh(appt)
    return {
        "message": "Randevu bilgileri güncellendi.",
        "appointment": serialize_appointment(appt, db),
    }


