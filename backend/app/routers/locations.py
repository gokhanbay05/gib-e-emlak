import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/locations", tags=["Türkiye Adres Servisi (İl / İlçe / Mahalle)"])

TURKIYE_API_BASE = "https://api.turkiyeapi.dev/v1"

# Resmi Türkçe alfabe sırası (A-Z, Ç, Ğ, I, İ, Ö, Ş, Ü doğru yerlerinde!)
TR_ALPHABET = "abcçdefgğhıijklmnoöprsştuüvyz"
TR_CHAR_ORDER = {ch: idx for idx, ch in enumerate(TR_ALPHABET)}


def turkish_sort_key(text: str) -> tuple:
    lowered = text.replace("İ", "i").replace("I", "ı").lower()
    return tuple(TR_CHAR_ORDER.get(ch, 100 + ord(ch)) for ch in lowered)


_PROVINCES_CACHE: list[dict] = []
_DISTRICTS_CACHE: dict[int, list[dict]] = {}
_NEIGHBORHOODS_CACHE: dict[int, list[dict]] = {}

FALLBACK_PROVINCES = sorted(
    [
        {"id": 6, "name": "Ankara"},
        {"id": 34, "name": "İstanbul"},
        {"id": 35, "name": "İzmir"},
        {"id": 7, "name": "Antalya"},
        {"id": 16, "name": "Bursa"},
    ],
    key=lambda x: turkish_sort_key(x["name"]),
)

FALLBACK_DISTRICTS: dict[int, list[dict]] = {
    6: sorted(
        [
            {"id": 1231, "name": "Çankaya"},
            {"id": 1745, "name": "Yenimahalle"},
            {"id": 1744, "name": "Keçiören"},
            {"id": 1742, "name": "Etimesgut"},
            {"id": 1743, "name": "Gölbaşı"},
        ],
        key=lambda x: turkish_sort_key(x["name"]),
    ),
    34: sorted(
        [
            {"id": 1421, "name": "Kadıköy"},
            {"id": 1183, "name": "Beşiktaş"},
            {"id": 1663, "name": "Şişli"},
            {"id": 2049, "name": "Ataşehir"},
            {"id": 1708, "name": "Üsküdar"},
        ],
        key=lambda x: turkish_sort_key(x["name"]),
    ),
    35: sorted(
        [
            {"id": 1481, "name": "Konak"},
            {"id": 1203, "name": "Bornova"},
            {"id": 1448, "name": "Karşıyaka"},
        ],
        key=lambda x: turkish_sort_key(x["name"]),
    ),
    7: sorted(
        [
            {"id": 2039, "name": "Muratpaşa"},
            {"id": 2038, "name": "Konyaaltı"},
        ],
        key=lambda x: turkish_sort_key(x["name"]),
    ),
    16: sorted(
        [
            {"id": 1829, "name": "Nilüfer"},
            {"id": 1832, "name": "Osmangazi"},
        ],
        key=lambda x: turkish_sort_key(x["name"]),
    ),
}

FALLBACK_NEIGHBORHOODS: dict[int, list[dict]] = {
    1231: sorted(
        [
            {"id": 1, "name": "Kızılırmak Mah."},
            {"id": 2, "name": "Ayrancı Mah."},
            {"id": 3, "name": "Bahçelievler Mah."},
            {"id": 4, "name": "Alacaatlı Mah."},
            {"id": 5, "name": "Söğütözü Mah."},
            {"id": 6, "name": "Kavaklıdere Mah."},
            {"id": 7, "name": "Çayyolu Mah."},
            {"id": 8, "name": "Oran Mah."},
        ],
        key=lambda x: turkish_sort_key(x["name"]),
    ),
    1421: sorted(
        [
            {"id": 101, "name": "Suadiye Mah."},
            {"id": 102, "name": "Fenerbahçe Mah."},
            {"id": 103, "name": "Caddebostan Mah."},
            {"id": 104, "name": "Caferağa Mah."},
            {"id": 105, "name": "Kozyatağı Mah."},
        ],
        key=lambda x: turkish_sort_key(x["name"]),
    ),
}


