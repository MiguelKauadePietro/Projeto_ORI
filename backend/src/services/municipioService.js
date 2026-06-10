// Coordenadas aproximadas usadas quando um registro municipal nao possui posicao.
// Em uma versao posterior, esta tabela pode ser substituida por centroides do IBGE.
const COORDENADAS_MUNICIPIOS = {
  'sao paulo': { latitude: -23.5505, longitude: -46.6333 },
  campinas: { latitude: -22.9056, longitude: -47.0608 },
  'ribeirao preto': { latitude: -21.1775, longitude: -47.8103 },
  'sao carlos': { latitude: -22.0174, longitude: -47.8908 },
  matao: { latitude: -21.6033, longitude: -48.3658 },
  araraquara: { latitude: -21.7845, longitude: -48.178 },
  santos: { latitude: -23.9608, longitude: -46.3336 },
  sorocaba: { latitude: -23.5015, longitude: -47.4526 },
  bauru: { latitude: -22.3145, longitude: -49.0587 }
};

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function obterCoordenadas(registros, municipioNormalizado) {
  const registrosComCoordenadas = registros.filter(
    (registro) => Number.isFinite(registro.latitude) && Number.isFinite(registro.longitude)
  );

  if (registrosComCoordenadas.length > 0) {
    return {
      latitude:
        registrosComCoordenadas.reduce((total, registro) => total + registro.latitude, 0) /
        registrosComCoordenadas.length,
      longitude:
        registrosComCoordenadas.reduce((total, registro) => total + registro.longitude, 0) /
        registrosComCoordenadas.length
    };
  }

  return COORDENADAS_MUNICIPIOS[municipioNormalizado] || null;
}

/**
 * Agrupa registros pelo nome normalizado do municipio. A grafia do primeiro
 * registro e preservada para apresentacao no frontend.
 */
function agruparPorMunicipio(registros, indicador) {
  const indicadorNormalizado = normalizarTexto(indicador);
  const registrosFiltrados = indicadorNormalizado
    ? registros.filter(
        (registro) => normalizarTexto(registro.indicador) === indicadorNormalizado
      )
    : registros;

  const grupos = new Map();

  for (const registro of registrosFiltrados) {
    const chave = normalizarTexto(registro.municipio);
    if (!chave || !Number.isFinite(registro.valor)) continue;

    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(registro);
  }

  return Array.from(grupos.entries())
    .map(([chave, itens]) => {
      const valores = itens.map((item) => item.valor);
      const soma = valores.reduce((total, valor) => total + valor, 0);
      const coordenadas = obterCoordenadas(itens, chave);

      if (!coordenadas) return null;

      return {
        municipio: itens[0].municipio,
        quantidade: itens.length,
        soma: Number(soma.toFixed(10)),
        media: Number((soma / itens.length).toFixed(10)),
        minimo: Math.min(...valores),
        maximo: Math.max(...valores),
        latitude: coordenadas.latitude,
        longitude: coordenadas.longitude
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.municipio.localeCompare(b.municipio, 'pt-BR'));
}

module.exports = { agruparPorMunicipio, normalizarTexto };
