from abc import ABC, abstractmethod
from typing import Dict, Any, List

class CaregiverProfile(ABC):
    def __init__(self, data: Dict[str, Any]):
        self.name = data.get("name")
        self.email = data.get("email")
        self.role = data.get("role")
        self.species_accepted = data.get("species_accepted", [])
        self.sizes_accepted = data.get("sizes_accepted", [])
        self.administers_medication = data.get("administers_medication", False)
        self.is_verified = data.get("is_verified", False)
        self.alert_notifications_enabled = data.get("alert_notifications_enabled", True)
        self.ratings = data.get("ratings", [])
        self.id_document = data.get("id_document", "")

    @property
    def average_rating(self) -> float:
        if not self.ratings:
            return 0.0
        # RF 3.4: Calificación promedio basada en reseñas verificadas de dueños
        verified_ratings = [r["score"] for r in self.ratings if r.get("verified", False)]
        if not verified_ratings:
            return 0.0
        return round(sum(verified_ratings) / len(verified_ratings), 1)

    @abstractmethod
    def get_role_rules(self) -> Dict[str, Any]:
        pass

class SolidarioCaregiverProfile(CaregiverProfile):
    def get_role_rules(self) -> Dict[str, Any]:
        return {
            "max_pets": 2,
            "max_sizes": ["pequeño", "mediano"],
            "allow_payment": False,
            "requires_certification": False
        }

class ProfesionalCaregiverProfile(CaregiverProfile):
    def get_role_rules(self) -> Dict[str, Any]:
        return {
            "max_pets": 5,
            "max_sizes": ["pequeño", "mediano", "grande"],
            "allow_payment": True,
            "requires_certification": False
        }

class EspecializadoCaregiverProfile(CaregiverProfile):
    def get_role_rules(self) -> Dict[str, Any]:
        # RF 3.2: Cuidador especializado con administración de medicamentos y mayores capacidades
        return {
            "max_pets": 10,
            "max_sizes": ["pequeño", "mediano", "grande", "gigante"],
            "allow_payment": True,
            "requires_certification": True
        }

class CaregiverProfileFactory:
    @staticmethod
    def create_profile(role: str, data: Dict[str, Any]) -> CaregiverProfile:
        role_lower = role.lower()
        if "solidario" in role_lower:
            return SolidarioCaregiverProfile(data)
        elif "profesional" in role_lower:
            return ProfesionalCaregiverProfile(data)
        elif "especializado" in role_lower:
            return EspecializadoCaregiverProfile(data)
        else:
            raise ValueError(f"Rol de cuidador desconocido: {role}")
