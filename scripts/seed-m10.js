// Datos de prueba para M10 (Postman). Usa ids fijos para que la colección de Postman
// funcione sin copiar nada. Es repetible: puede ejecutarse varias veces.
//
//   pnpm seed:m10                   crea/actualiza los datos de prueba
//   node scripts/seed-m10.js --clean   además borra los stickers y avisos de M10 de estos usuarios
//
// Escribe en la base configurada en DATABASE_URL: úsalo solo en desarrollo.
const { getPrisma, disconnect } = require('../src/shared/infrastructure/database/prisma');
const { env } = require('../src/config/env');
const { databaseUrl } = require('../src/config/database');

const oid = (n) => `65000000000000000000${String(n).padStart(4, '0')}`;
const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const daysAgo = (n) => new Date(now.getTime() - n * DAY);
const midnightUtc = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const USERS = {
  ana: { id: oid(1), email: 'ana@liferpg.test', displayName: 'Ana', role: 'PLAYER', alias: 'AnaQuest', mascot: 'Pixel' },
  beto: { id: oid(2), email: 'beto@liferpg.test', displayName: 'Beto', role: 'PLAYER', alias: 'BetoRunner', mascot: 'Mochi' },
  carla: { id: oid(3), email: 'carla@liferpg.test', displayName: 'Carla', role: 'PLAYER', alias: 'CarlaFocus', mascot: 'Luna' },
  admin: { id: oid(4), email: 'admin@liferpg.test', displayName: 'Admin', role: 'ADMIN', alias: 'Admin', mascot: 'Bolt' },
  dani: { id: oid(5), email: 'dani@liferpg.test', displayName: 'Dani', role: 'PLAYER', alias: 'DaniSolo', mascot: 'Nube' },
};
const userIds = Object.values(USERS).map((u) => u.id);

const CATEGORIES = [
  { id: oid(401), name: 'Ánimo' },
  { id: oid(402), name: 'Celebración' },
  { id: oid(403), name: 'Cariño' },
];
const STICKERS = [
  { id: oid(501), categoryId: oid(401), name: 'Tú puedes', icon: '💪', tags: ['animo', 'fuerza'] },
  { id: oid(502), categoryId: oid(401), name: 'Sigue adelante', icon: '🚀', tags: ['animo'] },
  { id: oid(503), categoryId: oid(402), name: 'Felicidades', icon: '🎉', tags: ['logro'] },
  { id: oid(504), categoryId: oid(402), name: 'Gran trabajo', icon: '🏆', tags: ['logro'] },
  { id: oid(505), categoryId: oid(403), name: 'Un abrazo', icon: '🤗', tags: ['apoyo'] },
  { id: oid(506), categoryId: oid(403), name: 'Aquí estoy', icon: '💛', tags: ['apoyo'] },
];
// [id, quién pidió, quién aceptó]
const FRIENDSHIPS = [
  [oid(101), USERS.ana.id, USERS.beto.id],
  [oid(102), USERS.ana.id, USERS.carla.id],
  [oid(103), USERS.beto.id, USERS.carla.id],
];

const upsert = (model, id, data) => model.upsert({ where: { id }, create: { id, ...data }, update: data });

