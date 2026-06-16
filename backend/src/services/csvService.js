const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const DEFAULT_CSV_PATH = path.resolve(__dirname, '../../../data/dados.csv');
const COLUNAS_OBRIGATORIAS = ['municipio', 'latitude', 'longitude', 'indicador', 'valor', 'quantidade'];

/**
 * Padroniza os cabecalhos para evitar diferencas de caixa, espacos e acentos.
 * Exemplo: "Município" passa a ser "municipio".
 */
function normalizarNomeCampo(nome) {
  return String(nome)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function converterNumero(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return null;
  }

  // Aceita tanto ponto quanto virgula como separador decimal.
  const numero = Number(String(valor).trim().replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

function normalizarCep(cep) {
  const somenteDigitos = String(cep || '').replace(/\D/g, '');
  return somenteDigitos || null;
}

function normalizarRegistro(linha, indice) {
  const latitude = converterNumero(linha.latitude);
  const longitude = converterNumero(linha.longitude);
  const valor = converterNumero(linha.valor);
  const quantidade = converterNumero(linha.quantidade);

  const registro = {
    id: indice + 1,
    municipio: String(linha.municipio || '').trim(),
    cep: normalizarCep(linha.cep),
    latitude,
    longitude,
    indicador: String(linha.indicador || linha.categoria || '').trim(),
    valor,
    quantidade
  };

  return registro;
}

function registroValido(registro) {
  const coordenadasValidas =
    registro.latitude !== null &&
    registro.longitude !== null &&
    registro.latitude >= -90 &&
    registro.latitude <= 90 &&
    registro.longitude >= -180 &&
    registro.longitude <= 180;

  return Boolean(
    registro.municipio &&
      registro.indicador &&
      registro.valor !== null &&
      registro.quantidade !== null &&
      registro.quantidade >= 0 &&
      coordenadasValidas
  );
}

/**
 * Le e normaliza um CSV. Linhas incompletas ou com valores numericos invalidos
 * sao descartadas para que nao sejam inseridas futuramente na Quadtree.
 */
function lerCsv(caminhoArquivo = DEFAULT_CSV_PATH) {
  return new Promise((resolve, reject) => {
    const registros = [];
    const previa = [];
    let colunas = [];
    let linhasLidas = 0;

    const stream = fs.createReadStream(caminhoArquivo);

    stream.on('error', (error) => {
      reject(new Error(`Nao foi possivel ler o arquivo CSV: ${error.message}`));
    });

    stream
      .pipe(
        csv({
          mapHeaders: ({ header }) => normalizarNomeCampo(header),
          skipLines: 0
        })
      )
      .on('headers', (headers) => {
        colunas = headers.map(normalizarNomeCampo);
      })
      .on('data', (linha) => {
        const registro = normalizarRegistro(linha, linhasLidas);
        linhasLidas += 1;

        if (registroValido(registro)) {
          registros.push(registro);

          if (previa.length < 5) {
            previa.push(registro);
          }
        }
      })
      .on('error', (error) => {
        reject(new Error(`Nao foi possivel processar o arquivo CSV: ${error.message}`));
      })
      .on('end', () => {
        resolve({
          colunas,
          totalLinhas: linhasLidas,
          totalRegistros: registros.length,
          linhasIgnoradas: linhasLidas - registros.length,
          previa,
          registros
        });
      });
  });
}

function validarColunasObrigatorias(colunas) {
  const conjunto = new Set(colunas.map(normalizarNomeCampo));
  return COLUNAS_OBRIGATORIAS.filter((coluna) => !conjunto.has(coluna));
}

module.exports = {
  COLUNAS_OBRIGATORIAS,
  lerCsv,
  normalizarNomeCampo,
  normalizarRegistro,
  registroValido,
  validarColunasObrigatorias
};
