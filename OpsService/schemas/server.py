from pydantic import BaseModel
from datetime import datetime

class ServerGroupCreate(BaseModel):
    name: str
    description: str | None = None
    color: str | None = None

class ServerGroupOut(BaseModel):
    id: int
    name: str
    description: str | None
    color: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

class ServerCreate(BaseModel):
    name: str
    hostname: str
    ip: str
    port: int = 22
    os: str | None = None
    username: str
    auth_type: str = "password"
    password: str | None = None
    key_path: str | None = None
    tags: str | None = None
    group_id: int | None = None

class ServerUpdate(BaseModel):
    name: str | None = None
    hostname: str | None = None
    ip: str | None = None
    port: int | None = None
    os: str | None = None
    username: str | None = None
    auth_type: str | None = None
    password: str | None = None
    key_path: str | None = None
    tags: str | None = None
    group_id: int | None = None

class ServerOut(BaseModel):
    id: int
    name: str
    hostname: str
    ip: str
    port: int
    os: str | None
    status: str
    username: str
    auth_type: str
    key_path: str | None
    tags: str | None
    group_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}