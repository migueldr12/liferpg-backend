# Life-RPG · Backend

API REST en Node.js con Express. Arquitectura **por módulos** con **arquitectura limpia**.
La persistencia usa Prisma 6 con MongoDB Atlas. El esquema cubre los modelos de M00–M15; consulta el README del frontend para el estado de cada pantalla. Consulta [docs/database.md](docs/database.md) para el mapa de colecciones, las reglas de integridad y la política de fechas UTC.

## Capas de cada módulo

Las dependencias apuntan hacia adentro: `interfaces → application → domain ← infrastructure`.

| Carpeta                       | Contenido                                           |
| ----------------------------- | --------------------------------------------------- |
| `domain/entities`             | Entidades de negocio puras, sin Express ni BD       |
| `domain/repositories`         | Contratos (interfaces) de los repositorios          |
| `application/services`        | Casos de uso: un servicio por RDF del Excel         |
| `application/dtos`            | Datos de entrada y salida de los servicios          |
| `infrastructure/repositories` | Implementación concreta de los contratos con Prisma |
| `infrastructure/mappers`      | Conversión documento de BD ↔ entidad                |
| `interfaces/controllers`      | Traducen `req`/`res` a llamadas a servicios         |
| `interfaces/routes`           | Router de Express del módulo                        |
| `interfaces/validators`       | Validación de body, params y query                  |

## Carpetas compartidas (`src/`)

- `config/`: variables de entorno y configuración del servidor (nube o LAN)
- `routes/`: router raíz que monta cada módulo en `/api/v1/<modulo>`
- `jobs/`: tareas automáticas del servidor (cierre diario, avisos de inactividad)
- `shared/errors`, `shared/middlewares` (JWT, roles, manejo de errores, log REST), `shared/utils`, `shared/domain`
- `shared/infrastructure/database`, `push` (Firebase Cloud Messaging), `mail`

## Módulos

| Carpeta                      | Módulo                                | Responsable | Sprint |
| ---------------------------- | ------------------------------------- | ----------- | ------ |
| `m00-usuarios-autenticacion` | Usuarios, autenticación y dispositivo | Equipo      | 1      |
| `m01-tamagotchi-perfil`      | Tamagotchi y perfil de usuario        | Dev 1       | 1      |
| `m02-habitos`                | Hábitos diarios (quests)              | Dev 1       | 2      |
| `m03-misiones-enfoque`       | Misiones únicas y enfoque             | Dev 1       | 3      |
| `m04-tienda`                 | Tienda de la mascota                  | Dev 2       | 1      |
| `m05-logros-progresion`      | Logros y progresión                   | Dev 2       | 2      |
| `m06-vitalidad`              | Vitalidad y estado de la mascota      | Dev 2       | 3      |
| `m07-visualizador-usuarios`  | Visualizador de usuarios              | Dev 3       | 1      |
| `m08-botin`                  | Botín (regalos entre amigos)          | Dev 3       | 2      |
| `m09-diario-aventura`        | Diario de aventura                    | Dev 3       | 3      |
| `m10-notificaciones`         | Notificaciones de acompañamiento      | Dev 4       | 1      |
| `m11-resumen-progreso`       | Resumen de progreso y pendientes      | Dev 4       | 2      |
| `m12-retos-grupo`            | Retos y métricas de grupo             | Dev 4       | 3      |
| `m13-sincronizacion-red`     | Sincronización local y red            | Dev 5       | 1      |
| `m14-economia-global`        | Balanceo de economía global           | Dev 5       | 2      |
| `m15-gestion-bd`             | Gestión de base de datos              | Dev 5       | 3      |

## Configuración

Para una demostración local con datos ficticios y la PWA, consulta [docs/demo.md](docs/demo.md).

```bash
npm install -g pnpm
cp .env.example .env
pnpm install
pnpm db:validate
pnpm db:generate
pnpm db:check
```

