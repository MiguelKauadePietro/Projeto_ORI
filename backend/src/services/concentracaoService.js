const { agruparPorMunicipio } = require('./municipioService');

const CRITERIOS_VALIDOS = new Set(['quantidade', 'soma']);

/**
 * A concentracao reutiliza a agregacao municipal, mas explicita qual medida
 * sera usada pelo frontend para dimensionar os circulos.
 */
function calcularConcentracao(registros, options = {}) {
  const criterio = options.criterio || 'quantidade';

  if (!CRITERIOS_VALIDOS.has(criterio)) {
    const error = new Error('criterio deve ser "quantidade" ou "soma".');
    error.statusCode = 400;
    throw error;
  }

  return agruparPorMunicipio(registros, options.indicador).map((municipio) => ({
    municipio: municipio.municipio,
    totalRegistros: municipio.quantidade,
    somaValores: municipio.soma,
    mediaValores: municipio.media,
    intensidadeConcentracao:
      criterio === 'soma' ? municipio.soma : municipio.quantidade,
    criterio,
    latitude: municipio.latitude,
    longitude: municipio.longitude
  }));
}

module.exports = { calcularConcentracao };
