const fs = require('fs');
const path = require('path');

const DEFAULT_CSV_PATH = path.resolve(__dirname, '../../../data/dados.csv');
const UPLOADS_PATH = path.resolve(__dirname, '../../../uploads');

let csvAtualPath = null;

function definirCsvAtual(caminhoArquivo) {
  csvAtualPath = caminhoArquivo;
}

function obterCsvMaisRecenteDaPasta() {
  if (!fs.existsSync(UPLOADS_PATH)) return null;

  const arquivos = fs
    .readdirSync(UPLOADS_PATH)
    .filter((arquivo) => path.extname(arquivo).toLowerCase() === '.csv')
    .map((arquivo) => {
      const caminho = path.join(UPLOADS_PATH, arquivo);
      return {
        caminho,
        modificadoEm: fs.statSync(caminho).mtimeMs
      };
    })
    .sort((a, b) => b.modificadoEm - a.modificadoEm);

  return arquivos[0]?.caminho || null;
}

function obterCsvAtual() {
  return csvAtualPath || obterCsvMaisRecenteDaPasta() || DEFAULT_CSV_PATH;
}

module.exports = {
  DEFAULT_CSV_PATH,
  UPLOADS_PATH,
  definirCsvAtual,
  obterCsvAtual
};
