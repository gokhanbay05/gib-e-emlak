import hashlib
import re
from sqlalchemy import select
from sqlalchemy.orm import Session

# Resmi Türkçe alfabe sırası (A-Z, Ç, Ğ, I, İ, Ö, Ş, Ü)
TR_ALPHABET = "abcçdefgğhıijklmnoöprsştuüvyz"
TR_CHAR_ORDER = {ch: idx for idx, ch in enumerate(TR_ALPHABET)}

LETTER_RE = re.compile(r"[A-Za-zÇĞİÖŞÜçğıöşü]")
DIGIT_RE = re.compile(r"\d")
SYMBOL_RE = re.compile(r"[^A-Za-z0-9ÇĞİÖŞÜçğıöşü\s]")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")

PROVINCE_NAMES: dict[int, str] = {
    6: "Ankara",
    34: "İstanbul",
    35: "İzmir",
    7: "Antalya",
    16: "Bursa",
    1: "Adana",
    41: "Kocaeli",
    42: "Konya",
    33: "Mersin",
    26: "Eskişehir",
}

INVALID_TEST_TTBS_NUMBERS = {"0000000", "1111111", "9999999", "1234567"}

DEFAULT_AGENCY_LOGOS = [
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&h=300&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&h=300&fit=crop",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=300&h=300&fit=crop",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=300&fit=crop",
]

DEFAULT_PROPERTY_IMAGES = [
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
]


def normalize_tr_search(text: str) -> str:
    """Türkçe harf duyarsız arama normalleştiricisi."""
    return (
        (text or "")
        .replace("İ", "i")
        .replace("I", "ı")
        .lower()
        .replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )


def validate_tc_identity_no(tc_no: str) -> tuple[bool, str, str]:
    """
    BR-04: 11 haneli T.C. Kimlik Numarası doğrulaması.
    Kurallar:
    1) Tam 11 haneli ve sadece rakam olmalı
    2) İlk hane '0' olamaz
    3) Son hane çift rakam olmalıdır
    4) Tüm haneler aynı rakam olamaz
    """
    cleaned = re.sub(r"\s+", "", tc_no or "")
    error_msg = (
        "Geçerli bir 11 haneli T.C. Kimlik Numarası giriniz "
        "(0 ile başlayamaz ve çift rakamla bitmelidir)."
    )
    if len(cleaned) != 11 or not cleaned.isdigit():
        return False, "", error_msg
    if cleaned[0] == "0":
        return False, "", error_msg
    if int(cleaned[10]) % 2 != 0:
        return False, "", error_msg
    if len(set(cleaned)) <= 1:
        return False, "", error_msg
    return True, cleaned, ""


def turkish_sort_key(text: str) -> tuple:
    """Türkçe harfleri doğru alfabetik sıraya göre karşılaştırma anahtarı üretir."""
    lowered = text.replace("İ", "i").replace("I", "ı").lower()
    return tuple(TR_CHAR_ORDER.get(ch, 100 + ord(ch)) for ch in lowered)


def hash_password(raw_password: str) -> str:
    return hashlib.sha256(raw_password.encode("utf-8")).hexdigest()


def normalize_and_validate_phone(
    raw_phone: str, is_mobile: bool = True
) -> tuple[bool, str, str]:
    """Türkiye telefon numarasını doğrular ve 0 (5XX) XXX XX XX formatına çevirir."""
    digits = re.sub(r"\D", "", raw_phone or "")
    if len(digits) == 10 and not digits.startswith("0"):
        digits = "0" + digits

    if len(digits) != 11 or not digits.startswith("0"):
        return (
            False,
            "",
            "Telefon numarası 11 haneli olmalıdır (Örn: 0 (532) 123 45 67).",
        )

    if is_mobile and not digits.startswith("05"):
        return (
            False,
            "",
            "Cep telefonu numarası 05 ile başlamalıdır (Örn: 0 (532) 123 45 67).",
        )

    formatted = f"{digits[0]} ({digits[1:4]}) {digits[4:7]} {digits[7:9]} {digits[9:11]}"
    return True, formatted, ""


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Şifre kuralı: en az 8 karakter, 1 harf, 1 rakam ve 1 sembol."""
    if len(password) < 8:
        return False, "Şifre en az 8 karakter uzunluğunda olmalıdır."
    if not LETTER_RE.search(password):
        return False, "Şifre en az bir harf içermelidir."
    if not DIGIT_RE.search(password):
        return False, "Şifre en az bir rakam (0-9) içermelidir."
    if not SYMBOL_RE.search(password):
        return False, "Şifre en az bir sembol (!@#$%^&*._- vb.) içermelidir."
    return True, ""


def validate_ttbs_number(
    ttbs_no: str,
    db: Session,
    agency_model: type,
    check_duplicate: bool = True,
) -> tuple[bool, str, str]:
    """
    BR-01: T.C. Ticaret Bakanlığı Taşınmaz Ticareti Yetki Belgesi doğrulaması.
    Resmi format: ilk 2 hanesi il plaka kodu (01-81) olan 7 haneli sayısal değer.
    """
    cleaned = re.sub(r"\s+", "", ttbs_no or "")
    if len(cleaned) != 7 or not cleaned.isdigit():
        return (
            False,
            "",
            "BR-01: Yetki Belgesi numarası 7 haneli sayısal olmalıdır (Örn: 0609412).",
        )

    if cleaned in INVALID_TEST_TTBS_NUMBERS:
        return (
            False,
            "",
            f"BR-01: '{cleaned}' numaralı Yetki Belgesi TTBS kayıtlarında İPTAL / GEÇERSİZ görünmektedir.",
        )

    province_code = int(cleaned[:2])
    if province_code < 1 or province_code > 81:
        return (
            False,
            "",
            f"BR-01: İlk iki hane ({cleaned[:2]}) geçerli bir il plaka kodu (01-81) değildir.",
        )

    if check_duplicate:
        existing_agency = db.scalar(
            select(agency_model).where(agency_model.ttbs_document_no == cleaned)
        )
        if existing_agency is not None:
            return (
                False,
                "",
                f"BR-01: '{cleaned}' numaralı Yetki Belgesi '{existing_agency.name}' adına zaten kayıtlıdır.",
            )

    province_name = PROVINCE_NAMES.get(province_code, f"{cleaned[:2]} İl Müdürlüğü")
    return (
        True,
        province_name,
        f"T.C. Ticaret Bakanlığı TTBS Doğrulaması Başarılı ({province_name} — Belge No: {cleaned}).",
    )