Antes de validar, configura `DATABASE_URL` en el entorno o en `.env`. Para desarrollo también se admite `MONGODB_URI` en `atlas-credentials.env`, dentro de este backend. Si la URI no especifica una base, se usa `liferpg`. Ambos archivos locales están excluidos de Git. Atlas requiere acceso desde la IP del servidor.

`db:seed-m04` carga solo el catálogo de prueba; ya no modifica usuarios. Para cargar usuarios e inventario de prueba, `db:seed-test-m04` y `db:seed-test-m10` se dirigen exclusivamente a `liferpg_test`. Los scripts rechazan la escritura de datos de usuarios de prueba en otras bases y están bloqueados cuando `NODE_ENV=production`.

`pnpm db:prepare-test` aplica el esquema y los índices a la base `liferpg_test` del clúster configurado. Se puede indicar otro clúster con `TEST_DATABASE_URL`, pero la base debe llamarse `liferpg_test`. Este comando no cambia el destino normal de la aplicación y no carga usuarios ni datos de ejemplo.

`pnpm test` usa un entorno de pruebas sin `DEV_USER_ID`. Las pruebas que escriben en MongoDB (M10 y M15) solo se ejecutan al definir `RUN_MONGO_INTEGRATION=1` en la terminal antes del comando y requieren acceso a `liferpg_test`.

La exportación administrativa `POST /admin/data/exports` genera JSON de perfiles y no incluye contraseñas ni credenciales; no es un respaldo completo ni restaurable. La purga de la PWA sigue siendo simulada. Para un respaldo restaurable falta configurar MongoDB Database Tools, almacenamiento y un procedimiento de restauración probado.

M13 ofrece `GET /admin/host/clients` para dispositivos registrados de notificaciones y `GET /admin/host/logs` para las últimas 200 peticiones del proceso. Ambos requieren administrador. El registro es temporal, no comparte eventos entre instancias y oculta parámetros e identificadores. Las sesiones Firebase no se registran como sesiones individuales en MongoDB, por lo que estos dispositivos no indican presencia en tiempo real ni pueden revocarse individualmente desde M13. La revisión de inactividad de M10 se puede ejecutar manualmente desde el monitor de host con una vista previa; no hay un job automático configurado.

`db:check` verifica conexión, colecciones e índices esperados sin modificar datos. Para inicializar una base o aplicar cambios de colecciones e índices, revisa el destino y ejecuta `pnpm db:push`. MongoDB no usa Prisma Migrate: si cambias el formato de documentos existentes, planifica su actualización por separado.

Todas las fechas se almacenan en UTC. El cliente calcula el día local; los campos `dayStart` representan la medianoche UTC del registro.

### Conectar la PWA desplegada

- En el backend configura `NODE_ENV=production`, `DATABASE_URL`, `FIREBASE_PROJECT_ID` y `CORS_ORIGINS` con el origen de la PWA. Despliega con `pnpm start`, comprueba `/api/v1/estado` y verifica que la base ya tenga las colecciones e índices esperados.
- En la PWA configura `VITE_API_URL` con la URL de la API terminada en `/api/v1` y usa el mismo proyecto de Firebase. Las pantallas administrativas requieren iniciar sesión con una cuenta cuyo usuario en MongoDB tenga rol `ADMIN`.
- Para recibir push reales se necesitan `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` y dispositivos activos con tokens válidos. El inicio de sesión de Firebase no registra esos dispositivos; si el cliente aún no los registra, queda pendiente integrar el registro y la renovación de tokens. M10 también requiere un catálogo activo de stickers para habilitar el envío.

## Servidor

```bash
pnpm dev    # reinicia al guardar cambios
pnpm start  # producción
pnpm test   # pruebas con node:test
```

La API queda en `http://localhost:3000/api/v1`. `GET /api/v1/estado` (alias `/health`) confirma que el servidor responde y que llega a MongoDB (503 si la base no contesta). Con `HOST=0.0.0.0` la app móvil puede conectarse por la IP de la computadora en la red local.

