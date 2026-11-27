const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const V = require('../../src/modules/m01-tamagotchi-perfil/domain/entities/Vestidor');
const { assetOf, itemKey, isSameItem, appIconOf } = require('../../src/shared/domain/catalogItem');

// Reglas del Vestidor (M01): la Casa y el Vestidor de la app buscan la imagen por `asset`,
// y la Tienda (M04) guarda en el perfil la misma clave al equipar.
// Así vienen los artículos de la tienda en Atlas: sin slug ni asset, con el ícono de la PWA.
const boina = { id: 'b1', name: 'Boina de pintor', icon: 'item.boina-pintor', slot: 'HEAD', price: 120, pointType: 'CULTURE', active: true };
const gorro = { id: 'g1', name: 'Gorro de lana', slug: 'gorro-lana', icon: 'clothes', slot: 'HEAD', price: 90, pointType: 'FOCUS', active: true };
const bufanda = { id: 'f1', name: 'Bufanda roja', icon: 'item.bufanda-roja', slot: 'BODY', price: 60, pointType: 'PHYSICAL' };
// Otra "Bufanda roja" del catálogo, con slug propio y la misma imagen.
const bufanda2 = { id: 'f2', name: 'Bufanda roja', slug: 'bufanda-roja', icon: 'clothes', slot: 'BODY', price: 150, pointType: 'PHYSICAL' };
const bosque = { id: 'k1', name: 'Bosque', icon: 'item.fondo-bosque', slot: 'BACKGROUND', price: 0, pointType: 'FOCUS', active: true };
const sticker = { id: 's1', name: 'Sticker', icon: 'sticker.corazon', group: 'stickers', price: 0, active: true };
const apagada = { id: 'x1', name: 'Vieja', icon: 'item.vieja', slot: 'FACE', active: false };
const propia = { id: 'c1', name: 'Mi gorra', icon: 'star', slot: 'HEAD', custom: true };
const catalog = [boina, gorro, bufanda, bufanda2, bosque, sticker, apagada, propia];

// Prisma no escribe consumedAt al comprar: el campo ni siquiera existe.
const entry = (id, item, over = {}) => ({ id, catalogItemId: item.id, quantity: 1, ...over });
const byId = (list) => Object.fromEntries(list.map((i) => [i.id, i]));

describe('Catálogo · imagen y clave de cada prenda', () => {
  test('la imagen sale de asset, slug o el ícono de la PWA', () => {
    assert.equal(assetOf({ asset: 'a', slug: 'b', icon: 'item.c' }), 'a');
    assert.equal(assetOf({ slug: 'b', icon: 'item.c' }), 'b');
    assert.equal(assetOf(boina), 'boina-pintor');
    assert.equal(assetOf({ id: 'z', icon: 'star' }), null);
  });

  test('la clave es el asset o slug del catálogo; si no hay, el id (nunca el nombre del ícono)', () => {
    assert.equal(itemKey(gorro), 'gorro-lana');
    assert.equal(itemKey(boina), 'b1');
    assert.equal(itemKey(bufanda), 'f1');
    assert.equal(itemKey(bufanda2), 'bufanda-roja');
  });

  test('reconoce la clave, el id y el slug; la imagen compartida no identifica la prenda', () => {
    assert.ok(isSameItem(boina, 'b1'));
    assert.ok(isSameItem(gorro, 'gorro-lana'));
    assert.ok(isSameItem(gorro, 'g1'));
    assert.ok(!isSameItem(bufanda, 'bufanda-roja'));
    assert.ok(!isSameItem(boina, null));
  });

  test('la ropa usa el ícono de ropa de la app', () => {
    assert.equal(appIconOf(boina), 'clothes');
    assert.equal(appIconOf(gorro), 'clothes');
  });
});

