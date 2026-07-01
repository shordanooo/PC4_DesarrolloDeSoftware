from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from app.models.schemas import LostPetCreate, SightingCreate
from app.config.db import get_db
from app.patterns.structural.facade import AlertNotificationFacade

router = APIRouter(prefix="/api/lost-pets", tags=["Lost Pets"])

@router.post("")
def create_lost_pet(pet: LostPetCreate, db=Depends(get_db)):
    try:
        facade = AlertNotificationFacade(db)
        pet_dict = pet.model_dump()
        pet_dict["status"] = "lost"
        saved_pet = facade.register_lost_pet_and_alert_neighbors(pet_dict, radius_km=1.0)
        return saved_pet
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
def get_lost_pets(db=Depends(get_db)):
    try:
        cursor = db.cursor()
        cursor.execute("SELECT id, name, species, breed, description, lat, lon, photo, status FROM lost_pets WHERE status = 'lost'")
        pets = cursor.fetchall()
        
        for pet in pets:
            cursor.execute("SELECT id, lat, lon, photo, description FROM sightings WHERE lost_pet_id = ?", (pet["id"],))
            pet["sightings"] = cursor.fetchall()
            
        return pets
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sightings")
def create_sighting(sighting: SightingCreate, db=Depends(get_db)):
    try:
        sighting_dict = sighting.model_dump()
        cursor = db.cursor()
        cursor.execute(
            """
            INSERT INTO sightings (lost_pet_id, lat, lon, photo, description)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                sighting_dict["lost_pet_id"],
                sighting_dict["lat"],
                sighting_dict["lon"],
                sighting_dict["photo"],
                sighting_dict["description"]
            )
        )
        db.commit()
        sighting_dict["id"] = cursor.lastrowid
        return sighting_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