async function main() {
  if (env.nodeEnv === 'production') throw new Error('Los datos de prueba no se pueden cargar en producción.');
  if (new URL(databaseUrl()).pathname !== '/liferpg_test') throw new Error('El seed M10 solo puede ejecutarse en liferpg_test.');
  const db = getPrisma();

  if (process.argv.includes('--clean')) {
    const a = await db.stickerMessage.deleteMany({ where: { OR: [{ senderId: { in: userIds } }, { recipientId: { in: userIds } }] } });
    const b = await db.inactivityAlert.deleteMany({ where: { userId: { in: userIds } } });
    console.log(`Limpieza: ${a.count} stickers y ${b.count} avisos borrados.`);
  }

  // Usuarios (cuentas de 30 días para que la detección de inactividad las evalúe)
  for (const [i, u] of Object.values(USERS).entries()) {
    await upsert(db.user, u.id, {
      email: u.email, passwordHash: 'seed-no-es-un-hash-real', displayName: u.displayName,
      role: u.role, status: 'ACTIVE', deletedAt: null, createdAt: daysAgo(30),
    });
    await upsert(db.playerProfile, oid(601 + i), { userId: u.id, alias: u.alias, mascotName: u.mascot, mascotColor: '#7C5CFF' });
    await db.device.upsert({
      where: { fcmToken: `seed-token-${u.alias.toLowerCase()}` },
      create: { userId: u.id, fcmToken: `seed-token-${u.alias.toLowerCase()}`, platform: 'android' },
      update: { userId: u.id, active: true },
    });
  }

  // Amistades aceptadas (pairKey = ids ordenados, unidos por ":")
  for (const [id, a, b] of FRIENDSHIPS) {
    await upsert(db.friendship, id, {
      requesterId: a, addresseeId: b, pairKey: [a, b].sort().join(':'), status: 'ACCEPTED', acceptedAt: daysAgo(20),
    });
  }

  // Catálogo de stickers
  for (const c of CATEGORIES) await upsert(db.catalogCategory, c.id, { name: c.name, type: 'STICKER', active: true });
  for (const s of STICKERS) {
    await upsert(db.catalogItem, s.id, {
      categoryId: s.categoryId, name: s.name, group: 'stickers', icon: s.icon, price: 0, tags: s.tags, active: true,
    });
  }

  // Actividad: Ana activa, Beto con cumplimiento bajo, Carla sin actividad hace 10 días, Dani sin nada.
  const habits = [
    { id: oid(201), userId: USERS.ana.id, name: 'Leer 20 minutos' },
    { id: oid(202), userId: USERS.beto.id, name: 'Salir a correr' },
    { id: oid(203), userId: USERS.carla.id, name: 'Estudiar inglés' },
  ];
  for (const h of habits) await upsert(db.habit, h.id, { userId: h.userId, name: h.name, area: 'CULTURE', difficulty: 'EASY' });

  const checkIns = [
    { id: oid(301), habitId: oid(201), userId: USERS.ana.id, daysAgo: 0 },
    { id: oid(302), habitId: oid(202), userId: USERS.beto.id, daysAgo: 1 },
    { id: oid(303), habitId: oid(203), userId: USERS.carla.id, daysAgo: 10 },
  ];
  for (const c of checkIns) {
    const start = midnightUtc(daysAgo(c.daysAgo));
    await upsert(db.habitCheckIn, c.id, {
      userId: c.userId, habitId: c.habitId, periodStart: start, periodEnd: new Date(start.getTime() + DAY - 1),
      completedAt: daysAgo(c.daysAgo), revertedAt: null,
    });
  }

  // Cierres diarios (M11): Ana 90 %, Beto 10 %
  const closures = [
    [oid(701), USERS.ana.id, 1, 0.9], [oid(702), USERS.ana.id, 2, 0.9],
    [oid(703), USERS.beto.id, 1, 0.1], [oid(704), USERS.beto.id, 2, 0.1],
  ];
  for (const [id, userId, ago, completionRate] of closures) {
    const dayStart = midnightUtc(daysAgo(ago));
    await upsert(db.dailyClosure, id, {
      userId, dayStart, dayEnd: new Date(dayStart.getTime() + DAY - 1),
      habitsDue: 10, habitsCompleted: Math.round(completionRate * 10), completionRate, pendingCount: 10 - Math.round(completionRate * 10),
    });
  }

  console.log('Datos de M10 listos. Ids para Postman:');
  for (const [key, u] of Object.entries(USERS)) console.log(`  ${key.padEnd(6)} ${u.id}  (${u.role})`);
}

main()
  .catch((err) => {
    console.error('No se pudo sembrar M10:', err.message);
    process.exitCode = 1;
  })
  .finally(disconnect);
