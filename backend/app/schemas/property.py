from pydantic import BaseModel


class PropertyCreateRequest(BaseModel):
    agency_id: int
    owner_customer_id: int
    owner_tc_identity_no: str | None = None
    title: str
    listing_type: str
    property_type: str
    gross_sqm: int
    net_sqm: int
    room_count: str
    floor_number: int
    building_floors: int
    heating_type: str
    price: float
    city: str
    district: str
    neighborhood: str
    address_detail: str
    agent_description: str
    status: str = "AKTIF"
    image_url: str | None = None
    images: list[str] | None = None
    building_age: int | None = 3
    bathroom_count: int | None = 1
    is_credit_eligible: bool | None = True
    is_furnished: bool | None = False
    deed_status: str | None = "Kat Mülkiyetli"
    usage_status: str | None = "Boş / Hemen Teslim"
    features: list[str] | None = None
    advisor_name: str | None = None


class PropertyUpdateRequest(BaseModel):
    agency_id: int | None = None
    owner_customer_id: int
    owner_tc_identity_no: str | None = None
    title: str
    listing_type: str
    property_type: str
    gross_sqm: int
    net_sqm: int
    room_count: str
    floor_number: int
    building_floors: int
    heating_type: str
    price: float
    city: str
    district: str
    neighborhood: str
    address_detail: str
    agent_description: str
    status: str = "AKTIF"
    image_url: str | None = None
    images: list[str] | None = None
    building_age: int | None = 3
    bathroom_count: int | None = 1
    is_credit_eligible: bool | None = True
    is_furnished: bool | None = False
    deed_status: str | None = "Kat Mülkiyetli"
    usage_status: str | None = "Boş / Hemen Teslim"
    features: list[str] | None = None
    advisor_name: str | None = None


class PropertyStatusUpdateRequest(BaseModel):
    status: str
