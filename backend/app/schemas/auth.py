from pydantic import BaseModel, Field


class TTBSVerifyRequest(BaseModel):
    ttbs_document_no: str = Field(..., description="7 haneli Yetki Belge No")
    agency_name: str | None = Field(default=None)
    check_duplicate: bool = Field(default=True)


class RegisterRequest(BaseModel):
    first_name: str = Field(..., description="Ad")
    last_name: str = Field(..., description="Soyad")
    email: str = Field(..., description="Tekil E-posta Adresi (BR-02)")
    password: str = Field(..., description="En az 8 karakter, harf + rakam + sembol")
    phone: str = Field(..., description="Cep Telefonu")
    role: str = Field(..., description="AGENT veya CUSTOMER")

    ttbs_document_no: str | None = Field(default=None)
    office_phone: str | None = Field(default=None)
    agency_name: str | None = Field(default=None)
    logo_url: str | None = Field(default=None)
    city: str | None = Field(default=None)
    district: str | None = Field(default=None)
    neighborhood: str | None = Field(default=None)
    address_detail: str | None = Field(default=None)


class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    first_name: str = Field(..., description="Ad")
    last_name: str = Field(..., description="Soyad")
    email: str = Field(..., description="E-posta")
    phone: str = Field(..., description="Cep Telefonu")
    current_password: str = Field(..., description="Onay için mevcut şifre")
    new_password: str | None = Field(
        default=None, description="Opsiyonel yeni şifre"
    )
