from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config.db import SQLiteManager, get_db
from app.routers import lost_pets, image_search, caretakers

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Singleton: Conectar a SQLite al iniciar
    db_manager = SQLiteManager()
    db_manager.connect()
    yield
    # Cerrar conexión al apagar
    db_manager.close()

app = FastAPI(
    title="PetMatch & Alert API",
    description="Backend API con soporte para SQLite y 6 patrones GoF",
    version="1.0.0",
    lifespan=lifespan
)

# Habilitar CORS para conectar con React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(lost_pets.router)
app.include_router(image_search.router)
app.include_router(caretakers.router)

@app.get("/")
def root():
    return {"message": "API de PetMatch & Alert lista."}

@app.post("/api/seed")
def seed_database(db=Depends(get_db)):
    try:
        cursor = db.cursor()
        
        # En SQLite usamos DELETE FROM en vez de TRUNCATE
        cursor.execute("DELETE FROM reviews")
        cursor.execute("DELETE FROM sightings")
        cursor.execute("DELETE FROM lost_pets")
        cursor.execute("DELETE FROM caretakers")
        cursor.execute("DELETE FROM users")
        cursor.execute("DELETE FROM notifications")
        cursor.execute("DELETE FROM searchable_pets")
        db.commit()

        # 1. Poblar usuarios vecinos
        mock_users = [
            ("vecino.cercano1@gmail.com", -12.0465, -77.0428), # Aprox 30m
            ("vecino.cercano2@gmail.com", -12.0490, -77.0450), # Aprox 400m
            ("vecino.lejano@gmail.com", -12.1000, -77.0800),   # Aprox 7 km
        ]
        cursor.executemany("INSERT INTO users (email, lat, lon) VALUES (?, ?, ?)", mock_users)

        # 2. Poblar cuidadores de mascotas
        cursor.execute(
            """
            INSERT INTO caretakers (name, email, role, lat, lon, species_accepted, sizes_accepted, administers_medication, is_verified, alert_notifications_enabled, id_document)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("Carlos Gomez (Solidario)", "carlos.solidario@gmail.com", "Cuidador Solidario", -12.0470, -77.0430, "Perro, Gato", "pequeño, mediano", 0, 1, 1, "DNI12345678")
        )
        carlos_id = cursor.lastrowid
        
        # Insert review for Carlos
        cursor.execute(
            """
            INSERT INTO reviews (caretaker_id, score, comment, reviewer_name, verified)
            VALUES (?, ?, ?, ?, ?)
            """,
            (carlos_id, 5, "Excelente cuidador, muy cariñoso.", "Ana S.", 1)
        )

        # ana.especializada@gmail.com
        cursor.execute(
            """
            INSERT INTO caretakers (name, email, role, lat, lon, species_accepted, sizes_accepted, administers_medication, is_verified, alert_notifications_enabled, id_document)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("Ana Perez (Especializada)", "ana.especializada@gmail.com", "Cuidador Especializado", -12.0450, -77.0410, "Perro", "pequeño, mediano, grande", 1, 1, 1, "DNI87654321")
        )
        ana_id = cursor.lastrowid

        cursor.execute("INSERT INTO reviews (caretaker_id, score, comment, reviewer_name, verified) VALUES (?, ?, ?, ?, ?)", (ana_id, 5, "Muy profesional e instruida.", "Roberto F.", 1))
        cursor.execute("INSERT INTO reviews (caretaker_id, score, comment, reviewer_name, verified) VALUES (?, ?, ?, ?, ?)", (ana_id, 4, "Muy buen servicio.", "Sonia T.", 1))

        # luis.profesional@gmail.com
        cursor.execute(
            """
            INSERT INTO caretakers (name, email, role, lat, lon, species_accepted, sizes_accepted, administers_medication, is_verified, alert_notifications_enabled, id_document)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("Luis Lopez (Alertas Desactivadas)", "luis.profesional@gmail.com", "Cuidador Profesional", -12.0460, -77.0420, "Perro", "pequeño", 0, 1, 0, "DNI55555555")
        )

        # 3. Poblar catálogo del buscador por imagen
        mock_searchable_pets = [
            ("Rocky", "Perro", "Golden Retriever", "ong_shelter", "Albergue Patitas Felices", "2 años", "https://images.unsplash.com/photo-1552053831-71594a27632d", "Muy cariñoso, ideal para adopción en una casa con patio."),
            ("Michi", "Gato", "Persa", "ong_shelter", "ONG Gatos de la Calle", "1 año", "https://images.unsplash.com/photo-1614035030394-b6e5b01e0737", "Gato persa rescatado, muy tranquilo."),
            ("Kaiser", "Perro", "Golden Retriever", "certified_breeder", "Criadero Golden Elite", "3 meses", "https://images.unsplash.com/photo-1552053831-71594a27632d", "Cachorro con pedigree de alta calidad."),
            ("Max", "Perro", "Siberian Husky", "certified_breeder", "Criadero Wolfpack", "2 meses", "https://images.unsplash.com/photo-1531804055935-76f44d7c3621", "Certificado de vacunas al día, criadero certificado.")
        ]
        cursor.executemany(
            """
            INSERT INTO searchable_pets (name, species, breed, source_type, source_name, age, photo, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            mock_searchable_pets
        )

        # 4. Poblar una alerta activa de mascota perdida
        cursor.execute(
            """
            INSERT INTO lost_pets (name, species, breed, description, lat, lon, photo, status, owner_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("Fido", "Perro", "Golden Retriever", "Golden retriever con collar rojo. Se asustó con los cohetes.", -12.0460, -77.0425, "https://images.unsplash.com/photo-1552053831-71594a27632d", "lost", "owner_12345")
        )
        db.commit()

        return {"status": "success", "message": "SQLite Database seeded successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
