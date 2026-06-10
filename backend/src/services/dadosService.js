const path = require('path');
const { lerCsv } = require('./csvService');
const { gerarRepresentacaoQuadtree } = require('./quadtreeService');
const { agruparPorMunicipio } = require('./municipioService');
const { filtrarPontos } = require('./pontoService');
const { calcularConcentracao } = require('./concentracaoService');

const csvPath = path.resolve(__dirname, '../../../data/dados.csv');

/**
 * Ponto de entrada do processamento estatistico.
 * Esta camada permite adicionar agregacoes e a Quadtree sem acoplar a rota
 * HTTP diretamente ao mecanismo de leitura do CSV.
 */
async function obterDados() {
  const resultado = await lerCsv(csvPath);

  return {
    fonte: path.basename(csvPath),
    ...resultado
  };
}

async function obterQuadtree(options = {}) {
  const { registros } = await lerCsv(csvPath);
  return gerarRepresentacaoQuadtree(registros, options);
}

async function obterMunicipios(options = {}) {
  const { registros } = await lerCsv(csvPath);
  const municipios = agruparPorMunicipio(registros, options.indicador);

  if (municipios.length === 0) {
    const error = new Error(
      options.indicador
        ? `Nenhum registro encontrado para o indicador "${options.indicador}".`
        : 'Nenhum municipio com dados validos foi encontrado.'
    );
    error.statusCode = 404;
    throw error;
  }

  return municipios;
}

async function obterPontos(filtros = {}) {
  const { registros } = await lerCsv(csvPath);
  return filtrarPontos(registros, filtros);
}

async function obterConcentracao(options = {}) {
  const { registros } = await lerCsv(csvPath);
  const concentracoes = calcularConcentracao(registros, options);

  if (concentracoes.length === 0) {
    const error = new Error(
      options.indicador
        ? `Nenhum registro encontrado para o indicador "${options.indicador}".`
        : 'Nenhum dado de concentracao foi encontrado.'
    );
    error.statusCode = 404;
    throw error;
  }

  return concentracoes;
}

module.exports = {
  obterDados,
  obterQuadtree,
  obterMunicipios,
  obterPontos,
  obterConcentracao
};
