from pydantic import BaseModel, Field


class CustomerCreateRequest(BaseModel):
    agency_id: int = Field(..., description="Bağlı Emlak İşletmesi ID")
    first_name: str = Field(..., description="Müşteri Adı")
    last_name: str = Field(..., description="Müşteri Soyadı")
    mobile_phone: str = Field(..., description="Cep Telefonu (Zorunlu)")
    home_phone: str | None = Field(default=None, description="Ev Telefonu (Opsiyonel)")
    email: str | None = Field(default=None, description="E-posta Adresi")
    tc_identity_no: str | None = Field(default=None, description="11 Haneli T.C. Kimlik No")
    customer_type: str = Field(
        ..., description="Müşteri Tipi: ALICI | SATICI | KIRALAYAN | KIRACI"
    )
    notes: str | None = Field(default=None, description="Müşteri Notu / Açıklama")


class CustomerUpdateRequest(BaseModel):
    first_name: str = Field(..., description="Müşteri Adı")
    last_name: str = Field(..., description="Müşteri Soyadı")
    mobile_phone: str = Field(..., description="Cep Telefonu (Zorunlu)")
    home_phone: str | None = Field(default=None, description="Ev Telefonu (Opsiyonel)")
    email: str | None = Field(default=None, description="E-posta Adresi")
    tc_identity_no: str | None = Field(default=None, description="11 Haneli T.C. Kimlik No")
    customer_type: str = Field(
        ..., description="Müşteri Tipi: ALICI | SATICI | KIRALAYAN | KIRACI"
    )
    notes: str | None = Field(default=None, description="Müşteri Notu / Açıklama")
