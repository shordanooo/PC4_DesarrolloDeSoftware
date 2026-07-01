from abc import ABC, abstractmethod
from typing import List, Dict, Any

class AlertObserver(ABC):
    def __init__(self, observer_id: str, email: str, lat: float, lon: float):
        self.observer_id = observer_id
        self.email = email
        self.lat = lat
        self.lon = lon

    @abstractmethod
    async def update(self, lost_pet_report: Dict[str, Any]) -> None:
        pass

class UserObserver(AlertObserver):
    async def update(self, lost_pet_report: Dict[str, Any]) -> None:
        from app.config.db import get_db
        db = get_db()
        notification = {
            "recipient_id": self.observer_id,
            "recipient_type": "user",
            "type": "lost_pet_alert",
            "message": f"¡Alerta! Mascota perdida cerca de tu ubicación: {lost_pet_report['name']} ({lost_pet_report['species']})",
            "lost_pet_id": str(lost_pet_report["_id"]),
            "read": False
        }
        await db.notifications.insert_one(notification)
        print(f"[Notifier] Sent push notification to User {self.email} for pet {lost_pet_report['name']}")

class CaretakerObserver(AlertObserver):
    def __init__(self, observer_id: str, email: str, lat: float, lon: float, role: str):
        super().__init__(observer_id, email, lat, lon)
        self.role = role

    async def update(self, lost_pet_report: Dict[str, Any]) -> None:
        from app.config.db import get_db
        db = get_db()
        notification = {
            "recipient_id": self.observer_id,
            "recipient_type": "caretaker",
            "type": "lost_pet_alert",
            "message": f"¡Alerta Cuidador ({self.role})! Mascota perdida en tu área de servicio: {lost_pet_report['name']}",
            "lost_pet_id": str(lost_pet_report["_id"]),
            "read": False
        }
        await db.notifications.insert_one(notification)
        print(f"[Notifier] Sent alert to Caretaker ({self.role}) {self.email} for pet {lost_pet_report['name']}")

class LostPetSubject:
    def __init__(self):
        self._observers: List[AlertObserver] = []

    def register_observer(self, observer: AlertObserver) -> None:
        self._observers.append(observer)

    def remove_observer(self, observer: AlertObserver) -> None:
        self._observers.remove(observer)

    async def notify_observers(self, lost_pet_report: Dict[str, Any]) -> None:
        import asyncio
        tasks = [observer.update(lost_pet_report) for observer in self._observers]
        if tasks:
            await asyncio.gather(*tasks)
