from typing import Dict, Any, List
import math
from app.patterns.behavioral.observer import LostPetSubject, UserObserver, CaretakerObserver

class AlertNotificationFacade:
    def __init__(self, conn):
        self.conn = conn

    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def register_lost_pet_and_alert_neighbors(self, pet_data: Dict[str, Any], radius_km: float = 1.0) -> Dict[str, Any]:
        cursor = self.conn.cursor()
        
        # 1. Insert lost pet
        cursor.execute(
            """
            INSERT INTO lost_pets (name, species, breed, description, lat, lon, photo, status, owner_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                pet_data["name"],
                pet_data["species"],
                pet_data["breed"],
                pet_data["description"],
                pet_data["lat"],
                pet_data["lon"],
                pet_data["photo"],
                pet_data["status"],
                pet_data["owner_id"]
            )
        )
        pet_id = cursor.lastrowid
        pet_data["id"] = pet_id
        self.conn.commit()

        # 2. Initialize subject
        subject = LostPetSubject()

        # 3. Query and register user observers
        cursor.execute("SELECT * FROM users WHERE lat IS NOT NULL AND lon IS NOT NULL")
        users = cursor.fetchall()
        
        for user in users:
            if str(user["id"]) == str(pet_data.get("owner_id")):
                continue
            
            dist = self._haversine_distance(pet_data["lat"], pet_data["lon"], user["lat"], user["lon"])
            if dist <= radius_km:
                subject.register_observer(
                    UserObserver(
                        observer_id=str(user["id"]),
                        email=user["email"],
                        lat=user["lat"],
                        lon=user["lon"]
                    )
                )

        # 4. Query and register caretaker observers
        cursor.execute("SELECT * FROM caretakers WHERE alert_notifications_enabled = 1 AND lat IS NOT NULL AND lon IS NOT NULL")
        caretakers = cursor.fetchall()
        
        for caretaker in caretakers:
            dist = self._haversine_distance(pet_data["lat"], pet_data["lon"], caretaker["lat"], caretaker["lon"])
            if dist <= radius_km:
                species_raw = caretaker.get("species_accepted", "") or ""
                species_accepted = [s.strip().lower() for s in species_raw.split(",") if s.strip()]
                pet_species = pet_data.get("species", "").lower()
                
                if not species_accepted or any(s in pet_species for s in species_accepted):
                    subject.register_observer(
                        CaretakerObserver(
                            observer_id=str(caretaker["id"]),
                            email=caretaker["email"],
                            lat=caretaker["lat"],
                            lon=caretaker["lon"],
                            role=caretaker["role"]
                        )
                    )

        # 5. Notify observers
        subject.notify_observers(self.conn, pet_data)

        return pet_data
