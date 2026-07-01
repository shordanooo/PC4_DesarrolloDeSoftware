# 🐾 PetMatch & Alert Platform - PC4

Este es un sistema full-stack desarrollado en **FastAPI (Python)** y **React (Vite)** utilizando **MongoDB** para gestionar el reporte de mascotas perdidas, alertas en tiempo real a vecinos y cuidadores en un radio de 1 km, un buscador inteligente de mascotas por imagen con filtrado por intenciones y una red de cuidadores clasificados por roles con verificación oficial.

El objetivo principal de este proyecto es demostrar el uso correcto y estructurado de **6 Patrones de Diseño GoF (Gang of Four)**: 2 creacionales, 2 estructurales y 2 de comportamiento.

---

## 🎨 Patrones de Diseño Implementados

### 1. Patrones Creacionales
*   **Singleton (`MongoDBManager`)**:
    *   *Ubicación:* `backend/app/config/db.py`
    *   *Propósito:* Garantizar una única conexión cliente al pool de base de datos MongoDB (Motor / PyMongo) a lo largo de todo el ciclo de vida del backend.
*   **Factory Method (`CaregiverProfileFactory`)**:
    *   *Ubicación:* `backend/app/patterns/creational/factory.py`
    *   *Propósito:* Instanciar la subclase adecuada de perfil de cuidador (`Solidario`, `Profesional`, `Especializado`) según el rol elegido, aplicando dinámicamente sus límites, restricciones y cálculo de calificación.

### 2. Patrones Estructurales
*   **Adapter (`ImageSearchAdapter`)**:
    *   *Ubicación:* `backend/app/patterns/structural/adapter.py`
    *   *Propósito:* Adaptar un motor de búsqueda por imágenes externo heredado (incompatible, síncrono y basado en archivos locales) para cumplir con el **RNF 2.1**, devolviendo un formato JSON estándar que hace al buscador intercambiable.
*   **Facade (`AlertNotificationFacade`)**:
    *   *Ubicación:* `backend/app/patterns/structural/facade.py`
    *   *Propósito:* Simplificar el subsistema de alertas en una sola llamada limpia desde el router. Coordina el registro en BD, búsqueda de vecinos en el radio de 1 km (fórmula Haversine), verificación de restricciones de cuidadores y activación del Observer.

### 3. Patrones de Comportamiento
*   **Observer (`AlertObserverSystem`)**:
    *   *Ubicación:* `backend/app/patterns/behavioral/observer.py`
    *   *Propósito:* Notificar a usuarios y cuidadores registrados como observadores en un radio de 1 km cuando se publica una mascota perdida (sujeto). Corre de forma asíncrona y en paralelo (`asyncio.gather`) para garantizar latencias menores a 5 segundos (**RNF 1.1**).
*   **Strategy (`SearchIntentStrategy`)**:
    *   *Ubicación:* `backend/app/patterns/behavioral/strategy.py`
    *   *Propósito:* Encapsular las estrategias de filtrado para el buscador inteligente según la intención del usuario: `AdopcionStrategy` (catálogo de ONGs), `VentaStrategy` (criadores certificados) o `VerificarPerdidaStrategy` (alertas de perdidos).

---

## 📂 Estructura del Código

```text
PC4_DesarrolloDeSoftware/
├── backend/
│   ├── app/
│   │   ├── main.py                # Entrada FastAPI y endpoints semilla
│   │   ├── config/
│   │   │   └── db.py              # Singleton MongoDB
│   │   ├── models/
│   │   │   └── schemas.py         # Validación Pydantic
│   │   ├── routers/               # Rutas API
│   │   └── patterns/
│   │       ├── creational/        # Factory Method
│   │       ├── structural/        # Adapter, Facade
│   │       └── behavioral/        # Observer, Strategy
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Interfaz de usuario interactiva y cliente API
│   │   ├── index.css              # Estilos CSS variables, modo oscuro y animaciones
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 Cómo ejecutar el proyecto locally

### prerrequisitos
1.  Tener instalado **Python 3.10+** y **Node.js 18+**.
2.  Tener **MongoDB** ejecutándose localmente en `mongodb://localhost:27017` (si deseas usar el backend real, de lo contrario la aplicación iniciará automáticamente en **modo demostración local con datos mock**).

### Paso 1: Configurar y Ejecutar el Backend (FastAPI)
1.  Abre una terminal en la carpeta `backend/`:
    ```bash
    cd backend
    ```
2.  Crea un entorno virtual e instala dependencias:
    ```bash
    python -m venv venv
    # En Windows:
    .\venv\Scripts\activate
    pip install -r requirements.txt
    ```
3.  Inicia el servidor backend:
    ```bash
    python run.py
    ```
    El API estará disponible en `http://localhost:8000`. Puedes ingresar a la documentación en `http://localhost:8000/docs`.

### Paso 2: Configurar y Ejecutar el Frontend (React)
1.  Abre otra terminal en la carpeta `frontend/`:
    ```bash
    cd frontend
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Inicia el servidor de desarrollo:
    ```bash
    npm run dev
    ```
    La aplicación web se abrirá en `http://localhost:5173`.

---

## 🧪 Pasos sugeridos para calificar / probar el sistema

1.  **Modo Simulación**: Al abrir el frontend, si el backend está apagado, se activará el **Modo Demostración Offline** con datos de prueba locales para interactuar de inmediato.
2.  **Inicialización de Semilla**: Si conectaste MongoDB y encendiste el backend, haz clic en **⚡ Inicializar Semilla (MongoDB)** en la cabecera del frontend. Esto poblará la BD con usuarios simulados en Lima, criaderos certificados, albergues y cuidadores de prueba.
3.  **Registro de Alerta (1 km)**: 
    *   Dirígete a la pestaña **Reportar Pérdida**.
    *   Ingresa el nombre, especie, raza y descripción.
    *   Haz clic en el mapa cuadriculado interactivo para marcar una coordenada cercana (ej: latitud `-12.046`, longitud `-77.042`).
    *   Registra la mascota. El sistema ejecutará el **Facade** y el **Observer**, enviando notificaciones asíncronas inmediatas y mostrando la latencia del proceso en la campana de notificaciones.
4.  **Buscador Inteligente**:
    *   Ve a **Buscador Inteligente**.
    *   Elige la intención (ej: *Adopción* o *Venta*).
    *   Sube cualquier imagen. El **Adapter** extraerá los metadatos y la **Estrategia** filtrará exclusivamente albergues o criaderos.
5.  **Verificación de Identidad (Cuidadores)**:
    *   Ve a **Red de Cuidadores**.
    *   Registra un nuevo cuidador. Ingresa un número de DNI oficial.
    *   El perfil no aparecerá en la red pública hasta que lo verifiques en el panel de administración derecho **🛡️ Panel de Validación (RNF 3.1)**. Haz clic en validar para activarlo.
