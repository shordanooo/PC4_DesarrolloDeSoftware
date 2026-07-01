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
def search_by_image(
    intent: str = Form(...),
    file: UploadFile = File(...),
    db=Depends(get_db)
):
    intent_clean = intent.strip().lower()
    
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
        image_bytes = file.file.read()
        
        legacy_engine = ExternalLegacyPetSearchEngine()
        adapter = ImageSearchAdapter(legacy_engine)
        
        import asyncio
        loop = asyncio.get_event_loop()
        standard_metadata = loop.run_until_complete(adapter.find_matches(image_bytes))
        
        search_filter = {
            "species": standard_metadata.get("detected_species"),
            "breed": standard_metadata.get("detected_breed")
        }
        
        context = SearchContext(strategy)
        results = context.execute_search(search_filter, db)
        
        return {
            "intent": intent,
            "detected_metadata": standard_metadata,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
