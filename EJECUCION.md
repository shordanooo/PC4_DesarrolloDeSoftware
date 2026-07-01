# Guia de Ejecucion y Validacion del Sistema - PC4

Esta guia detalla los pasos para instalar, levantar y calificar la integracion de la plataforma PetMatch & Alert en un entorno local. El sistema utiliza una base de datos embebida SQLite de configuracion nula, por lo que no es necesario instalar motores externos.

---

## 1. Prerrequisitos de Entorno

*   Python 3.10 o superior instalado.
*   Node.js 18 o superior (con npm) instalado.
*   Conexion a Internet activa (para cargar mapas de OpenStreetMap).

---

## 2. Instrucciones para Levantar el Backend (FastAPI)

1.  Abra una ventana de terminal y navegue a la carpeta del backend:
    ```bash
    cd backend
    ```
2.  Cree el entorno virtual de Python:
    ```bash
    python -m venv venv
    ```
3.  Active el entorno virtual:
    *   En Windows (PowerShell):
        ```powershell
        .\venv\Scripts\activate
        ```
    *   En Linux/macOS:
        ```bash
        source venv/bin/activate
        ```
4.  Instale las dependencias de Python requeridas:
    ```bash
    pip install -r requirements.txt
    ```
5.  Ejecute el servidor de la API:
    ```bash
    python run.py
    ```
    El backend iniciara en el puerto http://localhost:8000. 
    En el primer arranque, el backend detecta si la base de datos local sqlite `backend/pet_alert_db.db` esta vacia y carga automaticamente el catalogo de mascotas, albergues, criaderos y cuidadores de prueba.

---

## 3. Instrucciones para Levantar el Frontend (React + Vite)

1.  Abra una segunda ventana de terminal y navegue a la carpeta del frontend:
    ```bash
    cd frontend
    ```
2.  Instale los modulos y dependencias de Node:
    ```bash
    npm install
    ```
3.  Inicie el servidor web de desarrollo:
    ```bash
    npm run dev
    ```
    El cliente estara disponible para su visualizacion en http://localhost:5173.

---

## 4. Checklist de Validacion de Funcionalidades

Para evaluar la integracion y el correcto funcionamiento del software, realice la siguiente secuencia de pruebas:

### Paso A: Acceso a la Plataforma e Inicializacion
*   Abra la aplicacion en http://localhost:5173.
*   Se presentara la pantalla de acceso. Puede iniciar sesion seleccionando el rol de Dueno con el correo de prueba `vecino.cercano1@gmail.com` y cualquier DNI.
*   Alternativamente, puede pulsar Navegar como Invitado para una exploracion anonima.

### Paso B: Mapa de Alertas Geograficas y Registro (Pestana 1)
*   En la pestaña Mascotas Perdidas vera un mapa interactivo con las alertas activas en el area.
*   Si inicio sesion como Dueno, llene el formulario para reportar una mascota perdida.
*   En el mapa del formulario, arrastre el marcador rojo o haga clic en la zona deseada para fijar las coordenadas de extravio.
*   Pulse Disparar Alerta Geografica. El backend procesara el registro en la base de datos local SQLite y despachara de manera inmediata notificaciones a vecinos ubicados a menos de 1 km de distancia.

### Paso C: Registro de Avistamientos Anonimos
*   En las tarjetas de mascotas perdidas publicadas en la lista, haga clic en el boton Reportar Avistamiento Anonimo.
*   Se abrira un cuadro de dialogo flotante.
*   Suba una imagen de referencia, ingrese una observacion breve y mueva el marcador en el mapa para indicar donde fue vista la mascota.
*   Pulse Enviar Avistamiento. La informacion se guardara en la base de datos asociada a la mascota perdida de forma segura sin revelar la informacion del propietario.

### Paso D: Buscador Inteligente por Imagen (Pestana 2)
*   Acceda a la pestaña Buscador por Imagen.
*   Seleccione una intencion de busqueda en el desplegable (Adopcion, Venta o Verificar Perdida).
*   Suba una fotografia de mascota de referencia.
*   Pulse Procesar y Buscar. El adaptador estandarizara la deteccion y ejecutara la estrategia de busqueda correspondiente. El sistema mostrara la respuesta JSON de metadatos detectada por la API y la lista de resultados del catalogo filtrado.

### Paso E: Registro y Verificacion de Cuidadores (Pestana 3)
*   Acceda a la pestaña Red de Cuidadores.
*   Cree un perfil de cuidador ingresando nombre, correo, tipo de cuidador (Solidario, Profesional o Especializado) y DNI. Marque las coordenadas de su centro de acogida en el mapa.
*   Al registrarse, el perfil entrara en estado inactivo.
*   Revise la barra lateral derecha titulada Verificacion de Cuidadores. Ahi aparecera el nuevo perfil registrado con su numero de DNI.
*   Pulse el boton Validar DNI y Habilitar Perfil. El cuidador pasara a estado verificado y se incorporara de inmediato en la lista publica con las reglas especificas aplicadas a su rol.
*   En los cuidadores listados, puede añadir reseñas y estrellas (★) para recalcular el promedio acumulado en la base de datos.
