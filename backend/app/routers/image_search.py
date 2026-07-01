from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from typing import List, Dict, Any
from app.config.db import get_db
from app.patterns.structural.adapter import ImageSearchAdapter, ExternalLegacyPetSearchEngine
from app.patterns.behavioral.strategy import (
    SearchContext,
    AdopcionSearchStrategy,
    VentaSearchStrategy,
    VerificarPerdidaSearchStrategy
)

router = APIRouter(prefix="/api/image-search", tags=["Image Search"])

@router.post("")
async def search_by_image(
    intent: str = Form(...),
    file: UploadFile = File(...),
    db=Depends(get_db)
):
    intent_clean = intent.strip().lower()
    
    # RF 2.2: Obliga al usuario a seleccionar una de tres intenciones
    if "adop" in intent_clean:
        strategy = AdopcionSearchStrategy()
    elif "vent" in intent_clean:
        strategy = VentaSearchStrategy()
    elif "perd" in intent_clean or "verif" in intent_clean:
        strategy = VerificarPerdidaSearchStrategy()
    else:
        raise HTTPException(
            status_code=400, 
            detail="Intención no válida. Debe ser 'Adopción', 'Venta' o 'Verificar Pérdida'."
        )
        
    try:
        # RF 2.1: Interfaz para cargar un archivo de imagen
        image_bytes = await file.read()
        
        # RNF 2.1 & Adapter: Adaptar motor externo y generar metadatos estándar (JSON)
        legacy_engine = ExternalLegacyPetSearchEngine()
        adapter = ImageSearchAdapter(legacy_engine)
        
        # El adaptador retorna el JSON estandarizado
        standard_metadata = await adapter.find_matches(image_bytes)
        
        # Simplificación de búsqueda (mapea especie y raza detectada para filtrar)
        search_filter = {
            "species": standard_metadata.get("detected_species"),
            "breed": standard_metadata.get("detected_breed")
        }
        
        # Strategy: Ejecutar estrategia de búsqueda según la intención (RF 2.3, 2.4, 2.5)
        context = SearchContext(strategy)
        results = await context.execute_search(search_filter, db)
        
        return {
            "intent": intent,
            "detected_metadata": standard_metadata,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