@router.get("/provinces")
def get_provinces() -> dict:
    """Türkiye 81 İl listesini resmi Türkçe alfabetik sırayla döndürür."""
    global _PROVINCES_CACHE
    if _PROVINCES_CACHE:
        return {"source": "turkiyeapi.dev (cache)", "provinces": _PROVINCES_CACHE}

    try:
        resp = httpx.get(f"{TURKIYE_API_BASE}/provinces", timeout=4.0)
        resp.raise_for_status()
        payload = resp.json()
        provinces = [
            {"id": item["id"], "name": item["name"]}
            for item in payload.get("data", [])
        ]
        provinces.sort(key=lambda x: turkish_sort_key(x["name"]))
        if provinces:
            _PROVINCES_CACHE = provinces
            for item in payload.get("data", []):
                districts = [
                    {"id": d["id"], "name": d["name"]}
                    for d in item.get("districts", [])
                ]
                districts.sort(key=lambda x: turkish_sort_key(x["name"]))
                _DISTRICTS_CACHE[item["id"]] = districts
            return {"source": "turkiyeapi.dev", "provinces": provinces}
    except Exception:  # noqa: BLE001
        pass

    return {"source": "fallback", "provinces": FALLBACK_PROVINCES}


@router.get("/districts")
def get_districts(
    province_id: int = Query(..., description="İl Plaka / ID değeri (Örn: 6 Ankara, 34 İstanbul)"),
) -> dict:
    """Seçilen ile ait ilçeleri resmi Türkçe alfabetik sırayla döndürür."""
    if province_id in _DISTRICTS_CACHE:
        return {"source": "turkiyeapi.dev (cache)", "districts": _DISTRICTS_CACHE[province_id]}

    try:
        resp = httpx.get(f"{TURKIYE_API_BASE}/provinces/{province_id}", timeout=4.0)
        resp.raise_for_status()
        payload = resp.json().get("data", {})
        districts = [
            {"id": d["id"], "name": d["name"]}
            for d in payload.get("districts", [])
        ]
        districts.sort(key=lambda x: turkish_sort_key(x["name"]))
        if districts:
            _DISTRICTS_CACHE[province_id] = districts
            return {"source": "turkiyeapi.dev", "districts": districts}
    except Exception:  # noqa: BLE001
        pass

    return {"source": "fallback", "districts": FALLBACK_DISTRICTS.get(province_id, [])}


@router.get("/neighborhoods")
def get_neighborhoods(
    district_id: int = Query(..., description="İlçe ID değeri"),
) -> dict:
    """Seçilen ilçeye ait mahalleleri resmi Türkçe alfabetik sırayla döndürür."""
    if district_id in _NEIGHBORHOODS_CACHE:
        return {
            "source": "turkiyeapi.dev (cache)",
            "neighborhoods": _NEIGHBORHOODS_CACHE[district_id],
        }

    try:
        resp = httpx.get(f"{TURKIYE_API_BASE}/districts/{district_id}", timeout=4.0)
        resp.raise_for_status()
        payload = resp.json().get("data", {})
        neighborhoods = [
            {"id": n["id"], "name": n["name"]}
            for n in payload.get("neighborhoods", [])
        ]
        neighborhoods.sort(key=lambda x: turkish_sort_key(x["name"]))
        if neighborhoods:
            _NEIGHBORHOODS_CACHE[district_id] = neighborhoods
            return {"source": "turkiyeapi.dev", "neighborhoods": neighborhoods}
    except Exception:  # noqa: BLE001
        pass

    fallback = FALLBACK_NEIGHBORHOODS.get(
        district_id,
        [{"id": 9001, "name": "Merkez Mah."}],
    )
    return {"source": "fallback", "neighborhoods": fallback}
