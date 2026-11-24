const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const B = require('../../src/modules/m08-botin/domain/entities/Botin');
const { colorOf } = require('../../src/modules/m08-botin/infrastructure/mappers/botinMapper');

// Reglas puras del M08: rareza, qué se puede regalar (RDF089) y cómo se ve el cofre.
const item = (over = {}) => ({ id: 'i1', name: 'Poción de HP', icon: 'item.pocion-hp', tags: ['comun'], group: 'regalables', giftable: true, active: true, ...over });
const entry = (over = {}, itemOver = {}) => ({ itemId: 'i1', qty: 2, equipped: false, item: item(itemOver), ...over });

describe('M08 · reglas del dominio', () => {
  test('la rareza sale de las etiquetas; sin etiqueta es común', () => {
    assert.equal(B.rarityOf(['raro', 'sombrero']), 'raro');
    assert.equal(B.rarityOf(['legendario']), 'legendario');
    assert.equal(B.rarityOf([]), 'comun');
    assert.equal(B.rarityOf(undefined), 'comun');
  });

  test('RDF089: motivos por los que no se puede regalar, en orden', () => {
    assert.equal(B.giftBlockReason(null), 'Ese objeto no está en tu cofre.');
    assert.equal(B.giftBlockReason(entry({ equipped: true })), 'No puedes regalar un objeto que tienes equipado.');
    assert.equal(B.giftBlockReason(entry({}, { group: 'exclusivos', giftable: false })), 'Los objetos exclusivos no se pueden regalar.');
    assert.equal(B.giftBlockReason(entry({}, { group: 'tienda', giftable: false })), 'Ese objeto no se puede regalar.');
    assert.equal(B.giftBlockReason(entry({}, { active: false })), 'Ese objeto no se puede regalar.');
    assert.equal(B.giftBlockReason(entry({ qty: 0 })), 'Ya no te quedan existencias de ese objeto.');
    assert.equal(B.giftBlockReason(entry()), null);
  });

  test('las cartas son ilimitadas: se ven con -1 y nunca se agotan', () => {
    const carta = entry({ qty: 0 }, { tags: ['carta'] });
    assert.equal(B.giftBlockReason(carta), null);
    assert.deepEqual(B.chestView(carta), { id: 'i1', name: 'Poción de HP', icon: 'item.pocion-hp', rarity: 'carta', qty: -1, equipped: false, exclusive: false, giftable: true });
  });

  test('cofre: equipado y exclusivo se ven pero no se pueden regalar', () => {
    assert.deepEqual(
      { ...B.chestView(entry({ equipped: true })) },
      { id: 'i1', name: 'Poción de HP', icon: 'item.pocion-hp', rarity: 'comun', qty: 2, equipped: true, exclusive: false, giftable: false },
    );
    assert.equal(B.chestView(entry({}, { group: 'exclusivos', giftable: false })).exclusive, true);
  });

  test('el color de la mascota se guarda por nombre y se entrega como color CSS', () => {
    assert.equal(colorOf('azul'), '#2f80ed');
    assert.equal(colorOf('#ff7043'), '#ff7043');
    assert.equal(colorOf(null), '#9c27b0');
    assert.equal(colorOf('arcoiris'), '#9c27b0');
  });
});
