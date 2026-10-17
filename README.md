# Life-RPG · Backend

API REST en Node.js con Express. Arquitectura **por módulos** con **arquitectura limpia**.
Por ahora solo hay estructura (carpetas con `.gitkeep`), sin lógica.

## Capas de cada módulo

Las dependencias apuntan hacia adentro: `interfaces → application → domain ← infrastructure`.

| Carpeta | Contenido |
|---|---|
| `domain/entities` | Entidades de negocio puras, sin Express ni BD |
| `domain/repositories` | Contratos (interfaces) de los repositorios |
| `application/services` | Casos de uso: un servicio por RDF del Excel |
| `application/dtos` | Datos de entrada y salida de los servicios |
| `infrastructure/repositories` | Implementación concreta de los contratos (SQL) |
| `infrastructure/mappers` | Conversión fila de BD ↔ entidad |
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
cp .env.example .env
npm install
```
