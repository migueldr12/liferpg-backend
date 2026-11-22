const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  rewardFor, locksDevice, validationOnFinish, hasReachedPlannedTime, VALIDATION,
} = require('../../src/modules/m03-misiones-enfoque/domain/entities/Mission');
const { toMission, toDb } = require('../../src/modules/m03-misiones-enfoque/infrastructure/mappers/missionMapper');

describe('M03 · reglas del dominio', () => {
  test('la recompensa depende de la duración (RDF038)', () => {
    assert.deepEqual(rewardFor('enfoque', 50), { xp: 60, points: 50 });
    assert.deepEqual(rewardFor('fisico', 40), { xp: 48, points: 40 });
    assert.throws(() => rewardFor('magia', 10));
  });

  test('solo Enfoque bloquea el celular (RDF039)', () => {
    assert.equal(locksDevice('enfoque'), true);
    assert.equal(locksDevice('fisico'), false);
    assert.equal(locksDevice('cultura'), false);
  });

  test('cómo se valida al terminar (RDF041 / RDF043)', () => {
    const watch = { steps: 6840, distanceKm: 5.2, activeMinutes: 40 };
    assert.equal(validationOnFinish('enfoque'), VALIDATION.LOCK);
    assert.equal(validationOnFinish('fisico', watch), VALIDATION.WEARABLE);
    assert.equal(validationOnFinish('fisico'), VALIDATION.MANUAL);
    assert.equal(validationOnFinish('fisico', { steps: 0, distanceKm: 0, activeMinutes: 0 }), VALIDATION.MANUAL);
    assert.equal(validationOnFinish('cultura', watch), VALIDATION.MANUAL);
  });

  test('una sesión termina al cumplir el tiempo, con un minuto de tolerancia', () => {
    const session = { startedAt: new Date('2026-11-22T10:00:00Z'), plannedMinutes: 50 };
    assert.equal(hasReachedPlannedTime(session, new Date('2026-11-22T10:30:00Z')), false);
    assert.equal(hasReachedPlannedTime(session, new Date('2026-11-22T10:49:30Z')), true);
    assert.equal(hasReachedPlannedTime(session, new Date('2026-11-22T10:51:00Z')), true);
  });
});

describe('M03 · mapper de MongoDB', () => {
  test('traduce enums de la base al vocabulario de la app', () => {
    const mission = toMission({
      id: 'm1', userId: 'u1', title: 'Correr 5 km', area: 'PHYSICAL', estimatedMinutes: 40, status: 'FAILED',
      xpAwarded: 0, pointsAwarded: 0, validationMethod: null, createdAt: new Date(), failedAt: new Date(),
      focusSessions: [{ status: 'ABANDONED', abandonReason: 'salio_app' }],
    });
    assert.equal(mission.type, 'fisico');
    assert.equal(mission.status, 'fallida');
    assert.equal(mission.failReason, 'salio_app');
    assert.equal(toDb.area.enfoque, 'FOCUS');
    assert.equal(toDb.validation.smartwatch, 'WEARABLE');
  });
});
