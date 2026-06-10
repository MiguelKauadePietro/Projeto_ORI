const assert = require('assert');
const { gerarRepresentacaoQuadtree } = require('../src/services/quadtreeService');

const registros = [
  { latitude: -23.5, longitude: -46.6, indicador: 'Saude', valor: 10 },
  { latitude: -22.9, longitude: -47.1, indicador: 'Saúde', valor: 20 },
  { latitude: -22.3, longitude: -49.0, indicador: 'Educacao', valor: 30 },
  { latitude: null, longitude: -48.0, indicador: 'Saude', valor: 40 }
];

const resultado = gerarRepresentacaoQuadtree(registros, {
  capacity: 1,
  maxDepth: 4,
  indicador: 'SAÚDE'
});

assert.strictEqual(resultado.metadata.totalPontos, 2);
assert.strictEqual(resultado.metadata.capacidadeUsada, 1);
assert.strictEqual(resultado.metadata.profundidadeMaximaUsada, 4);
assert.strictEqual(resultado.metadata.valorMinimo, 10);
assert.strictEqual(resultado.metadata.valorMaximo, 20);
assert.strictEqual(resultado.metadata.registrosSemCoordenadasValidas, 1);
assert.ok(resultado.metadata.quantidadeTotalQuadrantes > 1);
assert.strictEqual(resultado.quadtree.quantidadePontos, 2);

console.log('Testes do servico da Quadtree executados com sucesso.');
