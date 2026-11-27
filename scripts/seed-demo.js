// Demostración reproducible, exclusivamente en liferpg_test. No borra datos existentes.
const { getPrisma, disconnect } = require('../src/shared/infrastructure/database/prisma');
const { databaseUrl } = require('../src/config/database');

const id = (n) => `6700000000000000${String(n).padStart(8, '0')}`;
const DAY = 86400000;
const now = new Date();
const date = (days) => new Date(now.getTime() - days * DAY);
const dayStart = (days) => {
  const d = date(days);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const seed = (model, key, data) => model.upsert({ where: { id: key }, create: { id: key, ...data }, update: {} });

async function main() {
  if (process.env.NODE_ENV === 'production' || new URL(databaseUrl()).pathname !== '/liferpg_test') {
    throw new Error('La demostración solo puede cargarse en liferpg_test fuera de producción.');
  }
  const db = getPrisma();
  const people = [
    { id: id(1), email: 'demo.ana@liferpg.test', displayName: 'Ana Demo', alias: 'AnaQuest', pet: 'CAT', color: 'azul', role: 'PLAYER' },
    { id: id(2), email: 'demo.beto@liferpg.test', displayName: 'Beto Demo', alias: 'BetoRunner', pet: 'DOG', color: 'rojo', role: 'PLAYER' },
    { id: id(3), email: 'demo.carla@liferpg.test', displayName: 'Carla Demo', alias: 'CarlaFocus', pet: 'DRAGON', color: 'morado', role: 'PLAYER' },
    { id: id(4), email: 'demo.admin@liferpg.test', displayName: 'Admin Demo', alias: 'AdminDemo', pet: 'CAT', color: 'verde', role: 'ADMIN' },
  ];
  for (const person of people) {
    const existing = await db.user.findUnique({ where: { id: person.id } });
    if (existing && existing.email !== person.email) throw new Error(`El identificador reservado para ${person.email} ya está ocupado.`);
  }
  for (const [index, person] of people.entries()) {
    await seed(db.user, person.id, { email: person.email, displayName: person.displayName, role: person.role, createdAt: date(30),
      account: { firstName: person.displayName.split(' ')[0], lastName: 'Demo', age: 25, gender: 'otro', goals: ['salud'], petColor: person.color, createdAt: date(30) } });
    await seed(db.playerProfile, id(100 + index), { userId: person.id, alias: person.alias, mascotName: 'Pixel', mascotColor: person.color, species: person.pet,
      level: 5 + index, xp: 230, hp: 90, culturePoints: 450, physicalPoints: 320, focusPoints: 280, currentStreak: 3, bestStreak: 7 });
  }
  const [ana, beto, carla] = people;
  for (const [index, friend] of [beto, carla].entries()) {
    await seed(db.friendship, id(200 + index), { requesterId: ana.id, addresseeId: friend.id, pairKey: [ana.id, friend.id].sort().join(':'), status: 'ACCEPTED', acceptedAt: date(20) });
  }
  const habits = [
    { id: id(301), userId: ana.id, name: 'Leer 20 minutos', area: 'CULTURE', difficulty: 'EASY' },
    { id: id(302), userId: ana.id, name: 'Caminar 30 minutos', area: 'PHYSICAL', difficulty: 'MEDIUM' },
    { id: id(303), userId: ana.id, name: 'Meditar', area: 'FOCUS', difficulty: 'EASY' },
    { id: id(304), userId: beto.id, name: 'Salir a caminar', area: 'PHYSICAL', difficulty: 'EASY' },
    { id: id(305), userId: carla.id, name: 'Practicar inglés', area: 'CULTURE', difficulty: 'EASY' },
  ];
  for (const habit of habits) await seed(db.habit, habit.id, { ...habit, startsOn: dayStart(14) });
  const checkins = [[0, 1], [0, 2], [0, 3], [1, 2], [3, 1]];
  for (const [index, [habitIndex, days]] of checkins.entries()) {
    const habit = habits[habitIndex]; const start = dayStart(days);
    await seed(db.habitCheckIn, id(400 + index), { userId: habit.userId, habitId: habit.id, periodStart: start,
      periodEnd: new Date(start.getTime() + DAY - 1), completedAt: new Date(start.getTime() + 15 * 3600000), xpAwarded: 10, pointsAwarded: 10 });
  }
  await seed(db.mission, id(501), { userId: ana.id, title: 'Preparar la presentación', area: 'FOCUS', estimatedMinutes: 30, status: 'PENDING', createdAt: date(2) });
  await seed(db.mission, id(502), { userId: ana.id, title: 'Terminar capítulo del libro', area: 'CULTURE', estimatedMinutes: 25, status: 'COMPLETED', createdAt: date(4), completedAt: date(1), xpAwarded: 30, pointsAwarded: 20 });
  await seed(db.catalogCategory, id(601), { name: 'Ánimo demo', type: 'STICKER' });
  const items = [
    { id: id(610), name: '¡Tú puedes!', group: 'stickers', icon: 'sticker.animo.tu-puedes', categoryId: id(601), tags: ['animo'] },
    { id: id(611), name: 'Un paso más', group: 'stickers', icon: 'sticker.animo.un-paso-mas', categoryId: id(601), tags: ['animo'] },
    { id: id(612), name: 'Poción de HP', group: 'tienda', icon: 'item.pocion-hp', price: 40, giftable: true, consumable: true, tags: ['comun', 'cofre'] },
    { id: id(613), name: 'Escudo de racha', group: 'tienda', icon: 'item.escudo-racha', price: 200, giftable: true, consumable: true, tags: ['raro', 'cofre'] },
    { id: id(614), name: 'Boina de pintor', group: 'tienda', icon: 'item.boina-pintor', slug: 'boina-pintor', slot: 'HEAD', price: 120, tags: ['ropa'] },
    { id: id(615), name: 'Cofre raro', group: 'tienda', icon: 'item.escudo-racha', price: 0, giftable: false, tags: ['raro'] },
  ];
  for (const item of items) await seed(db.catalogItem, item.id, item);
  for (const [index, item] of [items[2], items[3], items[4]].entries()) {
    await seed(db.inventoryEntry, id(700 + index), { userId: ana.id, catalogItemId: item.id, quantity: index === 0 ? 3 : 1, source: 'REWARD' });
  }
  await seed(db.inventoryEntry, id(703), { userId: beto.id, catalogItemId: items[2].id, quantity: 2, source: 'REWARD' });
  await seed(db.stickerMessage, id(801), { senderId: beto.id, recipientId: ana.id, catalogItemId: items[0].id, sentAt: date(1) });
  await seed(db.inactivityAlert, id(802), { userId: carla.id, message: 'Carla lleva varios días sin registrar actividad.', thresholdDays: 3, createdAt: date(1) });
  await seed(db.groupChallenge, id(901), { creatorId: ana.id, title: 'Lectura en equipo', area: 'CULTURE', metric: 'CHECKINS', targetValue: 20, deadline: new Date(now.getTime() + 14 * DAY), createdAt: date(5) });
  await seed(db.challengeParticipant, id(902), { challengeId: id(901), userId: ana.id, status: 'ACCEPTED', joinedAt: date(5) });
  await seed(db.challengeParticipant, id(903), { challengeId: id(901), userId: beto.id, status: 'ACCEPTED', joinedAt: date(5) });
  console.log('Datos demo creados en liferpg_test.');
  for (const person of people) console.log(`${person.displayName}: ${person.id} (${person.role})`);
}

main().catch((error) => { console.error('No se pudo cargar la demo:', error.message); process.exitCode = 1; }).finally(disconnect);