describe('M01 · GET /vestidor/articulos', () => {
  test('solo ropa y fondos activos del catálogo, cada uno con su clave y su imagen', () => {
    const list = V.buildWardrobe({ catalog, entries: [], profile: {} });
    assert.deepEqual(list.map((i) => i.id), ['b1', 'gorro-lana', 'f1', 'bufanda-roja', 'k1']);
    assert.deepEqual(list.map((i) => i.asset), ['boina-pintor', 'gorro-lana', 'bufanda-roja', 'bufanda-roja', 'fondo-bosque']);
    assert.deepEqual(list[0], {
      id: 'b1', name: 'Boina de pintor', stat: 'cultura', icon: 'clothes',
      status: '120 pts', equipped: false, owned: false, category: 'Cabeza', asset: 'boina-pintor',
    });
  });

  test('lo comprado es suyo aunque la existencia no traiga consumedAt; lo usado no', () => {
    const entries = [entry('e1', boina), entry('e2', bufanda, { consumedAt: new Date(), quantity: 0 })];
    const by = byId(V.buildWardrobe({ catalog, entries, profile: {} }));
    assert.deepEqual([by.b1.owned, by.b1.status], [true, 'Tuyo']);
    assert.equal(by.f1.owned, false);
    assert.equal(by.k1.owned, true, 'el fondo gratis es de todos');
  });

  test('lo equipado (por clave o por id) sale como equipado, y solo esa prenda', () => {
    const by = byId(V.buildWardrobe({
      catalog, entries: [entry('e1', boina), entry('e3', bufanda2)],
      profile: { equippedHeadSlug: 'b1', equippedBodySlug: 'f2' },
    }));
    assert.deepEqual([by.b1.equipped, by.b1.status], [true, 'Equipado']);
    assert.equal(by['bufanda-roja'].equipped, true);
    assert.equal(by.f1.equipped, false, 'la otra bufanda con la misma imagen no');
    assert.equal(by['gorro-lana'].equipped, false);
  });
});

describe('M01 · PATCH /vestidor/articulos/:id', () => {
  test('encuentra la prenda por su clave, id o slug; no lo que no es ropa', () => {
    assert.equal(V.findWardrobeItem(catalog, 'b1'), boina);
    assert.equal(V.findWardrobeItem(catalog, 'gorro-lana'), gorro);
    assert.equal(V.findWardrobeItem(catalog, 'g1'), gorro);
    assert.equal(V.findWardrobeItem(catalog, 'bufanda-roja'), bufanda2);
    assert.equal(V.findWardrobeItem(catalog, 'f1'), bufanda);
    assert.equal(V.findWardrobeItem(catalog, 's1'), null);
    assert.equal(V.findWardrobeItem(catalog, 'x1'), null);
    assert.equal(V.findWardrobeItem(catalog, 'c1'), null);
  });

  test('no se puede equipar lo que no es tuyo (400)', () => {
    const plan = V.planEquip({ catalog, entries: [], profile: {}, item: gorro, equipped: true });
    assert.equal(plan.error, 'Esa prenda todavía no es tuya.');
  });

  test('equipar guarda la clave y deja una sola prenda puesta por parte en el inventario', () => {
    const entries = [entry('e1', boina, { equipped: true }), entry('e2', gorro), entry('e3', bufanda, { equipped: true })];
    const profile = { equippedHeadSlug: 'b1', equippedBodySlug: 'f1' };
    const plan = V.planEquip({ catalog, entries, profile, item: gorro, equipped: true });
    assert.deepEqual(plan.profileData, { equippedHeadSlug: 'gorro-lana' });
    assert.deepEqual(plan.entryUpdates, [{ id: 'e1', equipped: false }, { id: 'e2', equipped: true }]);
  });

  test('quitar solo vacía la parte si lo puesto es esa prenda', () => {
    const entries = [entry('e1', boina, { equipped: true }), entry('e2', gorro)];
    const profile = { equippedHeadSlug: 'b1' };
    const quitar = V.planEquip({ catalog, entries, profile, item: boina, equipped: false });
    assert.deepEqual(quitar, { profileData: { equippedHeadSlug: null }, entryUpdates: [{ id: 'e1', equipped: false }] });
    const otra = V.planEquip({ catalog, entries, profile, item: gorro, equipped: false });
    assert.deepEqual(otra, { profileData: {}, entryUpdates: [] });
  });

  test('el fondo gratis se equipa sin existencia en el inventario', () => {
    const plan = V.planEquip({ catalog, entries: [], profile: {}, item: bosque, equipped: true });
    assert.deepEqual(plan, { profileData: { equippedBgSlug: 'k1' }, entryUpdates: [] });
  });
});

describe('M01 · looks', () => {
  test('aplicar un look deja el inventario igual que el perfil', () => {
    const entries = [entry('e1', boina, { equipped: true }), entry('e2', gorro), entry('e3', bufanda)];
    const updates = V.syncEntries({ catalog, entries, profile: { equippedHeadSlug: 'gorro-lana', equippedBodySlug: 'f1' } });
    assert.deepEqual(updates, [{ id: 'e1', equipped: false }, { id: 'e2', equipped: true }, { id: 'e3', equipped: true }]);
  });

  test('las partes del look muestran el nombre de la prenda', () => {
    assert.deepEqual(
      V.slotNames({ catalog, values: { head: 'b1', face: null, body: 'bufanda-roja', bg: null } }),
      { Cabeza: 'Boina de pintor', Cara: 'Vacío', Cuerpo: 'Bufanda roja', Fondo: 'La Casa' },
    );
    assert.equal(V.slotNames({ catalog, values: { head: 'ya-no-existe' } }).Cabeza, 'ya-no-existe');
  });
});
