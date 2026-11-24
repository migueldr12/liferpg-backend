// Contrato que debe cumplir el repositorio de M11 (la implementación con Prisma está en
// infrastructure/repositories). Todas las fechas son Date (instantes UTC) y los ids, strings.
//
// findUser(id)                                -> { id, status, deletedAt } | null
// findProfile(userId)                         -> { currentStreak, bestStreak } | null
// areFriends(userIdA, userIdB)                -> boolean  (amistad ACCEPTED en cualquier sentido)
// listHabits(userId)                          -> Habit[]   { id, name, area, difficulty, frequency,
//                                                 penaltyType, penaltyValue, active, startsOn, archivedAt, updatedAt }
// listCheckIns(userId, from, to)              -> CheckIn[] { id, habitId, periodStart, periodEnd, revertedAt }
//                                                 con periodStart en [from, to)
// listMissions(userId, createdBefore)         -> Mission[] { id, title, area, estimatedMinutes, status,
//                                                 createdAt, completedAt, failedAt }
// listClosures(userId, from, to)              -> Closure[] { dayStart, habitsDue, habitsCompleted,
//                                                 completionRate, pendingCount, penaltiesApplied }
// saveClosure(userId, day)                    -> crea el cierre si no existe (nunca pisa uno existente)
//
// Los servicios solo dependen de este contrato, no de Prisma.
module.exports = {};
