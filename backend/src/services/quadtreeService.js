const { Point, Boundary, Quadtree } = require('../structures/Quadtree');

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

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function calcularLimites(registros, padding = 0.01) {
  if (!Array.isArray(registros) || registros.length === 0) {
    throw new Error('E necessario informar ao menos um registro para montar a Quadtree.');
  }

  const longitudes = registros.map((registro) => registro.longitude);
  const latitudes = registros.map((registro) => registro.latitude);
  let minLongitude = Math.min(...longitudes);
  let maxLongitude = Math.max(...longitudes);
  let minLatitude = Math.min(...latitudes);
  let maxLatitude = Math.max(...latitudes);

  // O padding evita limites com largura ou altura zero e inclui pontos extremos.
  const longitudePadding = Math.max((maxLongitude - minLongitude) * padding, 0.0001);
  const latitudePadding = Math.max((maxLatitude - minLatitude) * padding, 0.0001);

  return new Boundary(
    minLongitude - longitudePadding,
    minLatitude - latitudePadding,
    maxLongitude + longitudePadding,
    maxLatitude + latitudePadding
  );
}

function converterRegistroEmPonto(registro) {
  return new Point(registro.longitude, registro.latitude, registro);
}

/**
 * Monta a arvore a partir dos registros normalizados pelo csvService.
 * Um Boundary pode ser fornecido; caso contrario, ele e calculado pelos dados.
 */
function montarQuadtree(registros, options = {}) {
  const boundary = options.boundary || calcularLimites(registros, options.padding);
  const tree = new Quadtree(boundary, {
    capacity: options.capacity ?? 4,
    maxDepth: options.maxDepth ?? 8
  });

  let ignoredRecords = 0;

  for (const registro of registros) {
    try {
      const inserted = tree.insert(converterRegistroEmPonto(registro));
      if (!inserted) ignoredRecords += 1;
    } catch (error) {
      ignoredRecords += 1;
    }
  }

  return { tree, ignoredRecords };
}

function contarQuadrantes(node) {
  return 1 + node.children.reduce((total, child) => total + contarQuadrantes(child), 0);
}

/**
 * Filtra os dados e devolve o contrato consumido pelo endpoint /api/quadtree.
 * O filtro de indicador ignora diferencas de caixa e acentuacao.
 */
function gerarRepresentacaoQuadtree(registros, options = {}) {
  const indicadorFiltrado = normalizarTexto(options.indicador);
  const registrosEspaciais = registros.filter(coordenadasValidas);
  const registrosFiltrados = indicadorFiltrado
    ? registrosEspaciais.filter(
        (registro) => normalizarTexto(registro.indicador) === indicadorFiltrado
      )
    : registrosEspaciais;

  if (registrosFiltrados.length === 0) {
    const error = new Error(
      indicadorFiltrado
        ? `Nenhum registro encontrado para o indicador "${options.indicador}".`
        : 'Nenhum registro com coordenadas validas foi encontrado.'
    );
    error.statusCode = 404;
    throw error;
  }

  const { tree, ignoredRecords } = montarQuadtree(registrosFiltrados, options);

  return {
    metadata: {
      totalPontos: tree.count,
      capacidadeUsada: tree.capacity,
      profundidadeMaximaUsada: tree.maxDepth,
      quantidadeTotalQuadrantes: contarQuadrantes(tree),
      valorMinimo: tree.min,
      valorMaximo: tree.max,
      indicador: options.indicador || null,
      registrosSemCoordenadasValidas: registros.length - registrosEspaciais.length,
      registrosIgnorados: ignoredRecords
    },
    quadtree: tree.toJSON()
  };
}

module.exports = {
  coordenadasValidas,
  calcularLimites,
  converterRegistroEmPonto,
  montarQuadtree,
  contarQuadrantes,
  gerarRepresentacaoQuadtree
};
