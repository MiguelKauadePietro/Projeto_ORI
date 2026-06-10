const assert = require('assert');
const { filtrarPontos } = require('../src/services/pontoService');

const registros = [
  { municipio: 'São Carlos', cep: '13560000', latitude: -22, longitude: -47.9, indicador: 'Saúde', valor: 20, quantidade: 2 },
  { municipio: 'Sao Carlos', cep: '13561000', latitude: -22.1, longitude: -47.8, indicador: 'Saude', valor: 40, quantidade: 3 },
  { municipio: 'Bauru', cep: '17010000', latitude: -22.3, longitude: -49, indicador: 'Saude', valor: 50, quantidade: 4 },
  { municipio: 'Teste', cep: null, latitude: null, longitude: -48, indicador: 'Saude', valor: 30, quantidade: 1 }
];

const pontos = filtrarPontos(registros, {
  indicador: 'SAÚDE',
  municipio: 'são carlos',
  valorMin: 25,
  valorMax: 45
});

assert.strictEqual(pontos.length, 1);
assert.deepStrictEqual(pontos[0], {
  municipio: 'Sao Carlos',
  cep: '13561000',
  latitude: -22.1,
  longitude: -47.8,
  indicador: 'Saude',
  valor: 40,
  quantidade: 3
});

console.log('Testes do servico de pontos executados com sucesso.');
