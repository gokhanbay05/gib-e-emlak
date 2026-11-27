from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
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

router = APIRouter(tags=["Değerlendirmeler & Uygulama İçi Mesajlaşma"])


def _serialize_review(rev: AgencyReview) -> dict:
    return {
        "id": rev.id,
        "agency_id": rev.agency_id,
        "appointment_id": rev.appointment_id,
        "reviewer_name": rev.reviewer_name,
        "advisor_name": rev.advisor_name or "",
        "rating": rev.rating,
        "comment": rev.comment,
        "created_at": rev.created_at.isoformat() if rev.created_at else "",
    }


@router.get("/api/agencies/{agency_id}/reviews")
def list_agency_reviews(agency_id: int, db: Session = Depends(get_db)) -> dict:
    reviews = list(
        db.scalars(
            select(AgencyReview)
            .where(AgencyReview.agency_id == agency_id)
            .order_by(AgencyReview.created_at.desc(), AgencyReview.id.desc())
        ).all()
    )
    count = len(reviews)
    avg = round(sum(r.rating for r in reviews) / count, 1) if count > 0 else 0.0
    return {
        "reviews": [_serialize_review(r) for r in reviews],
        "average": avg,
        "count": count,
    }


@router.get("/api/reviews/pending")
def get_pending_review_for_customer(
    customer_id: int = Query(...),
    db: Session = Depends(get_db),
) -> dict:
    """
    Tamamlandı ('TAMAMLANDI') durumunda olan ancak henüz değerlendirilmemiş
    ve 'Bir daha gösterme' (rating_dismissed=True) seçilmemiş ilk randevuyu döner.
    """
    appt = db.scalar(
        select(Appointment)
        .where(
            Appointment.customer_id == customer_id,
            Appointment.status == "TAMAMLANDI",
            Appointment.rating_submitted.is_(False),
            Appointment.rating_dismissed.is_(False),
        )
        .order_by(Appointment.start_time.desc())
        .limit(1)
    )
    if appt is None:
        return {"pending": None}

    agency = db.get(Agency, appt.agency_id)
    prop = db.get(Property, appt.property_id) if appt.property_id else None
    return {
        "pending": {
            "appointment_id": appt.id,
            "agency_id": appt.agency_id,
            "agency_name": agency.name if agency else "Emlak Ofisi",
            "advisor_name": appt.advisor_name
            or (agency.authorized_person if agency else "Danışman"),
            "property_title": prop.title if prop else "Gayrimenkul Görüşmesi",
            "start_time": appt.start_time.isoformat(),
        }
    }


@router.post("/api/reviews", status_code=status.HTTP_201_CREATED)
def submit_agency_review(payload: dict, db: Session = Depends(get_db)) -> dict:
    appointment_id = payload.get("appointment_id")
    rating = int(payload.get("rating") or 5)
    comment = str(payload.get("comment") or "").strip()
    user_id = payload.get("user_id")

    if rating < 1 or rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Puan 1 ile 5 arasında olmalıdır.",
        )

    appt = db.get(Appointment, int(appointment_id)) if appointment_id else None
    if appt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Değerlendirilecek randevu kaydı bulunamadı.",
        )
    if appt.status != "TAMAMLANDI":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yalnızca tamamlanmış görüşmeler değerlendirilebilir.",
        )
    if appt.rating_submitted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu görüşme için zaten değerlendirme gönderdiniz.",
        )

    cust = db.get(Customer, appt.customer_id)
    reviewer_name = (
        f"{cust.first_name} {cust.last_name}".strip()
        if cust
        else "Doğrulanmış Müşteri"
    )
    agency = db.get(Agency, appt.agency_id)

    review = AgencyReview(
        agency_id=appt.agency_id,
        appointment_id=appt.id,
        customer_id=appt.customer_id,
        user_id=int(user_id) if user_id else None,
        reviewer_name=reviewer_name,
        advisor_name=appt.advisor_name
        or (agency.authorized_person if agency else "Danışman"),
        rating=rating,
        comment=comment or "Görüşme ve bilgilendirme sürecinden memnun kaldım.",
    )
    appt.rating_submitted = True
    db.add(review)
    db.commit()
    db.refresh(review)

    return {
        "message": "Değerlendirmeniz ve yorumunuz emlak ofisinin vitrin sayfasında yayınlandı. Teşekkür ederiz!",
        "review": _serialize_review(review),
    }


@router.post("/api/reviews/dismiss")
def dismiss_pending_review(payload: dict, db: Session = Depends(get_db)) -> dict:
    appointment_id = int(payload.get("appointment_id") or 0)
    appt = db.get(Appointment, appointment_id)
    if appt is not None:
        appt.rating_dismissed = True
        db.commit()
    return {"message": "Bu görüşme için değerlendirme hatırlatıcısı kapatıldı."}


# --- UYGULAMA İÇİ KONTROLLÜ MESAJLAŞMA (CHAT) ---


