from pydantic import BaseModel
from typing import Dict, Any, Optional

class UserAuth(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserProfileUpdate(BaseModel):
    name: str

class InspectionCreate(BaseModel):
    config_version: int
    data: Dict[str, Any]

class InspectionUpdate(BaseModel):
    config_version: Optional[int] = None
    data: Optional[Dict[str, Any]] = None