- `src/server.js` abre el puerto y cierra la conexión a MongoDB al detenerse.
- `src/app.js` arma Express (CORS, JSON, rutas y manejo de errores) sin abrir el puerto, para poder probarlo.
- `src/routes/index.js` monta el router de cada módulo en `/api/v1/<recurso>`.

### Convenciones para los módulos

- La API cumple el contrato de la app móvil: `docs/API.md` del repo `Life-RPG-mobile`. Si algo cambia, se cambia primero ahí.
- Las respuestas exitosas devuelven el recurso o la lista directamente.
- Los errores siempre tienen la forma `{ "error": "mensaje en español", "code": "...", "details"?: {...} }`; la app muestra `error` tal cual. Los servicios lanzan los errores de `src/shared/errors/AppError.js` (`notFound`, `validationError`, `conflict`…) y `errorHandler` elige el código HTTP. Los errores comunes de Prisma (registro duplicado, id inválido, no encontrado) se traducen solos.
- Envuelve cada controlador `async` con `asyncHandler` (`src/shared/utils/asyncHandler.js`) para que sus errores lleguen al manejador.
- Para agregar un módulo, exporta un `Router` desde `src/modules/<modulo>/interfaces/routes/` y móntalo en `src/routes/index.js`.

## M00 · Inicio de sesión con Firebase

La app inicia sesión con **Firebase Authentication** y manda `Authorization: Bearer <ID token>` en cada petición.

- **`sesionFirebase`** (`src/modules/m00-usuarios-autenticacion/interfaces/middlewares/`) se ejecuta en todas las rutas:
  valida el token con las llaves públicas de Google (`src/shared/infrastructure/auth/firebaseTokenVerifier.js`, sin
  dependencias) y deja en `req.user.id` el `_id` del usuario en MongoDB. Los módulos no cambian: siguen leyendo `req.user.id`.
- **Primer inicio de sesión:** si nadie tiene ese `firebaseUid`, se liga al usuario que ya exista con ese correo o se crea uno
  nuevo. En producción, ligar por correo exige correo verificado o Google.
- **Token inválido o vencido:** 401 con el mensaje para la app. Sin token, fuera de producción siguen funcionando
  `x-user-id` y `DEV_USER_ID` (modos de prueba de la app).
- **Configuración:** `FIREBASE_PROJECT_ID` en el `.env` (el mismo Project ID de la app; no es secreto).

| Ruta                       | Qué hace                                                                      | RDF      |
| -------------------------- | ----------------------------------------------------------------------------- | -------- |
| `GET /usuarios/me/cuenta`  | Cuenta del juego; `404` si aún no llena "Crear cuenta".                       | —        |
| `POST /usuarios/me/cuenta` | Crear cuenta (nombre, apellido, edad, género, metas).                         | 001      |
| `PUT /usuarios/me/cuenta`  | Mi perfil: los mismos datos, foto y color de la mascota.                      | 024, 026 |
| `PUT /usuarios/me/mascota` | Elige su animal una sola vez y crea su perfil de jugador (`player_profiles`). | —        |

- **Esquema:**
  - `User` tiene ahora `firebaseUid` (con índice), `account` (tipo `GameAccount`) y `passwordHash` opcional.
  - `PlayerProfile` tiene ahora `species`.
  - Todos los campos son opcionales: no requieren migrar datos. Para crear el índice: `pnpm db:push`.

## Cómo extender la persistencia

