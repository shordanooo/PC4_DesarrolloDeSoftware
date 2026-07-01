from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config.db import MongoDBManager, get_db
from app.routers import lost_pets, image_search, caretakers

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Singleton: Conectar a MongoDB al iniciar
    db_manager = MongoDBManager()
    db_manager.connect()
    yield
    # Cerrar conexión al apagar
    db_manager.close()

app = FastAPI(
    title="Pet Alert & Caretaker Platform API",
    description="Backend API con soporte para 6 patrones GoF",
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
async def root():
    return {"message": "API de Reporte de Mascotas y Cuidadores lista."}

@app.post("/api/seed")
async def seed_database(db=Depends(get_db)):
    # Limpiar base de datos
    await db.searchable_pets.delete_many({})
    await db.lost_pets.delete_many({})
    await db.caretakers.delete_many({})
    await db.users.delete_many({})
    await db.notifications.delete_many({})
    await db.sightings.delete_many({})

    # 1. Usuarios para notificaciones en un radio
    mock_users = [
        {"email": "vecino.cercano1@gmail.com", "lat": -12.0465, "lon": -77.0428}, # Aprox 30 metros (Recibirá alerta)
        {"email": "vecino.cercano2@gmail.com", "lat": -12.0490, "lon": -77.0450}, # Aprox 400 metros (Recibirá alerta)
        {"email": "vecino.lejano@gmail.com", "lat": -12.1000, "lon": -77.0800},   # Aprox 7 km (No recibirá alerta)
    ]
    await db.users.insert_many(mock_users)

    # 2. Cuidadores con restricciones y toggle de alertas
    mock_caretakers = [
        {
            "name": "Carlos Gomez (Solidario)",
            "email": "carlos.solidario@gmail.com",
            "role": "Cuidador Solidario",
            "lat": -12.0470,
            "lon": -77.0430, # Aprox 100m
            "species_accepted": ["Perro", "Gato"],
            "sizes_accepted": ["pequeño", "mediano"],
            "administers_medication": False,
            "is_verified": True,
            "alert_notifications_enabled": True, # Alertas ON (Recibirá alerta)
            "ratings": [{"score": 5, "comment": "Excelente cuidador, muy cariñoso.", "verified": True}],
            "id_document": "DNI12345678"
        },
        {
            "name": "Ana Perez (Especializada)",
            "email": "ana.especializada@gmail.com",
            "role": "Cuidador Especializado",
            "lat": -12.0450,
            "lon": -77.0410, # Aprox 200m
            "species_accepted": ["Perro"], # Solo perros
            "sizes_accepted": ["pequeño", "mediano", "grande"],
            "administers_medication": True, # Puede dar medicinas
            "is_verified": True, # Verificada públicamente
            "alert_notifications_enabled": True, # Alertas ON (Recibirá alerta si la mascota es un perro)
            "ratings": [
                {"score": 5, "comment": "Muy profesional e instruida.", "verified": True},
                {"score": 4, "comment": "Muy buen servicio.", "verified": True}
            ],
            "id_document": "DNI87654321"
        },
        {
            "name": "Luis Lopez (Alertas Desactivadas)",
            "email": "luis.profesional@gmail.com",
            "role": "Cuidador Profesional",
            "lat": -12.0460,
            "lon": -77.0420, # Aprox 60m
            "species_accepted": ["Perro"],
            "sizes_accepted": ["pequeño"],
            "administers_medication": False,
            "is_verified": True,
            "alert_notifications_enabled": False, # Alertas OFF (No recibirá alerta)
            "ratings": [],
            "id_document": "DNI55555555"
        }
    ]
    await db.caretakers.insert_many(mock_caretakers)

    # 3. Base de datos para el buscador por imagen
    mock_searchable_pets = [
        # ONGs / Albergues
        {
            "name": "Rocky",
            "species": "Perro",
            "breed": "Golden Retriever",
            "source_type": "ong_shelter",
            "source_name": "Albergue Patitas Felices",
            "age": "2 años",
            "photo": "https://images.unsplash.com/photo-1552053831-71594a27632d",
            "description": "Muy cariñoso, ideal para adopción en una casa con patio."
        },
        {
            "name": "Michi",
            "species": "Gato",
            "breed": "Persa",
            "source_type": "ong_shelter",
            "source_name": "ONG Gatos de la Calle",
            "age": "1 año",
            "photo": "https://images.unsplash.com/photo-1614035030394-b6e5b01e0737",
            "description": "Gato persa rescatado, muy tranquilo."
        },
        # Criaderos Certificados
        {
            "name": "Kaiser",
            "species": "Perro",
            "breed": "Golden Retriever",
            "source_type": "certified_breeder",
            "source_name": "Criadero Golden Elite",
            "age": "3 meses",
            "photo": "https://images.unsplash.com/photo-1552053831-71594a27632d",
            "description": "Cachorro con pedigree de alta calidad."
        },
        {
            "name": "Max",
            "species": "Perro",
            "breed": "Siberian Husky",
            "source_type": "certified_breeder",
            "source_name": "Criadero Wolfpack",
            "age": "2 meses",
            "photo": "https://images.unsplash.com/photo-1531804055935-76f44d7c3621",
            "description": "Certificado de vacunas al día, criadero certificado."
        }
    ]
    await db.searchable_pets.insert_many(mock_searchable_pets)

    # 4. Alerta activa de mascota perdida
    mock_lost_pets = [
        {
            "name": "Fido",
            "species": "Perro",
            "breed": "Golden Retriever",
            "description": "Golden retriever con collar rojo. Se asustó con los cohetes.",
            "lat": -12.0460,
            "lon": -77.0425,
            "photo": "https://images.unsplash.com/photo-1552053831-71594a27632d",
            "status": "lost",
            "owner_id": "owner_12345",
            "sightings": []
        }
    ]
    await db.lost_pets.insert_many(mock_lost_pets)

    return {"status": "success", "message": "Base de datos inicializada con datos de prueba."}
