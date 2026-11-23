// Pruebas unitarias del M06: casos de uso y reglas del dominio, sin HTTP.
// Ejecutar: pnpm test

const test = require('node:test');
const assert = require('node:assert/strict');

const { createMoodModule } = require('../../../src/modules/m06-vitalidad');
const { InMemoryMoodRepository } = require('../../support/InMemoryMoodRepository');
const { MoodLog } = require('../../../src/modules/m06-vitalidad/domain/entities/MoodLog');
const { ValidationError, NotFoundError } = require('../../../src/modules/m06-vitalidad/domain/errors');
const {
  calcularResumenAnimo,
  detectarPatronSemanal,
} = require('../../../src/modules/m06-vitalidad/application/services/calcularResumenAnimo');

// Reloj controlable: las pruebas no dependen de la fecha real
const crearReloj = (iso) => {
  let actual = new Date(iso);
  return { clock: () => new Date(actual), avanzarDias: (n) => actual.setDate(actual.getDate() + n) };
};

const nuevoModulo = (iso = '2026-11-13T21:00:00') => {
  const reloj = crearReloj(iso);
  const { services } = createMoodModule({ moodRepository: new InMemoryMoodRepository(), now: reloj.clock });
  return { services, reloj };
};

test('RDF068: el primer registro del día da +5 XP y el segundo no', async () => {
  const { services } = nuevoModulo();
  const primero = await services.registrarEstadoAnimo('u1', { mood: 4, energy: 6, factors: ['motivada'] });
  const segundo = await services.registrarEstadoAnimo('u1', { mood: 2, energy: 3 });
  assert.equal(primero.xpAwarded, 5);
  assert.equal(segundo.xpAwarded, 0);
  // El segundo actualiza el mismo registro del día
  assert.equal(segundo.log.id, primero.log.id);
  assert.equal((await services.consultarRegistroHoy('u1')).mood, 2);
});

test('RDF068: al día siguiente vuelve a dar XP', async () => {
  const { services, reloj } = nuevoModulo();
  await services.registrarEstadoAnimo('u1', { mood: 3, energy: 5 });
  reloj.avanzarDias(1);
  const otroDia = await services.registrarEstadoAnimo('u1', { mood: 3, energy: 5 });
  assert.equal(otroDia.xpAwarded, 5);
});

test('Dominio: rechaza ánimo, energía o factores fuera de rango', () => {
  const base = { id: 'x', userId: 'u1', date: '2026-11-13', createdAt: 'x' };
  assert.throws(() => new MoodLog({ ...base, mood: 6, energy: 5 }), ValidationError);
  assert.throws(() => new MoodLog({ ...base, mood: 3, energy: 11 }), ValidationError);
  assert.throws(() => new MoodLog({ ...base, mood: 3, energy: 5, factors: ['feliz'] }), ValidationError);
});

test('Cada usuario solo ve sus propios registros', async () => {
  const { services } = nuevoModulo();
  await services.registrarEstadoAnimo('u1', { mood: 5, energy: 9 });
  assert.equal(await services.consultarRegistroHoy('u2'), null);
});

test('RDF070: recordatorio por defecto 20:00 y valida el formato de hora', async () => {
  const { services } = nuevoModulo();
  assert.deepEqual(await services.consultarRecordatorio('u1'), { enabled: true, time: '20:00' });
  await services.programarRecordatorioAnimo('u1', { enabled: false, time: '07:30' });
  assert.deepEqual(await services.consultarRecordatorio('u1'), { enabled: false, time: '07:30' });
  await assert.rejects(services.programarRecordatorioAnimo('u1', { enabled: true, time: '25:00' }), ValidationError);
});

test('RDF072: la tendencia semanal trae 7 días y null donde no hubo registro', async () => {
  const { services, reloj } = nuevoModulo('2026-11-07T21:00:00');
  await services.registrarEstadoAnimo('u1', { mood: 2, energy: 2 }); // 7 nov
  reloj.avanzarDias(6);
  await services.registrarEstadoAnimo('u1', { mood: 5, energy: 9 }); // 13 nov
  const t = await services.consultarTendenciaAnimo('u1', 'semana');
  assert.equal(t.points.length, 7);
  assert.equal(t.from, '2026-11-07');
  assert.equal(t.to, '2026-11-13');
  assert.equal(t.points[0].mood, 2);
  assert.equal(t.points[3].mood, null);
  assert.equal((await services.consultarTendenciaAnimo('u1', 'mes')).points.length, 30);
  await assert.rejects(services.consultarTendenciaAnimo('u1', 'anio'), ValidationError);
});

test('RDF073: promedio, mejor y peor día', () => {
  const r = calcularResumenAnimo([
    { date: 'a', mood: 4, energy: 6 },
    { date: 'b', mood: null, energy: null },
    { date: 'c', mood: 2, energy: 3 },
    { date: 'd', mood: 4, energy: 8 },
  ]);
  assert.deepEqual(r, { average: 3.3, bestDate: 'd', worstDate: 'c' });
  assert.deepEqual(calcularResumenAnimo([]), { average: null, bestDate: null, worstDate: null });
});

test('RDF074: detecta cuando ánimo y energía se mueven juntos', () => {
  const juntos = [1, 2, 3, 4, 5].map((m, i) => ({ date: String(i), mood: m, energy: m * 2 }));
  assert.match(detectarPatronSemanal(juntos, 'semana'), /se movieron juntos/);
  assert.match(detectarPatronSemanal([], 'mes'), /Aún no hay registros en el mes/);
});

test('RDF075-078: diario ligado al ánimo del día, privado por defecto, editar y borrar', async () => {
  const { services } = nuevoModulo();
  await services.registrarEstadoAnimo('u1', { mood: 4, energy: 7 });
  const entrada = await services.agregarEntradaDiario('u1', { text: '  Buen día  ' });
  assert.equal(entrada.text, 'Buen día');
  assert.equal(entrada.mood, 4);
  assert.equal(entrada.shared, false);

  const compartida = await services.actualizarEntradaDiario('u1', entrada.id, { shared: true });
  assert.equal(compartida.shared, true);
  assert.equal(compartida.text, 'Buen día');

  await assert.rejects(services.agregarEntradaDiario('u1', { text: '   ' }), ValidationError);
  // Otro usuario no puede editar ni borrar la entrada
  await assert.rejects(services.actualizarEntradaDiario('u2', entrada.id, { text: 'x' }), NotFoundError);
  await assert.rejects(services.eliminarEntradaDiario('u2', entrada.id), NotFoundError);

  await services.eliminarEntradaDiario('u1', entrada.id);
  assert.equal((await services.consultarEntradasDiario('u1')).length, 0);
});
