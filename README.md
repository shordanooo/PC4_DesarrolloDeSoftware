# Plataforma PetMatch & Alert - PC4

Este proyecto implementa un sistema full-stack desarrollado en FastAPI (Python) y React (Vite) que utiliza SQLite como motor de base de datos relacional integrado. La aplicacion gestiona el reporte de mascotas perdidas, la distribucion de alertas geograficas en un radio de 1 km, la busqueda de mascotas basada en analisis de imagenes clasificada por intenciones y una red de cuidadores temporales organizados bajo restricciones operativas y validacion oficial.

El diseno arquitectonico se fundamenta en la aplicacion rigurosa de 6 Patrones de Diseno GoF (Gang of Four), divididos en creacionales, estructurales y de comportamiento, asegurando alta cohesion, bajo acoplamiento e intercambiabilidad.

---

## Patrones de Diseno Implementados

### 1. Patrones Creacionales

*   **Singleton (SQLiteManager)**:
    *   *Ubicacion:* backend/app/config/db.py
    *   *Proposito:* Administra una unica instancia de conexion a la base de datos local SQLite a lo largo del ciclo de vida del servidor web. Evita la sobrecarga de conexiones concurrentes y asegura que todas las consultas compartan el mismo estado de transacciones de base de datos.
*   **Factory Method (CaregiverProfileFactory)**:
    *   *Ubicacion:* backend/app/patterns/creational/factory.py
    *   *Proposito:* Instancia la clase de perfil de cuidador correspondiente (Cuidador Solidario, Cuidador Profesional o Cuidador Especializado) segun el tipo de servicio seleccionado. Esto permite aplicar limites maximos de capacidad de mascotas, reglas de cobros y administracion de medicamentos de forma dinamica.

### 2. Patrones Estructurales

*   **Adapter (ImageSearchAdapter)**:
    *   *Ubicacion:* backend/app/patterns/structural/adapter.py
    *   *Proposito:* Adapta una interfaz heredada e incompatible de un motor de clasificacion externo (que procesa archivos binarios sincronamente) para que funcione de manera asincrona y exponga una salida estandarizada en formato JSON, satisfaciendo el requerimiento RNF 2.1.
*   **Facade (AlertNotificationFacade)**:
    *   *Ubicacion:* backend/app/patterns/structural/facade.py
    *   *Proposito:* Provee una interfaz unificada y simplificada para el proceso complejo de registrar una alerta de mascota perdida. Esta fachada coordina la persistencia del reporte, el calculo de distancias mediante la formula Haversine, la busqueda de vecinos y cuidadores observadores en el radio de 1 km, y la activacion del sistema de notificaciones.

### 3. Patrones de Comportamiento

*   **Observer (AlertObserverSystem)**:
    *   *Ubicacion:* backend/app/patterns/behavioral/observer.py
    *   *Proposito:* Implementa la suscripcion y notificacion automatica de eventos a los vecinos y cuidadores registrados en el area geografica de la mascota perdida. Funciona en hilos asincronos concurrentes (utilizando asyncio.gather) logrando despachar notificaciones en un tiempo inferior a los 5 segundos (RNF 1.1).
*   **Strategy (SearchIntentStrategy)**:
    *   *Ubicacion:* backend/app/patterns/behavioral/strategy.py
    *   *Proposito:* Permite intercambiar dinamicamente el algoritmo de busqueda de mascotas segun la intencion seleccionada por el usuario en el formulario (Adopcion: busca en bases de datos de albergues y ONGs; Venta: busca en criaderos certificados; Verificar Perdida: busca coincidencias en el registro de alertas activas).

---

## Estructura del Codigo

PC4_DesarrolloDeSoftware/
├── backend/
│   ├── app/
│   │   ├── main.py                # Inicializacion de FastAPI y carga automatica de semilla
│   │   ├── config/
│   │   │   └── db.py              # Singleton de base de datos SQLite
│   │   ├── models/
│   │   │   └── schemas.py         # Modelos de validacion de datos (Pydantic)
│   │   ├── routers/               # Controladores y rutas de la API
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
└── README.md

---

## Requisitos de Entorno

*   Python 3.10 o superior
*   Node.js 18 o superior
*   SQLite3 integrado en el entorno de ejecucion de Python (no requiere instalaciones de servidores externos)

---

## Instrucciones de Ejecucion

### Paso 1: Configurar y Levantar el Servidor Backend

1.  Navegar a la carpeta del backend:
    ```bash
    cd backend
    ```
2.  Crear e iniciar un entorno virtual de Python:
    ```bash
    python -m venv venv
    # En Windows:
    .\venv\Scripts\activate
    ```
3.  Instalar las dependencias requeridas:
    ```bash
    pip install -r requirements.txt
    ```
4.  Ejecutar el servidor de desarrollo:
    ```bash
    python run.py
    ```
    La API estara disponible en http://localhost:8000. Los datos de prueba semilla se cargaran automaticamente en la primera ejecucion si la base de datos se encuentra vacia.

### Paso 2: Configurar y Levantar el Frontend

1.  Abrir una nueva terminal e ingresar a la carpeta del frontend:
    ```bash
    cd frontend
    ```
2.  Instalar las dependencias de Node:
    ```bash
    npm install
    ```
3.  Iniciar el servidor de Vite:
    ```bash
    npm run dev
    ```
    La aplicacion estara accesible a traves de http://localhost:5173.

---

## Guia de Pruebas y Calificacion

1.  **Carga Automatizada de Datos (Semilla):** Al levantar la API de FastAPI por primera vez, el sistema detecta de forma automatica que no existen registros en el archivo SQLite local y puebla las tablas con usuarios vecinos, cuidadores y alertas iniciales. No se requiere interaccion manual para inicializar el sistema.
2.  **Registro de Alertas Geograficas:**
    *   Ingresar a la aplicacion y autenticarse con el rol de Dueno.
    *   Acceder al formulario de reporte e ingresar la informacion de la mascota.
    *   Seleccionar una ubicacion en el mapa interactivo (por ejemplo, arrastrando el marcador a una coordenada cercana) y registrar el reporte.
    *   El sistema asincrono calculara la distancia y despachara las alertas a los vecinos en un radio de 1 km.
3.  **Avistamientos Anonimos:**
    *   En las tarjetas de alertas activas, cualquier usuario invitado puede hacer clic en Reportar Avistamiento Anonimo.
    *   Esto permite subir una foto de referencia y marcar la ubicacion exacta en el mapa, manteniendo ocultos los datos del dueno.
4.  **Buscador Inteligente:**
    *   Ingresar a la seccion de busqueda por imagen y subir un archivo.
    *   Seleccionar la intencion (Adopcion, Venta o Verificar Perdida).
    *   El sistema adaptara la imagen mediante el Adapter y aplicara la estrategia correspondiente para filtrar los resultados de albergues, criaderos o alertas activas respectivamente.
5.  **Verificacion de Cuidadores:**
    *   Ingresar como cuidador y registrarse en el sistema con un numero de DNI.
    *   El cuidador permanecera inactivo hasta que se acceda al Panel de Validacion en la barra lateral del modulo de cuidadores y se pulse el boton para validar el DNI (RNF 3.1), haciendolo publico e interactivo.
