function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function coordenadasValidas(registro) {
  return (
    Number.isFinite(registro.latitude) &&
    Number.isFinite(registro.longitude) &&
    registro.latitude >= -90 &&
    registro.latitude <= 90 &&
    registro.longitude >= -180 &&
    registro.longitude <= 180
  );
}

/**
 * Retorna somente os campos publicos da visualizacao pontual e aplica todos
 * os filtros antes de enviar os registros ao navegador.
 */
function filtrarPontos(registros, filtros = {}) {
  const indicador = normalizarTexto(filtros.indicador);
  const municipio = normalizarTexto(filtros.municipio);

  return registros
    .filter(coordenadasValidas)
    .filter((registro) => !indicador || normalizarTexto(registro.indicador) === indicador)
    .filter((registro) => !municipio || normalizarTexto(registro.municipio) === municipio)
    .filter(
      (registro) => filtros.valorMin === undefined || registro.valor >= filtros.valorMin
    )
    .filter(
      (registro) => filtros.valorMax === undefined || registro.valor <= filtros.valorMax
    )
    .map((registro) => ({
      municipio: registro.municipio,
      cep: registro.cep,
      latitude: registro.latitude,
      longitude: registro.longitude,
      indicador: registro.indicador,
      valor: registro.valor,
      quantidade: registro.quantidade
    }));
}

module.exports = { filtrarPontos, coordenadasValidas, normalizarTexto };
