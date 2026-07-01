from abc import ABC, abstractmethod
from typing import List, Dict, Any

class SearchStrategy(ABC):
    @abstractmethod
    async def search(self, image_metadata: Dict[str, Any], db: Any) -> List[Dict[str, Any]]:
        pass

class AdopcionSearchStrategy(SearchStrategy):
    async def search(self, image_metadata: Dict[str, Any], db: Any) -> List[Dict[str, Any]]:
        # RF 2.3: Devuelve exclusivamente resultados del catálogo de protectoras/ONGs
        query = {"source_type": "ong_shelter"}
        if "species" in image_metadata and image_metadata["species"]:
            query["species"] = {"$regex": image_metadata["species"], "$options": "i"}
        if "breed" in image_metadata and image_metadata["breed"]:
            query["breed"] = {"$regex": image_metadata["breed"], "$options": "i"}
        
        cursor = db.searchable_pets.find(query)
        results = await cursor.to_list(length=100)
        for r in results:
            r["_id"] = str(r["_id"])
        return results

class VentaSearchStrategy(SearchStrategy):
    async def search(self, image_metadata: Dict[str, Any], db: Any) -> List[Dict[str, Any]]:
        # RF 2.4: Filtra y muestra solo criaderos comerciales legalmente certificados
        query = {"source_type": "certified_breeder"}
        if "species" in image_metadata and image_metadata["species"]:
            query["species"] = {"$regex": image_metadata["species"], "$options": "i"}
        if "breed" in image_metadata and image_metadata["breed"]:
            query["breed"] = {"$regex": image_metadata["breed"], "$options": "i"}
        
        cursor = db.searchable_pets.find(query)
        results = await cursor.to_list(length=100)
        for r in results:
            r["_id"] = str(r["_id"])
        return results

class VerificarPerdidaSearchStrategy(SearchStrategy):
    async def search(self, image_metadata: Dict[str, Any], db: Any) -> List[Dict[str, Any]]:
        # RF 2.5: Contrasta con la base de datos de alertas activas de mascotas perdidas
        query = {"status": "lost"}
        if "species" in image_metadata and image_metadata["species"]:
            query["species"] = {"$regex": image_metadata["species"], "$options": "i"}
        if "breed" in image_metadata and image_metadata["breed"]:
            query["breed"] = {"$regex": image_metadata["breed"], "$options": "i"}
            
        cursor = db.lost_pets.find(query)
        results = await cursor.to_list(length=100)
        for r in results:
            r["_id"] = str(r["_id"])
        return results

class SearchContext:
    def __init__(self, strategy: SearchStrategy):
        self._strategy = strategy

    def set_strategy(self, strategy: SearchStrategy):
        self._strategy = strategy

    async def execute_search(self, image_metadata: Dict[str, Any], db: Any) -> List[Dict[str, Any]]:
        return await self._strategy.search(image_metadata, db)