def _serialize_thread(thread: ChatThread, db: Session) -> dict:
    cust = db.get(Customer, thread.customer_id)
    agency = db.get(Agency, thread.agency_id)
    prop = db.get(Property, thread.property_id) if thread.property_id else None

    cust_user = db.scalar(
        select(User).where(User.customer_id == thread.customer_id).limit(1)
    )
    last_msg = db.scalar(
        select(ChatMessage)
        .where(ChatMessage.thread_id == thread.id)
        .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .limit(1)
    )
    return {
        "id": thread.id,
        "agency_id": thread.agency_id,
        "agency_name": agency.name if agency else "Emlak Ofisi",
        "agency_logo": agency.logo_url if agency else "",
        "customer_id": thread.customer_id,
        "customer_name": (
            f"{cust.first_name} {cust.last_name}".strip() if cust else "Müşteri"
        ),
        "customer_avatar": (cust_user.avatar_url or "") if cust_user else "",
        "property_id": thread.property_id,
        "property_title": prop.title if prop else thread.subject,
        "appointment_id": thread.appointment_id,
        "advisor_name": thread.advisor_name,
        "thread_type": thread.thread_type,
        "subject": thread.subject or (prop.title if prop else "Danışman Görüşmesi"),
        "last_message": last_msg.content if last_msg else "",
        "last_message_at": (
            last_msg.created_at.isoformat()
            if last_msg
            else thread.updated_at.isoformat()
        ),
    }


def _serialize_message(msg: ChatMessage) -> dict:
    return {
        "id": msg.id,
        "thread_id": msg.thread_id,
        "sender_role": msg.sender_role,
        "sender_name": msg.sender_name,
        "sender_avatar": msg.sender_avatar or "",
        "content": msg.content,
        "created_at": msg.created_at.isoformat() if msg.created_at else "",
    }


@router.get("/api/chat/threads")
def list_chat_threads(
    role: str = Query(...),
    agency_id: int | None = Query(default=None),
    customer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(ChatThread).order_by(ChatThread.updated_at.desc(), ChatThread.id.desc())
    upper_role = role.strip().upper()
    if upper_role == "CUSTOMER":
        if customer_id is None:
            return {"threads": []}
        stmt = stmt.where(ChatThread.customer_id == customer_id)
    elif upper_role == "AGENT":
        if agency_id is not None:
            stmt = stmt.where(ChatThread.agency_id == agency_id)
    else:
        return {"threads": []}

    threads = list(db.scalars(stmt).all())
    return {"threads": [_serialize_thread(t, db) for t in threads]}


@router.post("/api/chat/threads", status_code=status.HTTP_201_CREATED)
def ensure_or_create_chat_thread(
    payload: dict, db: Session = Depends(get_db)
) -> dict:
    """
    Sohbet odası açma kuralı:
    - Mülk Sahibi / Satıcı (SATICI / KIRALAYAN): İlgili emlak ofisinin danışmanına her zaman yazabilir.
    - Alıcı / Kiracı (ALICI / KIRACI): Yalnızca aktif/tamamlanmış bir randevusu varsa oda açılabilir.
    """
    agency_id = int(payload.get("agency_id") or 1)
    customer_id = int(payload.get("customer_id") or 0)
    property_id = payload.get("property_id")
    advisor_name = str(payload.get("advisor_name") or "Selim Karahan").strip()

    cust = db.get(Customer, customer_id)
    if cust is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Müşteri profili bulunamadı.",
        )

    is_seller = cust.customer_type in {"SATICI", "KIRALAYAN"}
    existing_appt = db.scalar(
        select(Appointment).where(
            Appointment.customer_id == customer_id,
            Appointment.agency_id == agency_id,
        )
    )
    if not is_seller and existing_appt is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Alıcı / Kiracı olarak mesaj gönderebilmek için önce bu ilana/ofise randevu talebi oluşturmalısınız.",
        )

    existing = db.scalar(
        select(ChatThread).where(
            ChatThread.agency_id == agency_id,
            ChatThread.customer_id == customer_id,
            ChatThread.property_id == (int(property_id) if property_id else None),
        )
    )
    if existing is not None:
        return {"thread": _serialize_thread(existing, db)}

    prop = db.get(Property, int(property_id)) if property_id else None
    thread = ChatThread(
        agency_id=agency_id,
        customer_id=customer_id,
        property_id=int(property_id) if property_id else None,
        appointment_id=existing_appt.id if existing_appt else None,
        advisor_name=advisor_name,
        thread_type="SELL_INQUIRY" if is_seller else "APPOINTMENT",
        subject=prop.title if prop else "Mülk Danışmanlığı Görüşmesi",
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return {"thread": _serialize_thread(thread, db)}


@router.get("/api/chat/threads/{thread_id}/messages")
def list_thread_messages(thread_id: int, db: Session = Depends(get_db)) -> dict:
    msgs = list(
        db.scalars(
            select(ChatMessage)
            .where(ChatMessage.thread_id == thread_id)
            .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        ).all()
    )
    return {"messages": [_serialize_message(m) for m in msgs]}


@router.post("/api/chat/threads/{thread_id}/messages", status_code=status.HTTP_201_CREATED)
def send_chat_message(
    thread_id: int, payload: dict, db: Session = Depends(get_db)
) -> dict:
    thread = db.get(ChatThread, thread_id)
    if thread is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sohbet odası bulunamadı.",
        )

    content = str(payload.get("content") or "").strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mesaj içeriği boş olamaz.",
        )

    sender_role = str(payload.get("sender_role") or "CUSTOMER").strip().upper()
    sender_name = str(payload.get("sender_name") or "Kullanıcı").strip()
    sender_avatar = str(payload.get("sender_avatar") or "").strip() or None

    msg = ChatMessage(
        thread_id=thread_id,
        sender_role=sender_role,
        sender_name=sender_name,
        sender_avatar=sender_avatar,
        content=content,
    )
    thread.updated_at = datetime.now(timezone.utc)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"message_item": _serialize_message(msg)}
