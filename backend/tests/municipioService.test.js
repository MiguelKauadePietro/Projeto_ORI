const assert = require('assert');
const { agruparPorMunicipio } = require('../src/services/municipioService');

const registros = [
  { municipio: 'São Carlos', indicador: 'Saúde', valor: 10, latitude: -22, longitude: -47.9 },
  { municipio: 'Sao Carlos', indicador: 'Saude', valor: 30, latitude: -22.2, longitude: -47.7 },
  { municipio: 'Bauru', indicador: 'Educacao', valor: 50, latitude: -22.3, longitude: -49 }
];

const municipios = agruparPorMunicipio(registros, 'SAÚDE');

assert.strictEqual(municipios.length, 1);
assert.strictEqual(municipios[0].quantidade, 2);
assert.strictEqual(municipios[0].soma, 40);
assert.strictEqual(municipios[0].media, 20);
assert.strictEqual(municipios[0].minimo, 10);
assert.strictEqual(municipios[0].maximo, 30);
assert.strictEqual(municipios[0].latitude, -22.1);
assert.strictEqual(municipios[0].longitude, -47.8);

console.log('Testes do servico de municipios executados com sucesso.');
