const express = require('express');
const {
  obterDados,
  obterQuadtree,
  obterMunicipios,
  obterPontos,
  obterConcentracao
} = require('../services/dadosService');

const router = express.Router();

function lerInteiroPositivo(valor, nome, valorPadrao, minimo, maximo) {
  if (valor === undefined) return valorPadrao;

  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    const error = new Error(`${nome} deve ser um inteiro entre ${minimo} e ${maximo}.`);
    error.statusCode = 400;
    throw error;
  }

  return numero;
}

function lerNumeroOpcional(valor, nome) {
  if (valor === undefined || String(valor).trim() === '') return undefined;

  const numero = Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(numero)) {
    const error = new Error(`${nome} deve ser um numero valido.`);
    error.statusCode = 400;
    throw error;
  }

  return numero;
}

// Rota simples para verificar se o backend esta disponivel.
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    projeto: 'Utilizacao de Quadtree para mapeamento de dados estatisticos'
  });
});

// Retorna apenas registros validos e com os campos devidamente normalizados.
router.get('/dados', async (req, res, next) => {
  try {
    const dados = await obterDados();
    res.json(dados);
  } catch (error) {
    next(error);
  }
});

// Converte os registros do CSV em quadrantes e estatisticas agregadas.
router.get('/quadtree', async (req, res, next) => {
  try {
    // Limites superiores evitam configuracoes excessivas fornecidas pela URL.
    const capacity = lerInteiroPositivo(req.query.capacidade, 'capacidade', 4, 1, 10000);
    const maxDepth = lerInteiroPositivo(
      req.query.profundidadeMaxima,
      'profundidadeMaxima',
      8,
      0,
      20
    );
    const indicador = String(req.query.indicador || '').trim() || undefined;

    const quadtree = await obterQuadtree({ capacity, maxDepth, indicador });
    res.json(quadtree);
  } catch (error) {
    next(error);
  }
});

// Agrupa os registros por municipio e calcula as estatisticas de cada grupo.
router.get('/municipios', async (req, res, next) => {
  try {
    const indicador = String(req.query.indicador || '').trim() || undefined;
    const municipios = await obterMunicipios({ indicador });
    res.json(municipios);
  } catch (error) {
    next(error);
  }
});

// Retorna registros individuais com coordenadas validas para exibicao no mapa.
router.get('/pontos', async (req, res, next) => {
  try {
    const valorMin = lerNumeroOpcional(req.query.valorMin, 'valorMin');
    const valorMax = lerNumeroOpcional(req.query.valorMax, 'valorMax');

    if (valorMin !== undefined && valorMax !== undefined && valorMin > valorMax) {
      const error = new Error('valorMin nao pode ser maior que valorMax.');
      error.statusCode = 400;
      throw error;
    }

    const pontos = await obterPontos({
      indicador: String(req.query.indicador || '').trim() || undefined,
      municipio: String(req.query.municipio || '').trim() || undefined,
      valorMin,
      valorMax
    });

    res.json(pontos);
  } catch (error) {
    next(error);
  }
});

// Agrupa registros por municipio e calcula uma medida comparavel de concentracao.
router.get('/concentracao', async (req, res, next) => {
  try {
    const concentracoes = await obterConcentracao({
      indicador: String(req.query.indicador || '').trim() || undefined,
      criterio: String(req.query.criterio || 'quantidade').trim().toLowerCase()
    });

    res.json(concentracoes);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
