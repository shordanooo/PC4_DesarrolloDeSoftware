from abc import ABC, abstractmethod
from typing import List, Dict, Any

class AlertObserver(ABC):
    def __init__(self, observer_id: str, email: str, lat: float, lon: float):
        self.observer_id = observer_id
        self.email = email
        self.lat = lat
        self.lon = lon

    @abstractmethod
    def update(self, conn, lost_pet_report: Dict[str, Any]) -> None:
        pass

class UserObserver(AlertObserver):
    def update(self, conn, lost_pet_report: Dict[str, Any]) -> None:
        cursor = conn.cursor()
        message = f"¡Alerta! Mascota perdida cerca de tu ubicación: {lost_pet_report['name']} ({lost_pet_report['species']})"
        cursor.execute(
            """
            INSERT INTO notifications (recipient_id, recipient_type, type, message, lost_pet_id, is_read)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (str(self.observer_id), "user", "lost_pet_alert", message, str(lost_pet_report["id"]), False)
        )
        conn.commit()
        print(f"[Notifier] Sent push notification to User {self.email} for pet {lost_pet_report['name']}")

class CaretakerObserver(AlertObserver):
    def __init__(self, observer_id: str, email: str, lat: float, lon: float, role: str):
        super().__init__(observer_id, email, lat, lon)
        self.role = role

    def update(self, conn, lost_pet_report: Dict[str, Any]) -> None:
        cursor = conn.cursor()
        message = f"¡Alerta Cuidador ({self.role})! Mascota perdida en tu área de servicio: {lost_pet_report['name']}"
        cursor.execute(
            """
            INSERT INTO notifications (recipient_id, recipient_type, type, message, lost_pet_id, is_read)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (str(self.observer_id), "caretaker", "lost_pet_alert", message, str(lost_pet_report["id"]), False)
        )
        conn.commit()
        print(f"[Notifier] Sent alert to Caretaker ({self.role}) {self.email} for pet {lost_pet_report['name']}")

class LostPetSubject:
    def __init__(self):
        self._observers: List[AlertObserver] = []

    def register_observer(self, observer: AlertObserver) -> None:
        self._observers.append(observer)

    def remove_observer(self, observer: AlertObserver) -> None:
        self._observers.remove(observer)

    def notify_observers(self, conn, lost_pet_report: Dict[str, Any]) -> None:
        for observer in self._observers:
            observer.update(conn, lost_pet_report)
