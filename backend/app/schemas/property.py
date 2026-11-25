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


class PropertyStatusUpdateRequest(BaseModel):
    status: str


class CustomerSearchRequestCreate(BaseModel):
    agency_id: int
    customer_id: int
    listing_type: str
    property_type: str | None = None
    min_sqm: int | None = None
    max_sqm: int | None = None
    room_count: str | None = None
    floor_preference: int | None = None
    heating_type: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    city: str | None = None
    district: str | None = None
    natural_language_prompt: str | None = None
