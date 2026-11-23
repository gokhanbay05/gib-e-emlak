from fastapi import APIRouter, Query
from app.services.location_service import (
    fetch_districts_list,
    fetch_neighborhoods_list,
    fetch_provinces_list,
)

router = APIRouter(prefix="/api/locations", tags=["Türkiye Adres Servisi"])


@router.get("/provinces")
def get_provinces() -> dict:
    source, provinces = fetch_provinces_list()
    return {"source": source, "provinces": provinces}


@router.get("/districts")
def get_districts(province_id: int = Query(...)) -> dict:
    source, districts = fetch_districts_list(province_id)
    return {"source": source, "districts": districts}


@router.get("/neighborhoods")
def get_neighborhoods(district_id: int = Query(...)) -> dict:
    source, neighborhoods = fetch_neighborhoods_list(district_id)
    return {"source": source, "neighborhoods": neighborhoods}
