const { forbidden, validationError } = require('../../../../shared/errors/AppError');
const { addDays, dateKeyOf, dayStartOfKey, startOfLocalDay } = require('../../../../shared/utils/localDay');
const { listPendingMissions } = require('../../domain/entities/dayProgress');
const { calculateStreaks, consistencyState } = require('../../domain/entities/streak');
const { toHabitoPendiente, toMisionPendiente, toDiaCumplimiento } = require('../dtos/resumenProgresoDto');
const { buildDays } = require('./dayBuilder');

const STREAK_WINDOW_DAYS = 365;
const DEFAULTS = {
  historial: { defaultDays: 7, maxDays: 31 },
  cumplimiento: { defaultDays: 7, maxDays: 366 },
  bajaActividad: { defaultDays: 30, maxDays: 366 },
};

// Casos de uso de M11 (un método por RDF del Excel).
// `viewerId` es quien hace la petición; con `usuarioId` consulta a un amigo (perfil lite).
function createResumenProgresoService({ repo, now = () => new Date(), defaultUtcOffset = 360 }) {
  const offsetOf = (input) => input.utcOffset ?? defaultUtcOffset;

  // El dueño ve lo suyo; un visualizador solo ve a amigos con amistad aceptada.
  // Usuario inexistente y "no es tu amigo" responden igual, para no revelar qué cuentas existen.
  async function resolveTarget(viewerId, usuarioId) {
    if (!usuarioId || usuarioId === viewerId) return viewerId;
    const target = await repo.findUser(usuarioId);
    const available = target && target.status === 'ACTIVE' && !target.deletedAt;
    if (!available || !(await repo.areFriends(viewerId, usuarioId))) {
      throw forbidden('Solo puedes consultar el progreso de tus amigos.');
    }
    return usuarioId;
  }

  function resolveRange(input, utcOffset, { defaultDays, maxDays }) {
    const today = startOfLocalDay(now(), utcOffset);
    const to = input.hasta ? dayStartOfKey(input.hasta, utcOffset) : today;
    const from = input.desde ? dayStartOfKey(input.desde, utcOffset) : addDays(to, -(defaultDays - 1));
    if (to > today) throw validationError({ hasta: 'La fecha final no puede ser futura.' });
    if (from > to) throw validationError({ desde: 'La fecha inicial no puede ser posterior a la final.' });
    const span = Math.round((to - from) / 86_400_000) + 1;
    if (span > maxDays) throw validationError({ desde: `El rango no puede superar ${maxDays} días.` });
    return { from, to };
  }

  async function loadStreak(userId, utcOffset) {
    const today = startOfLocalDay(now(), utcOffset);
    const [days, profile] = await Promise.all([
      buildDays({
        repo, userId, utcOffset, now: now(), to: today, clampToFirstHabit: true,
        from: addDays(today, -(STREAK_WINDOW_DAYS - 1)),
      }),
      repo.findProfile(userId),
    ]);
    const { current, best } = calculateStreaks(days);
    const lastCheckIn = [...days].reverse().find((d) => d.checkIns > 0);
    return {
      current,
      // El perfil conserva la mejor racha histórica aunque quede fuera de la ventana de 365 días.
      best: Math.max(best, profile?.bestStreak ?? 0),
      todayCheckIns: days.length ? days[days.length - 1].checkIns : 0,
      lastCheckIn: lastCheckIn?.date ?? null,
    };
  }

  return {
    // RDF111 + RDF112 (un día concreto): hábitos y misiones sin completar al cierre del día.
    async consultarMisionesPendientes(viewerId, input = {}) {
      const utcOffset = offsetOf(input);
      const userId = await resolveTarget(viewerId, input.usuarioId);
      const today = startOfLocalDay(now(), utcOffset);
      const dayStart = input.fecha ? dayStartOfKey(input.fecha, utcOffset) : today;
      if (dayStart > today) throw validationError({ fecha: 'La fecha no puede ser futura.' });

      const [days, missions] = await Promise.all([
        buildDays({ repo, userId, from: dayStart, to: dayStart, utcOffset, now: now(), persist: true }),
        repo.listMissions(userId, addDays(dayStart, 1)),
      ]);
      const day = days[0];
      const misiones = listPendingMissions(missions, dayStart).map(toMisionPendiente);
      const habitos = day.pendingHabits.map(toHabitoPendiente);
      return {
        fecha: day.date,
        cerrado: day.closed,
        habitosDebidos: day.habitsDue,
        habitosCumplidos: day.habitsCompleted,
        totalPendientes: habitos.length + misiones.length,
        habitos,
        misiones,
      };
    },

    // RDF112 (varios días): pendientes por día y cuáles se repiten sin cumplir.
    async consultarPendientesPorFecha(viewerId, input = {}) {
      const utcOffset = offsetOf(input);
      const userId = await resolveTarget(viewerId, input.usuarioId);
      const { from, to } = resolveRange(input, utcOffset, DEFAULTS.historial);

      const [days, missions] = await Promise.all([
        buildDays({ repo, userId, from, to, utcOffset, now: now(), persist: true }),
        repo.listMissions(userId, addDays(to, 1)),
      ]);

      const repeated = new Map();
      const count = (item) => {
        const key = `${item.tipo}:${item.id}`;
        const entry = repeated.get(key) ?? { tipo: item.tipo, id: item.id, nombre: item.nombre, dias: 0 };
        entry.dias += 1;
        repeated.set(key, entry);
      };

      const dias = [];
      for (const day of days) {
        const habitos = day.pendingHabits.map(toHabitoPendiente);
        const misiones = listPendingMissions(missions, day.dayStart).map(toMisionPendiente);
        [...habitos, ...misiones].forEach(count);
        if (habitos.length || misiones.length) dias.push({ fecha: day.date, cerrado: day.closed, habitos, misiones });
      }
      return {
        desde: dateKeyOf(from, utcOffset),
        hasta: dateKeyOf(to, utcOffset),
        dias,
        repetidos: [...repeated.values()].filter((r) => r.dias > 1).sort((a, b) => b.dias - a.dias),
      };
    },

    // RDF113: porcentaje de hábitos cumplidos por día (y guarda el cierre de los días ya terminados).
    async calcularTasaCumplimientoDiaria(viewerId, input = {}) {
      const utcOffset = offsetOf(input);
      const userId = await resolveTarget(viewerId, input.usuarioId);
      const { from, to } = resolveRange(input, utcOffset, DEFAULTS.cumplimiento);
      const days = await buildDays({ repo, userId, from, to, utcOffset, now: now(), persist: true });

      const rated = days.filter((d) => d.closed && d.completionRate !== null);
      const promedio = rated.length
        ? Math.round((rated.reduce((sum, d) => sum + d.completionRate, 0) / rated.length) * 100) / 100
        : null;
      return {
        desde: dateKeyOf(from, utcOffset),
        hasta: dateKeyOf(to, utcOffset),
        promedio, // solo días cerrados con hábitos debidos
        dias: days.map(toDiaCumplimiento),
      };
    },

    // RDF114: días cerrados cuya tasa quedó por debajo del umbral (por defecto 50 %).
    async consultarDiasBajaActividad(viewerId, input = {}) {
      const utcOffset = offsetOf(input);
      const userId = await resolveTarget(viewerId, input.usuarioId);
      const umbral = input.umbral ?? 50;
      const { from, to } = resolveRange(input, utcOffset, DEFAULTS.bajaActividad);
      const days = await buildDays({ repo, userId, from, to, utcOffset, now: now(), persist: true });

      const low = days.filter((d) => d.closed && d.completionRate !== null && d.completionRate < umbral);
      return {
        umbral,
        desde: dateKeyOf(from, utcOffset),
        hasta: dateKeyOf(to, utcOffset),
        total: low.length,
        dias: low.map(toDiaCumplimiento),
      };
    },

    // RDF115: racha actual y mejor racha.
    async consultarRachaActual(viewerId, input = {}) {
      const userId = await resolveTarget(viewerId, input.usuarioId);
      const s = await loadStreak(userId, offsetOf(input));
      return { rachaActual: s.current, mejorRacha: s.best, ultimoCheckIn: s.lastCheckIn };
    },

    // RDF116: ACTIVA (check-in hoy), EN_RIESGO (racha viva sin check-in hoy), ROTA o SIN_RACHA.
    async mostrarEstadoConsistencia(viewerId, input = {}) {
      const userId = await resolveTarget(viewerId, input.usuarioId);
      const s = await loadStreak(userId, offsetOf(input));
      const { state, message } = consistencyState(s);
      return {
        estado: state,
        mensaje: message,
        rachaActual: s.current,
        mejorRacha: s.best,
        checkInsHoy: s.todayCheckIns,
        ultimoCheckIn: s.lastCheckIn,
      };
    },
  };
}

module.exports = { createResumenProgresoService };
