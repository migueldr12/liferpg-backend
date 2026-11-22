# Life-RPG · Backend

API REST en Node.js con Express. Arquitectura **por módulos** con **arquitectura limpia**.
La persistencia usa Prisma 6 con MongoDB Atlas. El esquema ya cubre los modelos de M00–M15; el frontend todavía usa datos de demostración. Consulta [docs/database.md](docs/database.md) para el mapa de colecciones, las reglas de integridad y la política de fechas UTC.

## Capas de cada módulo

Las dependencias apuntan hacia adentro: `interfaces → application → domain ← infrastructure`.

| Carpeta | Contenido |
|---|---|
| `domain/entities` | Entidades de negocio puras, sin Express ni BD |
| `domain/repositories` | Contratos (interfaces) de los repositorios |
| `application/services` | Casos de uso: un servicio por RDF del Excel |
| `application/dtos` | Datos de entrada y salida de los servicios |
| `infrastructure/repositories` | Implementación concreta de los contratos con Prisma |
| `infrastructure/mappers` | Conversión documento de BD ↔ entidad |
| `interfaces/controllers` | Traducen `req`/`res` a llamadas a servicios |
| `interfaces/routes` | Router de Express del módulo |
| `interfaces/validators` | Validación de body, params y query |

## Carpetas compartidas (`src/`)

- `config/`: variables de entorno y configuración del servidor (nube o LAN)
- `routes/`: router raíz que monta cada módulo en `/api/v1/<modulo>`
- `jobs/`: tareas automáticas del servidor (cierre diario, avisos de inactividad)
- `shared/errors`, `shared/middlewares` (JWT, roles, manejo de errores, log REST), `shared/utils`, `shared/domain`
- `shared/infrastructure/database`, `push` (Firebase Cloud Messaging), `mail`

## Módulos

| Carpeta | Módulo | Responsable | Sprint |
|---|---|---|---|
| `m00-usuarios-autenticacion` | Usuarios, autenticación y dispositivo | Equipo | 1 |
| `m01-tamagotchi-perfil` | Tamagotchi y perfil de usuario | Dev 1 | 1 |
| `m02-habitos` | Hábitos diarios (quests) | Dev 1 | 2 |
| `m03-misiones-enfoque` | Misiones únicas y enfoque | Dev 1 | 3 |
| `m04-tienda` | Tienda de la mascota | Dev 2 | 1 |
| `m05-logros-progresion` | Logros y progresión | Dev 2 | 2 |
| `m06-vitalidad` | Vitalidad y estado de la mascota | Dev 2 | 3 |
| `m07-visualizador-usuarios` | Visualizador de usuarios | Dev 3 | 1 |
| `m08-botin` | Botín (regalos entre amigos) | Dev 3 | 2 |
| `m09-diario-aventura` | Diario de aventura | Dev 3 | 3 |
| `m10-notificaciones` | Notificaciones de acompañamiento | Dev 4 | 1 |
| `m11-resumen-progreso` | Resumen de progreso y pendientes | Dev 4 | 2 |
| `m12-retos-grupo` | Retos y métricas de grupo | Dev 4 | 3 |
| `m13-sincronizacion-red` | Sincronización local y red | Dev 5 | 1 |
| `m14-economia-global` | Balanceo de economía global | Dev 5 | 2 |
| `m15-gestion-bd` | Gestión de base de datos | Dev 5 | 3 |

## Configuración

```bash
npm install -g pnpm
cp .env.example .env
pnpm install
pnpm db:validate
pnpm db:generate
pnpm db:check
```

Antes de validar, configura `DATABASE_URL` en el entorno o en `.env`. Para desarrollo también se admite `MONGODB_URI` en `atlas-credentials.env`, dentro de este backend. Si la URI no especifica una base, se usa `liferpg`. Ambos archivos locales están excluidos de Git. Atlas requiere acceso desde la IP del servidor.

`db:check` verifica conexión, colecciones e índices esperados sin modificar datos. Para inicializar una base o aplicar cambios de colecciones e índices, revisa el destino y ejecuta `pnpm db:push`. MongoDB no usa Prisma Migrate: si cambias el formato de documentos existentes, planifica su actualización por separado.

Todas las fechas se almacenan en UTC. El cliente calcula el día local; los campos `dayStart` representan la medianoche UTC del registro.

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

## Cómo extender la persistencia

1. Define el modelo y sus índices en `prisma/schema.prisma`. Usa `@@map` para mantener estable el nombre físico de la colección.
2. Valida y regenera el cliente. Crea el repositorio en `src/modules/<modulo>/infrastructure/repositories/`, reutilizando el cliente de `src/shared/infrastructure/database/prisma.js`.
3. Inyecta el repositorio en el servicio. Por ejemplo, `createCatalogItemRepository()` expone `list()`, `create({ name, group, icon, price, tags })` y `setActive(id, active)`. Otra implementación que ofrezca esas operaciones puede reemplazarla sin cambiar el servicio. Para cerrar el proceso, usa `disconnect()`; no desconectes después de cada petición.
