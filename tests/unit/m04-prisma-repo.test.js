const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { PrismaTiendaRepository } = require('../../src/modules/m04-tienda/infrastructure/repositories/PrismaTiendaRepository');
const { crearPrismaFalso, nuevoId } = require('../support/prismaFalso');

// Repositorio REAL del M04 contra el cliente falso. Prisma con MongoDB no escribe los campos
// opcionales que no se mandan, y después "consumedAt: null" NO encuentra esos documentos
// (el cliente falso sí los encontraría). Este envoltorio imita a Prisma en ese punto para
// que el inventario no vuelva a salir vacío en Atlas.
const comoPrismaMongo = (db) => {
  const sinCampo = (where) => where && 'consumedAt' in where && where.consumedAt === null;
  const filtrar = (rows) => rows.filter((r) => 'consumedAt' in r);
  const entries = db.inventoryEntry;
  return new Proxy(db, {
    get(target, prop) {
      if (prop !== 'inventoryEntry') return target[prop];
      return new Proxy(entries, {
        get(t, method) {
          if (method === 'findMany') {
            return async (args = {}) => {
              const rows = await t.findMany(args);
              return sinCampo(args.where) ? filtrar(rows) : rows;
            };
          }
          if (method === 'findFirst') {
            return async (args = {}) => {
              if (!sinCampo(args.where)) return t.findFirst(args);
              return filtrar(await t.findMany(args))[0] ?? null;
            };
          }
          return t[method];
        },
      });
    },
  });
};

const USER = nuevoId();

describe('M04 · repositorio de Prisma', () => {
  test('el inventario incluye lo comprado aunque el documento no traiga consumedAt', async () => {
    const fake = crearPrismaFalso();
    const boina = await fake.catalogItem.create({ data: { name: 'Boina', group: 'tienda', price: 120, pointType: 'CULTURE', slot: 'HEAD' } });
    const pocion = await fake.catalogItem.create({ data: { name: 'Poción', group: 'tienda', price: 40, pointType: 'PHYSICAL', consumable: true } });
    // Así lo deja Prisma al comprar: sin el campo consumedAt.
    await fake.inventoryEntry.create({ data: { userId: USER, catalogItemId: boina.id, quantity: 1, acquiredAt: new Date() } });
    // Una ya usada sí trae consumedAt.
    await fake.inventoryEntry.create({ data: { userId: USER, catalogItemId: pocion.id, quantity: 0, consumedAt: new Date(), acquiredAt: new Date() } });

    const repo = new PrismaTiendaRepository({ db: comoPrismaMongo(fake) });
    const inventario = await repo.listInventory(USER);
    assert.deepEqual(inventario.map((row) => row.item.name), ['Boina']);

    assert.equal((await repo.findInventoryEntry(USER, boina.id))?.item.name, 'Boina');
    assert.equal(await repo.findInventoryEntry(USER, pocion.id), null);
  });
});
