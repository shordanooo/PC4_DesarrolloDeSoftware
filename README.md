# Plataforma PetMatch & Alert - PC4

Este proyecto implementa un sistema de software modular desarrollado en FastAPI (Python) y React (Vite) con persistencia de datos local en SQLite. La aplicacion gestiona el reporte de mascotas perdidas, la emision de alertas geograficas asincronas en un radio maximo de 1 km, la busqueda automatizada de mascotas basada en analisis de imagenes estructurada por intenciones de usuario y la administracion de una red de cuidadores temporales clasificados por roles operativos.

La arquitectura del sistema se rige bajo la implementacion de 6 Patrones de Diseno de la metodologia Gang of Four (GoF) para garantizar la modularidad, escalabilidad e intercambiabilidad de los componentes del dominio.

---

## Patrones de Diseno Implementados

### 1. Patrones Creacionales

*   **Singleton (SQLiteManager)**:
    *   *Ubicacion:* backend/app/config/db.py
    *   *Proposito:* Encapsula y controla una unica instancia de conexion de base de datos SQLite activa a lo largo del ciclo de vida del servidor web, optimizando la asignacion de recursos y controlando el estado transaccional.
*   **Factory Method (CaregiverProfileFactory)**:
    *   *Ubicacion:* backend/app/patterns/creational/factory.py
    *   *Proposito:* Instancia dinamicamente el tipo de perfil de cuidador correspondiente (Cuidador Solidario, Cuidador Profesional o Cuidador Especializado) evaluando las restricciones de operacion, limites de mascotas permitidas y reglas de negocio aplicables a cada rol.

### 2. Patrones Estructurales

*   **Adapter (ImageSearchAdapter)**:
    *   *Ubicacion:* backend/app/patterns/structural/adapter.py
    *   *Proposito:* Adapta las interfaces y flujos sincronos de un componente de clasificacion heredado (ExternalLegacyPetSearchEngine) para integrarlo de forma asincrona y estructurada mediante modelos estandarizados JSON en el enrutador de FastAPI.
*   **Facade (AlertNotificationFacade)**:
    *   *Ubicacion:* backend/app/patterns/structural/facade.py
    *   *Proposito:* Simplifica el flujo complejo de alertas geograficas al unificar las tareas de persistencia del reporte, calculo de coordenadas radiales Haversine y disparo de notificaciones a los observadores en una unica llamada limpia de API.

### 3. Patrones de Comportamiento

*   **Observer (AlertObserverSystem)**:
    *   *Ubicacion:* backend/app/patterns/behavioral/observer.py
    *   *Proposito:* Registra y despacha notificaciones push/email concurrentes a vecinos y cuidadores activos (observadores) en un rango de 1 km en paralelo mediante hilos asincronos concurrentes (asyncio.gather).
*   **Strategy (SearchIntentStrategy)**:
    *   *Ubicacion:* backend/app/patterns/behavioral/strategy.py
    *   *Proposito:* Encapsula y selecciona dinamicamente el algoritmo de busqueda de mascotas segun la intencion del usuario (adopcion en ONGs, venta en criaderos o localizacion de alertas activas).

---

## Flujos de Control del Sistema

### Flujo 1: Registro de Mascota Perdida y Alerta Geografica (Facade + Observer)

```mermaid
sequenceDiagram
    autonumber
    actor Dueno as Usuario Dueno
    participant FE as Frontend (React)
    participant BE as Backend (FastAPI)
    participant FC as Facade (AlertNotificationFacade)
    participant DB as SQLite Database
    participant OB as Observer (AlertObserverSystem)
    
    Dueno->>FE: Completa formulario y selecciona coordenadas
    FE->>BE: POST /api/lost-pets (Payload JSON)
    BE->>FC: register_lost_pet_and_alert_neighbors()
    FC->>DB: INSERT INTO lost_pets
    DB-->>FC: Retorna ID de mascota
    FC->>DB: SELECT vecinos/cuidadores a menos de 1 km (Haversine)
    DB-->>FC: Lista de observadores
    FC->>OB: notify_observers_async()
    Note over OB: Despacho asincrono via asyncio.gather
    OB-->>FC: Notificaciones procesadas
    FC-->>BE: Retorna objeto mascota guardado
    BE-->>FE: HTTP 200 (Datos guardados y notificados)
    FE->>Dueno: Muestra mensaje de exito e hito de alertas enviadas
```

