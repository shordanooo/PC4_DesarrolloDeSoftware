from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from app.models.schemas import LostPetCreate, SightingCreate
from app.config.db import get_db
from app.patterns.structural.facade import AlertNotificationFacade
from bson import ObjectId

router = APIRouter(prefix="/api/lost-pets", tags=["Lost Pets"])

@router.post("")
async def create_lost_pet(pet: LostPetCreate, db=Depends(get_db)):
    try:
        facade = AlertNotificationFacade(db)
        pet_dict = pet.model_dump()
        pet_dict["status"] = "lost"
        pet_dict["sightings"] = []
        # Registra la mascota y envía alertas concurrentes (RF 1.1, RF 1.2, RF 1.4, RNF 1.1)
        saved_pet = await facade.register_lost_pet_and_alert_neighbors(pet_dict, radius_km=1.0)
        return saved_pet
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_lost_pets(db=Depends(get_db)):
    # RNF 1.2 (Seguridad): Los datos personales del dueño permanecen anónimos
    # Omitimos 'owner_id' al enviar la lista pública de mascotas perdidas
    cursor = db.lost_pets.find({"status": "lost"})
    results = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if "owner_id" in doc:
            del doc["owner_id"]
        results.append(doc)
    return results

@router.post("/sightings")
async def create_sighting(sighting: SightingCreate, db=Depends(get_db)):
    # RF 1.3: Registrar un avistamiento de forma anónima
    sighting_dict = sighting.model_dump()
    result = await db.sightings.insert_one(sighting_dict)
    sighting_dict["_id"] = str(result.inserted_id)
    
    # Si está vinculado a un reporte activo, lo agregamos como avistamiento registrado
    if sighting.lost_pet_id:
        try:
            await db.lost_pets.update_one(
                {"_id": ObjectId(sighting.lost_pet_id)},
                {"$push": {"sightings": sighting_dict}}
            )
        except Exception:
            pass
            
    return sighting_dict
