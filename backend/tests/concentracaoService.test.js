const assert = require('assert');
const { calcularConcentracao } = require('../src/services/concentracaoService');

const registros = [
  { municipio: 'Campinas', indicador: 'Saude', valor: 10, latitude: -22.9, longitude: -47.1 },
  { municipio: 'Campinas', indicador: 'Saude', valor: 30, latitude: -23, longitude: -47 },
  { municipio: 'Bauru', indicador: 'Saude', valor: 50, latitude: -22.3, longitude: -49 }
];

const porQuantidade = calcularConcentracao(registros, { criterio: 'quantidade' });
const campinas = porQuantidade.find((item) => item.municipio === 'Campinas');

assert.strictEqual(campinas.totalRegistros, 2);
assert.strictEqual(campinas.somaValores, 40);
assert.strictEqual(campinas.mediaValores, 20);
assert.strictEqual(campinas.intensidadeConcentracao, 2);

const porSoma = calcularConcentracao(registros, { criterio: 'soma' });
assert.strictEqual(
  porSoma.find((item) => item.municipio === 'Campinas').intensidadeConcentracao,
  40
);

assert.throws(
  () => calcularConcentracao(registros, { criterio: 'invalido' }),
  /criterio deve ser/
);

console.log('Testes do servico de concentracao executados com sucesso.');
