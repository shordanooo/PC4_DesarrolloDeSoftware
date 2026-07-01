from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from app.models.schemas import CaretakerCreate, ReviewCreate
from app.config.db import get_db
from app.patterns.creational.factory import CaregiverProfileFactory

router = APIRouter(prefix="/api/caretakers", tags=["Caretakers"])

@router.post("")
def create_caretaker(caretaker: CaretakerCreate, db=Depends(get_db)):
    try:
        caretaker_dict = caretaker.model_dump()
        
        # Factory Method: Instanciar perfil según el rol
        profile = CaregiverProfileFactory.create_profile(caretaker.role, caretaker_dict)
        
        name = caretaker_dict["name"]
        email = caretaker_dict["email"]
        role = caretaker_dict["role"]
        lat = caretaker_dict["lat"]
        lon = caretaker_dict["lon"]
        species_accepted = ",".join(caretaker_dict["species_accepted"])
        sizes_accepted = ",".join(caretaker_dict["sizes_accepted"])
        administers_medication = caretaker_dict["administers_medication"]
        is_verified = False
        alert_notifications_enabled = True
        id_document = caretaker_dict["id_document"]

        cursor = db.cursor()
        # Check duplicate email
        cursor.execute("SELECT id FROM caretakers WHERE email = ?", (email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Este correo ya se encuentra registrado.")

        cursor.execute(
            """
            INSERT INTO caretakers (name, email, role, lat, lon, species_accepted, sizes_accepted, administers_medication, is_verified, alert_notifications_enabled, id_document)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (name, email, role, lat, lon, species_accepted, sizes_accepted, administers_medication, is_verified, alert_notifications_enabled, id_document)
        )
        db.commit()
        caretaker_dict["id"] = cursor.lastrowid
            
        return caretaker_dict
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
def get_caretakers(db=Depends(get_db)):
    try:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM caretakers")
        caretakers_list = cursor.fetchall()
        
        results = []
        for doc in caretakers_list:
            # Fetch reviews for this caretaker
            cursor.execute("SELECT * FROM reviews WHERE caretaker_id = ?", (doc["id"],))
            reviews = cursor.fetchall()
            
            # Format arrays
            doc["species_accepted"] = [s.strip() for s in (doc["species_accepted"] or "").split(",") if s.strip()]
            doc["sizes_accepted"] = [s.strip() for s in (doc["sizes_accepted"] or "").split(",") if s.strip()]
            
            # Convert database boolean representations (SQLite uses 0/1)
            doc["administers_medication"] = bool(doc["administers_medication"])
            doc["is_verified"] = bool(doc["is_verified"])
            doc["alert_notifications_enabled"] = bool(doc["alert_notifications_enabled"])
            
            doc_for_factory = doc.copy()
            doc_for_factory["ratings"] = reviews
            
            role = doc.get("role", "Solidario")
            profile = CaregiverProfileFactory.create_profile(role, doc_for_factory)
            
            doc["average_rating"] = profile.average_rating
            doc["ratings"] = reviews
            doc["role_rules"] = profile.get_role_rules()
            results.append(doc)
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{caretaker_id}/verify")
def verify_caretaker(caretaker_id: int, db=Depends(get_db)):
    try:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM caretakers WHERE id = ?", (caretaker_id,))
        caretaker = cursor.fetchone()
        if not caretaker:
            raise HTTPException(status_code=404, detail="Cuidador no encontrado")
            
        doc_number = caretaker.get("id_document", "") or ""
        if not doc_number or len(doc_number.strip()) < 5:
            raise HTTPException(
                status_code=400, 
                detail="Documento de identidad oficial inválido o demasiado corto."
            )
            
        cursor.execute("UPDATE caretakers SET is_verified = 1 WHERE id = ?", (caretaker_id,))
        db.commit()
        return {"status": "success", "message": "Documento verificado. Perfil habilitado públicamente."}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{caretaker_id}/toggle-alerts")
def toggle_alerts(caretaker_id: int, enabled: bool, db=Depends(get_db)):
    try:
        cursor = db.cursor()
        cursor.execute("UPDATE caretakers SET alert_notifications_enabled = ? WHERE id = ?", (1 if enabled else 0, caretaker_id))
        db.commit()
        cursor.execute("SELECT id FROM caretakers WHERE id = ?", (caretaker_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Cuidador no encontrado")
        return {"status": "success", "alert_notifications_enabled": enabled}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{caretaker_id}/reviews")
def add_review(caretaker_id: int, review: ReviewCreate, db=Depends(get_db)):
    try:
        review_dict = review.model_dump()
        cursor = db.cursor()
        cursor.execute("SELECT id, role FROM caretakers WHERE id = ?", (caretaker_id,))
        caretaker = cursor.fetchone()
        if not caretaker:
            raise HTTPException(status_code=404, detail="Cuidador no encontrado")
            
        cursor.execute(
            """
            INSERT INTO reviews (caretaker_id, score, comment, reviewer_name, verified)
            VALUES (?, ?, ?, ?, ?)
            """,
            (caretaker_id, review_dict["score"], review_dict["comment"], review_dict["reviewer_name"], 1)
        )
        db.commit()
        
        # Calculate average rating
        cursor.execute("SELECT * FROM caretakers WHERE id = ?", (caretaker_id,))
        updated_caretaker = cursor.fetchone()
        cursor.execute("SELECT * FROM reviews WHERE caretaker_id = ?", (caretaker_id,))
        reviews = cursor.fetchall()
        
        updated_caretaker["species_accepted"] = [s.strip() for s in (updated_caretaker["species_accepted"] or "").split(",") if s.strip()]
        updated_caretaker["sizes_accepted"] = [s.strip() for s in (updated_caretaker["sizes_accepted"] or "").split(",") if s.strip()]
        updated_caretaker["ratings"] = reviews
        
        # Convert booleans
        updated_caretaker["administers_medication"] = bool(updated_caretaker["administers_medication"])
        updated_caretaker["is_verified"] = bool(updated_caretaker["is_verified"])
        updated_caretaker["alert_notifications_enabled"] = bool(updated_caretaker["alert_notifications_enabled"])

        profile = CaregiverProfileFactory.create_profile(updated_caretaker["role"], updated_caretaker)
        
        return {
            "status": "success", 
            "new_average_rating": profile.average_rating
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
