from pydantic import BaseModel, Field


class AgencyUpdateRequest(BaseModel):
    name: str = Field(..., description="İşletme Adı")
    authorized_person: str = Field(..., description="Yetkili Kişi Adı Soyadı")
    city: str = Field(..., description="İl")
    district: str = Field(..., description="İlçe")
    neighborhood: str = Field(..., description="Mahalle")
    address: str = Field(..., description="Açık Adres Detayı")
    phone: str = Field(..., description="Ofis Sabit Telefonu")
    mobile_phone: str | None = Field(default=None)
    fax: str | None = Field(default=None)
    tax_office: str | None = Field(default=None)
    tax_number: str | None = Field(default=None)
    logo_url: str | None = Field(default=None)
    description: str | None = Field(default=None)