### Flujo 2: Buscador Inteligente por Imagen (Adapter + Strategy)

```mermaid
sequenceDiagram
    autonumber
    actor Invitado as Usuario Invitado
    participant FE as Frontend (React)
    participant BE as API Router (image_search)
    participant AD as Adapter (ImageSearchAdapter)
    participant LE as Legacy Search Engine
    participant SC as Strategy (SearchContext)
    participant DB as SQLite Database

    Invitado->>FE: Carga imagen y selecciona intencion (Adopcion/Venta/Verificar)
    FE->>BE: POST /api/image-search (Multipart Form Data)
    BE->>AD: find_matches(image_bytes)
    Note over AD: Adapta entrada binaria sincrona heredada
    AD->>LE: process_image_legacy()
    LE-->>AD: Retorna metadatos propietarios
    AD-->>BE: Retorna metadatos estandarizados (Especie, Raza, Confianza)
    BE->>SC: execute_search(metadata, db)
    Note over SC: Selecciona estrategia segun intencion
    SC->>DB: SELECT filtered by species and breed
    DB-->>SC: Resultados coincidentes
    SC-->>BE: Lista filtrada de mascotas
    BE-->>FE: HTTP 200 (Metadatos detectados + Resultados)
    FE->>Invitado: Muestra metadatos y tarjetas filtradas
```

### Flujo 3: Red de Cuidadores, Validacion y Calificaciones (Factory Method)

```mermaid
sequenceDiagram
    autonumber
    actor Cuidador as Usuario Cuidador
    actor Admin as Administrador
    participant FE as Frontend (React)
    participant BE as API Router (caretakers)
    participant FY as Factory (CaregiverProfileFactory)
    participant DB as SQLite Database

    Cuidador->>FE: Envia formulario de registro con DNI y rol
    FE->>BE: POST /api/caretakers (JSON)
    BE->>FY: create_profile(role, data)
    Note over FY: Instancia Solidario, Profesional o Especializado
    FY-->>BE: Retorna objeto con reglas y restricciones aplicadas
    BE->>DB: INSERT INTO caretakers (is_verified = 0)
    DB-->>FE: Confirmacion de registro pendiente
    
    Note over Admin, FE: Validacion administrativa
    Admin->>FE: Presiona Validar DNI
    FE->>BE: POST /api/caretakers/{id}/verify
    BE->>DB: UPDATE caretakers SET is_verified = 1
    DB-->>FE: Perfil verificado
    
    Note over FE: Valoraciones y calificaciones
    FE->>BE: POST /api/caretakers/{id}/reviews (Resena)
    BE->>DB: INSERT INTO reviews
    BE->>DB: SELECT reviews
    DB-->>BE: Historial de reviews
    BE->>FY: Recalcula average_rating
    BE-->>FE: Promedio actualizado
```

---

## Estructura General del Proyecto

PC4_DesarrolloDeSoftware/
├── backend/
│   ├── app/
│   │   ├── main.py                # Entrada FastAPI e inicializacion de semilla automatica
│   │   ├── config/
│   │   │   └── db.py              # Singleton de base de datos SQLite
│   │   ├── models/
│   │   │   └── schemas.py         # Modelos de validacion de datos (Pydantic)
│   │   ├── routers/               # Rutas de la API (Lost Pets, Caretakers, Image Search)
│   │   └── patterns/
│   │       ├── creational/        # Factory Method
│   │       ├── structural/        # Adapter y Facade
│   │       └── behavioral/        # Observer y Strategy
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Interfaz de usuario interactiva en React
│   │   ├── index.css              # Hojas de estilo y configuraciones de diseno
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── REQUERIMIENTOS.md              # Especificacion de requerimientos tecnicos
├── EJECUCION.md                   # Guia detallada de despliegue y validacion
└── README.md                      # Descripcion del proyecto y patrones de diseno
