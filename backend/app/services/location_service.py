import httpx
from app.core.validators import turkish_sort_key

TURKIYE_API_BASE = "https://api.turkiyeapi.dev/v1"

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
}

FALLBACK_NEIGHBORHOODS: dict[int, list[dict]] = {
    1231: sorted(
        [
            {"id": 1, "name": "Kızılırmak Mah."},
            {"id": 2, "name": "Ayrancı Mah."},
            {"id": 3, "name": "Bahçelievler Mah."},
            {"id": 4, "name": "Alacaatlı Mah."},
            {"id": 5, "name": "Söğütözü Mah."},
        ],
        key=lambda x: turkish_sort_key(x["name"]),
    ),
}


def fetch_provinces_list() -> tuple[str, list[dict]]:
    """81 il listesini Türkçe alfabetik sırayla önbellekli döndürür."""
    global _PROVINCES_CACHE
    if _PROVINCES_CACHE:
        return "turkiyeapi.dev (cache)", _PROVINCES_CACHE

    try:
        resp = httpx.get(f"{TURKIYE_API_BASE}/provinces", timeout=4.0)
        resp.raise_for_status()
        payload = resp.json()
        provinces = sorted(
            [{"id": i["id"], "name": i["name"]} for i in payload.get("data", [])],
            key=lambda x: turkish_sort_key(x["name"]),
        )
        if provinces:
            _PROVINCES_CACHE = provinces
            for item in payload.get("data", []):
                _DISTRICTS_CACHE[item["id"]] = sorted(
                    [{"id": d["id"], "name": d["name"]} for d in item.get("districts", [])],
                    key=lambda x: turkish_sort_key(x["name"]),
                )
            return "turkiyeapi.dev", provinces
    except Exception:  # noqa: BLE001
        pass

    return "fallback", FALLBACK_PROVINCES


def fetch_districts_list(province_id: int) -> tuple[str, list[dict]]:
    """Seçilen ile ait ilçeleri Türkçe alfabetik sırayla döndürür."""
    if province_id in _DISTRICTS_CACHE:
        return "turkiyeapi.dev (cache)", _DISTRICTS_CACHE[province_id]

    try:
        resp = httpx.get(f"{TURKIYE_API_BASE}/provinces/{province_id}", timeout=4.0)
        resp.raise_for_status()
        districts = sorted(
            [
                {"id": d["id"], "name": d["name"]}
                for d in resp.json().get("data", {}).get("districts", [])
            ],
            key=lambda x: turkish_sort_key(x["name"]),
        )
        if districts:
            _DISTRICTS_CACHE[province_id] = districts
            return "turkiyeapi.dev", districts
    except Exception:  # noqa: BLE001
        pass

    return "fallback", FALLBACK_DISTRICTS.get(province_id, [])


def fetch_neighborhoods_list(district_id: int) -> tuple[str, list[dict]]:
    """Seçilen ilçeye ait mahalleleri Türkçe alfabetik sırayla döndürür."""
    if district_id in _NEIGHBORHOODS_CACHE:
        return "turkiyeapi.dev (cache)", _NEIGHBORHOODS_CACHE[district_id]

    try:
        resp = httpx.get(f"{TURKIYE_API_BASE}/districts/{district_id}", timeout=4.0)
        resp.raise_for_status()
        neighborhoods = sorted(
            [
                {"id": n["id"], "name": n["name"]}
                for n in resp.json().get("data", {}).get("neighborhoods", [])
            ],
            key=lambda x: turkish_sort_key(x["name"]),
        )
        if neighborhoods:
            _NEIGHBORHOODS_CACHE[district_id] = neighborhoods
            return "turkiyeapi.dev", neighborhoods
    except Exception:  # noqa: BLE001
        pass

    return "fallback", FALLBACK_NEIGHBORHOODS.get(
        district_id, [{"id": 9001, "name": "Merkez Mah."}]
    )
