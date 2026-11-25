from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Favorite, Property, User
from app.routers.properties import serialize_property
from app.schemas.favorite import FavoriteToggleRequest

router = APIRouter(
    prefix="/api/favorites",
    tags=["Müşteri Vitrini & Favoriler"],
)

BR08_FAVORITE_AUTH_MESSAGE = (
    "BR-08: İlanları favorilere ekleyebilmek için kayıtlı kullanıcı girişi yapılmalıdır."
)


@router.get("")
def list_favorites(
    user_id: int = Query(..., description="Kayıtlı Kullanıcı ID"),
    db: Session = Depends(get_db),
) -> dict:
    if user_id <= 0:
        return {"favorites": [], "favorite_property_ids": []}

    favorites = db.scalars(
        select(Favorite)
        .where(Favorite.user_id == user_id)
        .order_by(Favorite.created_at.desc(), Favorite.id.desc())
    ).all()

    items: list[dict] = []
    property_ids: list[int] = []
    for fav in favorites:
        prop = fav.property_item or db.get(Property, fav.property_id)
        property_ids.append(fav.property_id)
        items.append(
            {
                "id": fav.id,
                "user_id": fav.user_id,
                "property_id": fav.property_id,
                "created_at": fav.created_at.isoformat() if fav.created_at else "",
                "property": serialize_property(prop, db) if prop is not None else None,
            }
        )

    return {
        "favorites": items,
        "favorite_property_ids": property_ids,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def add_favorite(
    payload: FavoriteToggleRequest,
    db: Session = Depends(get_db),
) -> dict:
    if payload.user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=BR08_FAVORITE_AUTH_MESSAGE,
        )

    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=BR08_FAVORITE_AUTH_MESSAGE,
        )

    prop = db.get(Property, payload.property_id)
    if prop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorilere eklenecek gayrimenkul ilanı bulunamadı.",
        )

    existing = db.scalar(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.property_id == prop.id,
        )
    )
    if existing is None:
        fav = Favorite(user_id=user.id, property_id=prop.id)
        db.add(fav)
        db.commit()
        db.refresh(fav)

    return {
        "message": "İlan favorilerinize eklendi.",
        "is_favorited": True,
        "property_id": prop.id,
    }


@router.delete("/{property_id}")
def remove_favorite(
    property_id: int,
    user_id: int = Query(..., description="Kayıtlı Kullanıcı ID"),
    db: Session = Depends(get_db),
) -> dict:
    if user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=BR08_FAVORITE_AUTH_MESSAGE,
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=BR08_FAVORITE_AUTH_MESSAGE,
        )

    existing = db.scalar(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.property_id == property_id,
        )
    )
    if existing is not None:
        db.delete(existing)
        db.commit()

    return {
        "message": "İlan favorilerinizden çıkarıldı.",
        "is_favorited": False,
        "property_id": property_id,
    }
