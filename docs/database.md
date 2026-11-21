# ODM de Life-RPG

Prisma 6 sobre MongoDB Atlas. El esquema vive en `prisma/schema.prisma` y el cliente se
comparte desde `src/shared/infrastructure/database/prisma.js`.

## Fechas

- Todos los campos `DateTime` se guardan como instantes UTC. No se guardan cadenas de fecha
  ni horas locales.
- `dayStart` es la medianoche UTC del día al que pertenece el registro. El cliente calcula
  el día local a partir del instante UTC y normaliza la presentación.
- `createdAt` usa `now()` del servidor y `updatedAt` se actualiza en cada escritura.
- Los valores ya aplicados se copian en el histórico: una recompensa, penalización o versión
  de economía no se recalcula cuando cambian las reglas.

## Colecciones

Los nombres físicos están fijados con `@@map`; el nombre del modelo puede cambiar sin
renombrar la colección.

| Módulo | Modelos → colección | Propósito |
|---|---|---|
| M00 | `User` → `users`, `Device` → `devices`, `Session` → `sessions`, `PasswordReset` → `password_resets` | Cuenta, rol, baja lógica, dispositivos FCM y sesiones revocables. |
| M01 | `PlayerProfile` → `player_profiles`, `Outfit` → `outfits` | Nivel, XP, HP, saldos, preferencias y conjuntos guardados. |
| M02 | `Habit` → `habits`, `HabitCheckIn` → `habit_check_ins` | Programación de hábitos y cumplimiento por periodo. |
| M03 | `Mission` → `missions`, `FocusSession` → `focus_sessions` | Misiones únicas y sesiones de enfoque, incluidas las fallidas. |
| M04 | `InventoryEntry` → `inventory_entries`, `InventoryMovement` → `inventory_movements` | Existencias, equipamiento y movimientos de compra, regalo o canje. |
| M05 | `Achievement` → `achievements`, `UserAchievement` → `user_achievements` | Definición de logros, progreso y reclamación única. |
| M06 | `MoodLog` → `mood_logs`, `JournalEntry` → `journal_entries` | Ánimo, energía, factores y diario privado o compartido. |
| M07 | `Friendship` → `friendships`, `FriendCode` → `friend_codes` | Amistad única por pareja y códigos con usos y vencimiento. |
| M08 | `GiftRequest` → `gift_requests`, `GiftTransfer` → `gift_transfers` | Solicitudes y entregas de botín. |
| M09 | `ActivityNote` → `activity_notes` | Notas de seguimiento ligadas a una actividad de M02 o M03. |
| M10 | `InactivityAlert` → `inactivity_alerts`, `StickerMessage` → `sticker_messages` | Avisos de inactividad y stickers enviados o vistos. |
| M11 | `DailyClosure` → `daily_closures` | Foto del cierre diario: hábitos debidos, cumplidos y pendientes. |
| M12 | `GroupChallenge` → `group_challenges`, `ChallengeParticipant` → `challenge_participants`, `ChallengeContribution` → `challenge_contributions` | Meta colectiva, invitaciones y aportaciones sin duplicados. |
| M13 | `RequestLog` → `request_logs` | Peticiones REST sin tokens, cuerpos ni datos sensibles. |
| M14 | `CatalogCategory` → `catalog_categories`, `CatalogItem` → `catalog_items`, `EconomyVersion` → `economy_versions`, `PushCampaign` → `push_campaigns`, `IconAsset` → `icon_assets` | Catálogo, economía versionada, campañas push e íconos reemplazables. |
| M15 | `BackupRecord` → `backup_records`, `PurgeRun` → `purge_runs` | Historial de respaldos y purgas auditadas. |

`catalog_items` conserva `group`, `icon` y `tags` para no romper el contrato actual de la
PWA. Los campos nuevos (`categoryId`, `pointType`, `slot`, `giftable`, `custom`, `ownerId`)
son opcionales para permitir una migración gradual.

## Reglas de integridad

MongoDB no aplica claves foráneas. La aplicación debe respetar estas restricciones, que sí
están indexadas:

| Colección | Restricción |
|---|---|
| `users` | `email` único. |
| `player_profiles` | Un perfil por `userId`. |
| `habit_check_ins` | Un registro por `habitId` y `periodStart`; al deshacer se marca `revertedAt` y se reutiliza el registro. |
| `mood_logs` | Un registro por `userId` y `dayStart`. |
| `daily_closures` | Un cierre por `userId` y `dayStart`. |
| `friendships` | `pairKey` único para impedir parejas duplicadas. |
| `friend_codes` | `code` único. |
| `inventory_entries` | Un registro por `userId` y `catalogItemId`; la cantidad vive en `quantity`. |
| `user_achievements` | Un registro por `userId` y `achievementId`. |
| `challenge_participants` | Un registro por `challengeId` y `userId`. |
| `challenge_contributions` | Una aportación por `challengeId`, `activityType` y `activityId`. |
| `gift_transfers` | `giftRequestId` único cuando la entrega responde a una solicitud. |
| `journal_entries` | `moodLogId` único cuando la entrada acompaña un registro de ánimo. |
| `catalog_categories` | `name` y `type` únicos. |
| `economy_versions` | `version` única. |

Las operaciones que afectan varias colecciones deben usar `$transaction` de Prisma o un
diseño idempotente. Casos críticos: compra y descuento de saldo, entrega de regalo,
reclamación de logro y aportación a un reto.

## Cambiar el esquema

1. Edita el modelo en `prisma/schema.prisma` y conserva su `@@map`.
2. Ejecuta `pnpm db:validate`, `pnpm db:generate` y `pnpm db:check`.
3. Revisa el destino y aplica colecciones o índices con `pnpm db:push`.
4. Si cambia el formato de documentos existentes, escribe una migración de datos explícita:
   Prisma Migrate no aplica a MongoDB.
5. Los repositorios de cada módulo reciben el cliente o una implementación equivalente; los
   servicios no importan Prisma directamente.
