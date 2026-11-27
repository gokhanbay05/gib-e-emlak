import uuid
from pathlib import Path
from fastapi import APIRouter, File, HTTPException, UploadFile, status

router = APIRouter(prefix="/api/uploads", tags=["Dosya Yükleme Servisi"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "logos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

PROPERTY_UPLOAD_DIR = (
    Path(__file__).resolve().parent.parent.parent / "uploads" / "properties"
)
PROPERTY_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

AVATAR_UPLOAD_DIR = (
    Path(__file__).resolve().parent.parent.parent / "uploads" / "avatars"
)
AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_LOGO_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_PROPERTY_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
}


@router.post("/logo")
async def upload_agency_logo(file: UploadFile = File(...)) -> dict:
    """
    Emlak Ofisi logosunu dosya olarak yükler.
    Kurallar:
    - Maksimum dosya boyutu: 5 MB
    - İzin verilen formatlar: PNG, JPG/JPEG, WEBP
    """
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Geçersiz dosya formatı. Yalnızca PNG, JPG/JPEG veya WEBP "
                "formatındaki görseller yüklenebilir."
            ),
        )

    content = await file.read()
    size_bytes = len(content)
    if size_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yüklenen dosya boş olamaz.",
        )

    if size_bytes > MAX_LOGO_BYTES:
        mb_val = round(size_bytes / (1024 * 1024), 2)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Logo dosya boyutu maksimum 5 MB olabilir (Yüklenen dosya: {mb_val} MB)."
            ),
        )

    ext = ALLOWED_MIME_TYPES[file.content_type]
    unique_name = f"logo_{uuid.uuid4().hex[:12]}{ext}"
    dest = UPLOAD_DIR / unique_name
    dest.write_bytes(content)

    return {
        "url": f"/uploads/logos/{unique_name}",
        "filename": file.filename or unique_name,
        "size_bytes": size_bytes,
        "content_type": file.content_type,
        "message": "Emlak ofisi logosu başarıyla yüklendi.",
    }


@router.post("/property-image")
async def upload_property_image(file: UploadFile = File(...)) -> dict:
    """
    Gayrimenkul ilan görselini dosya olarak yükler.
    Kurallar:
    - Maksimum dosya boyutu: 5 MB
    - İzin verilen formatlar: PNG, JPG/JPEG, WEBP
    """
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Geçersiz dosya formatı. Yalnızca PNG, JPG/JPEG veya WEBP "
                "formatındaki görseller yüklenebilir."
            ),
        )

    content = await file.read()
    size_bytes = len(content)
    if size_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yüklenen dosya boş olamaz.",
        )

    if size_bytes > MAX_PROPERTY_IMAGE_BYTES:
        mb_val = round(size_bytes / (1024 * 1024), 2)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"İlan görseli boyutu maksimum 5 MB olabilir (Yüklenen dosya: {mb_val} MB)."
            ),
        )

    ext = ALLOWED_MIME_TYPES[file.content_type]
    unique_name = f"prop_{uuid.uuid4().hex[:12]}{ext}"
    dest = PROPERTY_UPLOAD_DIR / unique_name
    dest.write_bytes(content)

    return {
        "url": f"/uploads/properties/{unique_name}",
        "filename": file.filename or unique_name,
        "size_bytes": size_bytes,
        "content_type": file.content_type,
        "message": "İlan görseli başarıyla yüklendi.",
    }


@router.post("/avatar")
async def upload_user_avatar(file: UploadFile = File(...)) -> dict:
    """Kullanıcı profil fotoğrafını yükler."""
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geçersiz dosya formatı. Yalnızca PNG, JPG veya WEBP yüklenebilir.",
        )

    content = await file.read()
    size_bytes = len(content)
    if size_bytes == 0 or size_bytes > MAX_LOGO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profil fotoğrafı 0 KB'dan büyük ve en fazla 5 MB olmalıdır.",
        )

    ext = ALLOWED_MIME_TYPES[file.content_type]
    unique_name = f"avatar_{uuid.uuid4().hex[:12]}{ext}"
    dest = AVATAR_UPLOAD_DIR / unique_name
    dest.write_bytes(content)

    return {
        "url": f"/uploads/avatars/{unique_name}",
        "filename": file.filename or unique_name,
        "message": "Profil fotoğrafı başarıyla yüklendi.",
    }
