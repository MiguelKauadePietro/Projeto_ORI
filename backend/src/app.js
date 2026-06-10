const path = require('path');
const express = require('express');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const frontendPath = path.resolve(__dirname, '../../frontend');

// Permite que a API receba JSON em futuras rotas de upload e configuracao.
app.use(express.json());

// Todas as rotas da API ficam centralizadas sob o prefixo /api.
app.use('/api', apiRoutes);

// O Express entrega HTML, CSS e JavaScript diretamente da pasta frontend.
app.use(express.static(frontendPath));

// Rotas desconhecidas da interface retornam a pagina principal.
// O middleware sem caminho funciona como fallback no Express 5.
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Middleware de erro centralizado para as futuras etapas da API.
app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  // Erros inesperados sao registrados; erros de validacao ja sao explicados ao cliente.
  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    erro: 'Nao foi possivel carregar os dados estatisticos.',
    detalhe: error.message
  });
});

module.exports = app;
