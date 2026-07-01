from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any

class LostPetCreate(BaseModel):
    name: str
    species: str
    breed: str
    description: str
    lat: float
    lon: float
    photo: str  # Base64 string or URL
    owner_id: str

class SightingCreate(BaseModel):
    lost_pet_id: Optional[Any] = None
    lat: float
    lon: float
    photo: str  # Base64 string or URL
    description: str

class CaretakerCreate(BaseModel):
    name: str
    email: EmailStr
    role: str  # Solidario, Profesional, Especializado
    lat: float
    lon: float
    species_accepted: List[str] = []
    sizes_accepted: List[str] = []
    administers_medication: bool = False
    id_document: str

class ReviewCreate(BaseModel):
    score: int = Field(..., ge=1, le=5)
    comment: str
    reviewer_name: str
    verified: bool = True
