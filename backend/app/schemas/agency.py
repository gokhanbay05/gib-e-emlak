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


class AgencySellRequestCreate(BaseModel):
    owner_first_name: str = Field(..., description="Mülk Sahibi Adı")
    owner_last_name: str = Field(..., description="Mülk Sahibi Soyadı")
    mobile_phone: str = Field(..., description="Cep Telefonu")
    email: str | None = Field(default=None, description="E-posta Adresi")
    tc_identity_no: str | None = Field(default=None, description="T.C. Kimlik Numarası")
    listing_type: str = Field(..., description="İşlem Türü (SATILIK | KIRALIK)")
    property_type: str = Field(..., description="Emlak Türü (DAIRE | VILLA | ISYERI | ARSA)")
    room_count: str = Field(default="3+1", description="Oda Sayısı")
    gross_sqm: int = Field(default=120, description="Brüt Metrekare")
    expected_price: float = Field(..., description="Beklenen Fiyat (TL)")
    city: str = Field(..., description="İl")
    district: str = Field(..., description="İlçe")
    neighborhood: str = Field(..., description="Mahalle")
    address_detail: str | None = Field(default=None, description="Açık Adres Detayı")
    property_notes: str | None = Field(default=None, description="Gayrimenkul Özellikleri ve Not")