1. Define el modelo y sus índices en `prisma/schema.prisma`. Usa `@@map` para mantener estable el nombre físico de la colección.
2. Valida y regenera el cliente. Crea el repositorio en `src/modules/<modulo>/infrastructure/repositories/`, reutilizando el cliente de `src/shared/infrastructure/database/prisma.js`.
3. Inyecta el repositorio en el servicio. Por ejemplo, `createCatalogItemRepository()` expone `list()`, `create({ name, group, icon, price, tags })` y `setActive(id, active)`. Otra implementación que ofrezca esas operaciones puede reemplazarla sin cambiar el servicio. Para cerrar el proceso, usa `disconnect()`; no desconectes después de cada petición.pnpm db:validate
4. Inyecta el repositorio en el servicio. Por ejemplo, `createCatalogItemRepository()` expone `list()`, `create({ name, group, icon, price, tags })` y `setActive(id, active)`. Otra implementación que ofrezca esas operaciones puede reemplazarla sin cambiar el servicio. Para cerrar el proceso, usa `disconnect()`; no desconectes después de cada petición.

## M06 · Estado de ánimo (`/api/v1/animo`)

- Guarda en `mood_logs` (un registro por usuario y día), `journal_entries` (diario) y en el perfil
  (`player_profiles`: recordatorio y +5 XP del primer registro del día, en una transacción).
- El día se calcula en `TIME_ZONE` (por defecto `America/Mexico_City`) y se guarda como `dayStart` en medianoche UTC.
- Usuario de prueba mientras no exista el M00: `pnpm db:usuario-prueba` imprime un `_id` para `x-user-id` o `DEV_USER_ID`.
- Pruebas sin Atlas: `tests/support/prismaFalso.js` imita el cliente de Prisma para probar `PrismaMoodRepository`.

## M08 · Botín, regalos entre amigos (`/api/v1/botin`)

| Ruta                                                                  | Qué hace                                                                       | RDF        |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------- |
| `GET /botin/amigos`                                                   | Amigos (amistades aceptadas) a quienes regalar o pedir.                        | —          |
| `GET /botin/cofre`                                                    | Mis objetos con rareza, cantidad (`-1` = ilimitado) y si se pueden regalar.    | 88         |
| `GET /botin/cofre/:amigoId`                                           | Los objetos regalables del cofre de un amigo, para pedirle uno.                | 83         |
| `POST /botin/regalos` `{ friendId, itemId, message? }`                | Regala: valida, pasa el objeto a su inventario y le avisa por push (201).      | 82, 89, 90 |
| `GET /botin/solicitudes`                                              | Bandeja (lo que me piden), mis solicitudes y mi cofre.                         | 84         |
| `POST /botin/solicitudes` `{ friendId, itemId, reason? }`             | Pide un objeto a un amigo (201).                                               | 83         |
| `POST /botin/solicitudes/:id` `{ accept }`                            | Aceptar entrega el objeto; rechazar solo la cierra.                            | 85         |
| `GET /botin/historial?tipo=enviado\|recibido&amigo=&desde=`           | Lo que regalé y lo que me regalaron, del más reciente al más antiguo.          | 86, 87     |

- **Qué se puede regalar (RDF089):** que esté en mi cofre, sin equipar, que el catálogo (M14) lo marque como
  regalable y que queden existencias. La rareza sale de las etiquetas del artículo (`comun`, `raro`, `epico`,
  `legendario`, `carta`); los de etiqueta `carta` son ilimitados.
- **Entrega (RDF090):** en una transacción se descuenta al que regala, se suma al que recibe (`source: GIFT`), se
  registran los movimientos `GIFT_OUT`/`GIFT_IN` y el envío (`gift_transfers`, `DELIVERED`). Después se avisa por
  FCM si están las variables `FCM_*`; si el aviso falla, el regalo ya quedó entregado.
- **Solo entre amigos:** amistades `ACCEPTED` (M07); con cualquier otra persona responde 403.
- **Esquema:** `gift_transfers.giftRequestId` ya no es `@unique`. En MongoDB un índice único en un campo opcional
  solo deja guardar un documento sin ese campo, así que solo cabía un regalo sin solicitud.

## M09 · Diario de aventura (`/api/v1/diario`)

