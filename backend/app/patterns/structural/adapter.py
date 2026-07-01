from abc import ABC, abstractmethod
from typing import Dict, Any, List

class ImageSearchEngineTarget(ABC):
    @abstractmethod
    async def find_matches(self, image_data: bytes) -> Dict[str, Any]:
        pass

class ExternalLegacyPetSearchEngine:
    """
    API externa heredada con interfaz incompatible (síncrona y basada en archivos físicos).
    """
    def identify_pet_features(self, filepath: str) -> Dict[str, Any]:
        # Simula identificar raza y especie basándose en etiquetas
        return {
            "detected_labels": ["dog", "golden retriever", "domestic animal"],
            "confidence_scores": [0.98, 0.95, 0.99]
        }

class ImageSearchAdapter(ImageSearchEngineTarget):
    """
    Adaptador que envuelve ExternalLegacyPetSearchEngine.
    Cumple con el RNF 2.1 convirtiendo la entrada en bytes a la firma requerida
    y estandarizando la salida a un formato JSON común.
    """
    def __init__(self, external_engine: ExternalLegacyPetSearchEngine):
        self._external_engine = external_engine

    async def find_matches(self, image_data: bytes) -> Dict[str, Any]:
        import tempfile
        import os

        # Creamos un archivo temporal para simular la interfaz física del motor legacy
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(image_data)
            tmp_path = tmp.name

        try:
            # Llamamos al motor externo
            raw_features = self._external_engine.identify_pet_features(tmp_path)
            
            # Estandarizamos el metadato a JSON (RNF 2.1)
            labels = raw_features.get("detected_labels", [])
            species = "Perro" if "dog" in labels else "Gato"
            breed = "Golden Retriever" if "golden retriever" in labels else "Desconocido"
            
            standardized_json = {
                "detected_species": species,
                "detected_breed": breed,
                "confidence": raw_features["confidence_scores"][0],
                "engine_version": "ExternalLegacy-v1.0"
            }
            return standardized_json
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
