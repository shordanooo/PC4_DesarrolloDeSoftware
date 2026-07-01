# Especificacion de Requerimientos del Sistema - PC4

Esta documentacion describe los Requerimientos Funcionales (RF) y Requerimientos No Funcionales (RNF) definidos para el desarrollo de la plataforma PetMatch & Alert.

---

## 1. Modulo de Alertas de Mascotas Perdidas

### Requerimientos Funcionales (RF)

*   **RF 1.1 (Registro de Extravios):** El sistema debe permitir a un usuario autenticado con el rol de Dueno registrar una mascota extraviada en la base de datos ingresando su nombre, especie, raza, fotografia y descripcion detallada de sus señas particulares.
*   **RF 1.2 (Captura de Coordenadas Geograficas):** El sistema debe registrar las coordenadas de latitud y longitud correspondientes al punto exacto donde se extravio la mascota. Estas coordenadas se capturan de forma interactiva arrastrando un marcador en el mapa dinamico de Leaflet.
*   **RF 1.3 (Reportes de Avistamientos Anonimos):** El sistema debe permitir que cualquier ciudadano anonimo reporte un avistamiento de una mascota publicada. El reporte exige cargar una foto del avistamiento, descripcion de las condiciones y marcar el lugar exacto en el mapa.
*   **RF 1.4 (Envio de Alertas de Proximidad):** El sistema debe despachar de forma automatica alertas y notificaciones a todos los vecinos y cuidadores registrados cuyo radio de ubicacion sea menor o igual a 1.0 kilometro respecto al punto de extravio.

### Requerimientos No Funcionales (RNF)

*   **RNF 1.1 (Latencia Geografica):** El procesamiento e identificacion de vecinos, calculo de distancias radiales (Haversine) y distribucion asincrona de alertas a los observadores debe realizarse en un tiempo menor a 5 segundos (Latencia).
*   **RNF 1.2 (Seguridad y Privacidad):** Los datos personales, nombres, correos o telefonos de los duenos de mascotas deben permanecer anonimizados y ocultos para los ciudadanos que consultan el mapa o reportan avistamientos anonimos.

---

## 2. Buscador Multiproposito por Imagen

### Requerimientos Funcionales (RF)

*   **RF 2.1 (Clasificacion Inteligente por Imagen):** El sistema debe ofrecer un buscador donde, al cargar una imagen de una mascota y elegir la intencion de busqueda, filtre los resultados aplicando las siguientes reglas:
    *   *Adopcion:* Busca mascotas coincidentes en catalogos y bases de datos de albergues y ONGs aliadas.
    *   *Venta:* Busca mascotas coincidentes en criaderos comerciales certificados.
    *   *Verificar Perdida:* Compara las caracteristicas de la imagen con las alertas de mascotas perdidas activas en el area local.

### Requerimientos No Funcionales (RNF)

*   **RNF 2.1 (Intercambiabilidad de Motores de Clasificacion):** Para aislar el backend de las APIs propietarias o motores legados de procesamiento de imagenes, se debe utilizar un patron de diseno adaptador que unifique las llamadas y estandarice las respuestas de deteccion de especie y raza en un formato JSON limpio.

---

## 3. Red de Cuidadores Temporales y Evaluaciones

### Requerimientos Funcionales (RF)

*   **RF 3.1 (Registro por Roles de Cuidadores):** El sistema debe permitir a los usuarios registrarse como cuidadores temporales bajo tres categorias distintas de servicio:
    *   *Cuidador Solidario:* Servicio de acogida gratuito limitado a un maximo de 2 mascotas pequenas o medianas simultaneamente.
    *   *Cuidador Profesional:* Servicio de pago certificado limitado a un maximo de 5 mascotas simultaneamente.
    *   *Cuidador Especializado:* Servicio de pago con capacidad medica certificado limitado a un maximo de 10 mascotas sin restriccion de tamaño.
*   **RF 3.2 (Administracion de Medicacion):** El perfil de registro debe explicitar si el cuidador cuenta con entrenamiento tecnico veterinario para administrar medicamentos inyectados o de tratamiento cronico a las mascotas hospedadas.
*   **RF 3.3 (Suscripcion a Alertas de Proximidad):** Los cuidadores deben poder activar o desactivar la recepcion de notificaciones de animales perdidos a 1 km a la redonda a traves de un control interactivo (Switch) en su perfil.

### Requerimientos No Funcionales (RNF)

*   **RNF 3.1 (Verificacion de Identidad por DNI):** Los perfiles de cuidadores registrados ingresan en estado pendiente de aprobacion. Para ser activados y mostrados publicamente en la plataforma, un administrador debe ingresar al modulo de aprobacion y validar el numero de DNI oficial provisto por el cuidador.
