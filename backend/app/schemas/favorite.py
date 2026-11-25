from pydantic import BaseModel, Field


class FavoriteToggleRequest(BaseModel):
    user_id: int = Field(..., description="Kayıtlı Kullanıcı ID")
    property_id: int = Field(..., description="Gayrimenkul İlan ID")
