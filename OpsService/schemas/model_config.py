from pydantic import BaseModel
from datetime import datetime

class ModelConfigCreate(BaseModel):
    name: str
    provider: str
    model_name: str
    api_key: str
    base_url: str | None = None
    is_default: bool = False
    temperature: float = 0.7
    embedding_model: str | None = None
    embedding_dimensions: int | None = None
  
class ModelConfigUpdate(BaseModel):
    name: str | None = None
    provider: str | None = None
    model_name: str | None = None
    api_key: str | None = None
    base_url: str | None = None
    is_default: bool | None = None
    temperature: float | None = None
    embedding_model: str | None = None
    embedding_dimensions: int | None = None

class ModelConfigOut(BaseModel):
    id: int
    name: str
    provider: str
    model_name: str
    embedding_model: str | None
    embedding_dimensions: int | None
    base_url: str | None
    is_default: bool
    temperature: float | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}