| Ruta                                                                         | Qué hace                                                                 | RDF    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| `GET /diario/actividades?tipo=&origen=&estado=&desde=`                       | Hábitos, misiones y sesiones, de la más reciente a la más antigua.       | 91, 92 |
| `GET /diario/actividades/:id`                                                | La actividad con su recorrido (`timeline`) y sus notas.                  | 93     |
| `POST /diario/actividades/:id/notas` `{ text }`                              | Agrega una nota (201). Texto obligatorio, máx. 500 caracteres.           | 94     |
| `PUT` · `DELETE /diario/actividades/:id/notas/:notaId`                       | Edita la nota (queda `edited: true`) · la borra (204).                   | 95     |
| `GET /diario/graficas/cumplimiento?rango=semana\|mes\|anio`                  | Actividades cumplidas por día (7 o 30) o por mes del año, por tipo.      | 96     |
| `GET /diario/graficas/distribucion?rango=semana\|mes\|anio`                  | Total cumplido de cada tipo en el rango.                                 | 97     |

- **Solo lee M02 y M03:** el diario se arma al consultar con `habits`, `habit_check_ins`, `missions` y `focus_sessions`;
  lo único que escribe son sus notas (`activity_notes`).
- **Ids de actividad:** `mision-<id>`, `sesion-<id>` (sesiones sin misión, como el enfoque de un hábito) y
  `habito-<id>-<AAAA-MM-DD>` (el día del hábito, o el lunes de su semana si es semanal). Las notas se guardan con ese id.
- **Estado de un hábito:** `hecha` con check-in; `pendiente` el día (o la semana) en curso sin check-in; `fallida` los
  días anteriores sin check-in desde que empezó. Sin filtro `desde`, los fallidos se marcan solo en los últimos 30 días.
- **Sin doble conteo:** las sesiones de una misión no salen aparte; la misión ya las representa.
- **Zona horaria:** los hábitos siguen los días de M02 (medianoche UTC); las gráficas agrupan en `TIME_ZONE`.

## M12 · Retos y métricas de grupo (`/api/v1/retos`)

| Ruta                                                                    | Qué hace                                                                        | RDF          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------ |
| `GET /retos/amigos`                                                     | Amigos (amistades aceptadas) para invitar.                                      | —            |
| `GET /retos` · `POST /retos`                                            | Retos activos con la aportación de cada participante · crear reto.              | 117, 119–121 |
| `GET /retos/invitaciones` · `POST /retos/invitaciones/:id` `{ accept }` | Invitaciones pendientes · unirse (200) o rechazar (204).                        | 118          |
| `GET /retos/metricas?periodo=semana\|mes`                               | Tu cumplimiento por área frente al promedio de tus amigos (`null` = sin datos). | 122, 123     |
| `GET /retos/actividad?area=cultura\|fisico\|enfoque`                    | Ranking de puntos de la semana (desde el lunes), tú incluido.                   | 124, 125     |

- **Aportaciones (RDF119):** al consultar, el servidor suma cada actividad del área desde que el participante se unió
  hasta el fin del día límite: hábitos cumplidos, misiones, minutos de enfoque o XP. Cada actividad se guarda una sola
  vez en `challenge_contributions` (índice único), así que es idempotente.
- **Sin doble conteo:** M03 guarda la XP de una misión también en su sesión de enfoque, por eso XP y puntos se toman
  solo de hábitos y misiones; de las sesiones, solo los minutos.
- **Recompensa (RDF121):** al llegar a la meta el reto pasa a `COMPLETED` y cada participante recibe el artículo
  `CHALLENGE_REWARD_ITEM` (por defecto "Cofre raro") en su inventario. Es una sola vez, dentro de una transacción.
- **Zona horaria:** "hoy", la semana y la fecha límite se calculan en `TIME_ZONE` (`src/shared/utils/zonaHoraria.js`).
