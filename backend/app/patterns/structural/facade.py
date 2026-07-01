from typing import Dict, Any, List
import math
from app.patterns.behavioral.observer import LostPetSubject, UserObserver, CaretakerObserver

class AlertNotificationFacade:
    """
    Facade que unifica y simplifica el flujo complejo de:
    1. Registrar una mascota perdida en la base de datos.
    2. Filtrar usuarios y cuidadores cercanos en un radio (Fórmula de Haversine).
    3. Verificar restricciones del cuidador (especies aceptadas).
    4. Notificar a través del patrón Observer en paralelo.
    """
    def __init__(self, db):
        self.db = db

    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0  # Radio de la Tierra en kilómetros
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    async def register_lost_pet_and_alert_neighbors(self, pet_data: Dict[str, Any], radius_km: float = 1.0) -> Dict[str, Any]:
        # 1. Registrar reporte de mascota perdida
        result = await self.db.lost_pets.insert_one(pet_data)
        pet_data["_id"] = result.inserted_id

        # 2. Inicializar el Subject
        subject = LostPetSubject()

        # 3. Buscar y registrar observadores de tipo Usuario
        users_cursor = self.db.users.find({"lat": {"$exists": True}, "lon": {"$exists": True}})
        async for user in users_cursor:
            # Evitar alertarse a sí mismo
            if str(user["_id"]) == str(pet_data.get("owner_id")):
                continue
            
            dist = self._haversine_distance(pet_data["lat"], pet_data["lon"], user["lat"], user["lon"])
            if dist <= radius_km:
                subject.register_observer(
                    UserObserver(
                        observer_id=str(user["_id"]),
                        email=user["email"],
                        lat=user["lat"],
                        lon=user["lon"]
                    )
                )

        # 4. Buscar y registrar cuidadores con alertas activas (RF 3.3)
        caretakers_cursor = self.db.caretakers.find({
            "alert_notifications_enabled": True,
            "lat": {"$exists": True},
            "lon": {"$exists": True}
        })
        async for caretaker in caretakers_cursor:
            dist = self._haversine_distance(pet_data["lat"], pet_data["lon"], caretaker["lat"], caretaker["lon"])
            if dist <= radius_km:
                # RF 3.2: Verificar restricciones de servicio (especies aceptadas)
                species_accepted = caretaker.get("species_accepted", [])
                pet_species = pet_data.get("species", "").lower()
                
                # Si acepta la especie o la lista está vacía, se le alerta
                if not species_accepted or any(s.lower() in pet_species for s in species_accepted):
                    subject.register_observer(
                        CaretakerObserver(
                            observer_id=str(caretaker["_id"]),
                            email=caretaker["email"],
                            lat=caretaker["lat"],
                            lon=caretaker["lon"],
                            role=caretaker["role"]
                        )
                    )

        # 5. Disparar notificaciones concurrentes (RNF 1.1 - <5 segundos)
        await subject.notify_observers(pet_data)

        # Formatear el ID para retorno JSON
        pet_data["_id"] = str(pet_data["_id"])
        return pet_data
