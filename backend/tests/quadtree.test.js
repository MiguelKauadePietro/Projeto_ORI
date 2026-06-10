const assert = require('assert');
const { Point, Boundary, Quadtree } = require('../src/structures/Quadtree');

const tree = new Quadtree(new Boundary(-50, -25, -45, -20), {
  capacity: 1,
  maxDepth: 4
});

const points = [
  new Point(-46.63, -23.55, { municipio: 'Sao Paulo', valor: 10 }),
  new Point(-47.06, -22.9, { municipio: 'Campinas', valor: 20 }),
  new Point(-49.05, -22.31, { municipio: 'Bauru', valor: 30 })
];

points.forEach((point) => assert.strictEqual(tree.insert(point), true));

assert.strictEqual(tree.count, 3);
assert.strictEqual(tree.sum, 60);
assert.strictEqual(tree.average, 20);
assert.strictEqual(tree.min, 10);
assert.strictEqual(tree.max, 30);
assert.strictEqual(tree.isDivided, true);

const result = tree.query(new Boundary(-47.5, -24, -46, -22.5));
assert.deepStrictEqual(
  result.map((point) => point.data.municipio).sort(),
  ['Campinas', 'Sao Paulo']
);

const json = tree.toJSON();
assert.strictEqual(json.quantidadePontos, 3);
assert.strictEqual(json.filhos.length, 4);

console.log('Testes da Quadtree executados com sucesso.');
