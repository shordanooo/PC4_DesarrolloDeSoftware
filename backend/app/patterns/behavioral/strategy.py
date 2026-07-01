from abc import ABC, abstractmethod
from typing import List, Dict, Any

class SearchStrategy(ABC):
    @abstractmethod
    def search(self, image_metadata: Dict[str, Any], conn: Any) -> List[Dict[str, Any]]:
        pass

class AdopcionSearchStrategy(SearchStrategy):
    def search(self, image_metadata: Dict[str, Any], conn: Any) -> List[Dict[str, Any]]:
        species = image_metadata.get("species")
        breed = image_metadata.get("breed")
        
        cursor = conn.cursor()
        sql = "SELECT * FROM searchable_pets WHERE source_type = 'ong_shelter'"
        params = []
        if species:
            sql += " AND species LIKE ?"
            params.append(f"%{species}%")
        if breed:
            sql += " AND breed LIKE ?"
            params.append(f"%{breed}%")
            
        cursor.execute(sql, params)
        results = cursor.fetchall()
        return results

class VentaSearchStrategy(SearchStrategy):
    def search(self, image_metadata: Dict[str, Any], conn: Any) -> List[Dict[str, Any]]:
        species = image_metadata.get("species")
        breed = image_metadata.get("breed")
        
        cursor = conn.cursor()
        sql = "SELECT * FROM searchable_pets WHERE source_type = 'certified_breeder'"
        params = []
        if species:
            sql += " AND species LIKE ?"
            params.append(f"%{species}%")
        if breed:
            sql += " AND breed LIKE ?"
            params.append(f"%{breed}%")
            
        cursor.execute(sql, params)
        results = cursor.fetchall()
        return results

class VerificarPerdidaSearchStrategy(SearchStrategy):
    def search(self, image_metadata: Dict[str, Any], conn: Any) -> List[Dict[str, Any]]:
        species = image_metadata.get("species")
        breed = image_metadata.get("breed")
        
        cursor = conn.cursor()
        sql = "SELECT * FROM lost_pets WHERE status = 'lost'"
        params = []
        if species:
            sql += " AND species LIKE ?"
            params.append(f"%{species}%")
        if breed:
            sql += " AND breed LIKE ?"
            params.append(f"%{breed}%")
            
        cursor.execute(sql, params)
        results = cursor.fetchall()
        
        for pet in results:
            cursor.execute("SELECT * FROM sightings WHERE lost_pet_id = ?", (pet["id"],))
            pet["sightings"] = cursor.fetchall()
            
        return results

class SearchContext:
    def __init__(self, strategy: SearchStrategy):
        self._strategy = strategy

    def set_strategy(self, strategy: SearchStrategy):
        self._strategy = strategy

    def execute_search(self, image_metadata: Dict[str, Any], conn: Any) -> List[Dict[str, Any]]:
        return self._strategy.search(image_metadata, conn)
