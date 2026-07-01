from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from app.models.schemas import CaretakerCreate, ReviewCreate
from app.config.db import get_db
from app.patterns.creational.factory import CaregiverProfileFactory
from bson import ObjectId

router = APIRouter(prefix="/api/caretakers", tags=["Caretakers"])

@router.post("")
async def create_caretaker(caretaker: CaretakerCreate, db=Depends(get_db)):
    try:
        caretaker_dict = caretaker.model_dump()
        
        # Factory Method: Instanciar perfil según el rol (RF 3.1)
        profile = CaregiverProfileFactory.create_profile(caretaker.role, caretaker_dict)
        
        # RNF 3.1: El perfil se crea inactivo (is_verified = False) hasta validar el ID oficial
        caretaker_dict["is_verified"] = False
        caretaker_dict["ratings"] = []
        
        result = await db.caretakers.insert_one(caretaker_dict)
        caretaker_dict["_id"] = str(result.inserted_id)
        
        return caretaker_dict
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_caretakers(db=Depends(get_db)):
    # RNF 3.1: Habilitar públicamente solo si está verificado (is_verified = True)
    cursor = db.caretakers.find({"is_verified": True})
    results = []
    async for doc in cursor:
        role = doc.get("role", "Solidario")
        profile = CaregiverProfileFactory.create_profile(role, doc)
        
        doc["_id"] = str(doc["_id"])
        # RF 3.4: Mostrar la calificación promedio basada en reseñas verificadas
        doc["average_rating"] = profile.average_rating
        doc["role_rules"] = profile.get_role_rules()
        results.append(doc)
    return results

@router.post("/{caretaker_id}/verify")
async def verify_caretaker(caretaker_id: str, db=Depends(get_db)):
    # RNF 3.1: Validar documento de identidad oficial
    try:
        caretaker = await db.caretakers.find_one({"_id": ObjectId(caretaker_id)})
        if not caretaker:
            raise HTTPException(status_code=404, detail="Cuidador no encontrado")
            
        doc_number = caretaker.get("id_document", "")
        if not doc_number or len(doc_number.strip()) < 5:
            raise HTTPException(
                status_code=400, 
                detail="Documento de identidad oficial inválido o demasiado corto."
            )
            
        await db.caretakers.update_one(
            {"_id": ObjectId(caretaker_id)},
            {"$set": {"is_verified": True}}
        )
        return {"status": "success", "message": "Documento verificado. Perfil habilitado públicamente."}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{caretaker_id}/toggle-alerts")
async def toggle_alerts(caretaker_id: str, enabled: bool, db=Depends(get_db)):
    # RF 3.3: Interruptor para activar/desactivar la recepción de alertas
    try:
        result = await db.caretakers.update_one(
            {"_id": ObjectId(caretaker_id)},
            {"$set": {"alert_notifications_enabled": enabled}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Cuidador no encontrado")
        return {"status": "success", "alert_notifications_enabled": enabled}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{caretaker_id}/reviews")
async def add_review(caretaker_id: str, review: ReviewCreate, db=Depends(get_db)):
    # RF 3.4: Agregar reseña y actualizar la calificación
    try:
        caretaker = await db.caretakers.find_one({"_id": ObjectId(caretaker_id)})
        if not caretaker:
            raise HTTPException(status_code=404, detail="Cuidador no encontrado")
            
        review_dict = review.model_dump()
        
        await db.caretakers.update_one(
            {"_id": ObjectId(caretaker_id)},
            {"$push": {"ratings": review_dict}}
        )
        
        # Recargar para recalcular
        updated_caretaker = await db.caretakers.find_one({"_id": ObjectId(caretaker_id)})
        profile = CaregiverProfileFactory.create_profile(updated_caretaker["role"], updated_caretaker)
        
        return {
            "status": "success", 
            "new_average_rating": profile.average_rating
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
