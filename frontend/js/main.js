// Coordenadas aproximadas do centro geografico do estado de Sao Paulo.
const centroSaoPaulo = [-22.45, -48.6];

const map = L.map('map', { minZoom: 5, maxZoom: 18 }).setView(centroSaoPaulo, 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const form = document.querySelector('#visualizacao-form');
const uploadForm = document.querySelector('#upload-form');
const arquivoCsv = document.querySelector('#arquivo-csv');
const botaoEnviarCsv = document.querySelector('#enviar-csv');
const uploadMensagem = document.querySelector('#upload-mensagem');
const uploadDetalhes = document.querySelector('#upload-detalhes');
const uploadResumo = document.querySelector('#upload-resumo');
const uploadColunas = document.querySelector('#upload-colunas');
const uploadPrevia = document.querySelector('#upload-previa');
const seletorModo = document.querySelector('#modo-visualizacao');
const controlesQuadtree = document.querySelector('#controles-quadtree');
const controlesPontos = document.querySelector('#controles-pontos');
const controlesConcentracao = document.querySelector('#controles-concentracao');
const legendaConcentracao = document.querySelector('#legenda-concentracao');
const botaoRecarregar = document.querySelector('#recarregar');
const apiStatus = document.querySelector('#api-status');
const mensagem = document.querySelector('#mensagem');
const camadaQuadrantes = L.layerGroup().addTo(map);
const camadaMunicipios = L.layerGroup().addTo(map);
// Esta camada isolada pode futuramente ser trocada por L.markerClusterGroup().
const camadaPontos = L.layerGroup().addTo(map);
const camadaConcentracao = L.layerGroup().addTo(map);
let primeiraCarga = true;
let temporizadorZoom = null;
let profundidadeQuadtreeAtual = null;

/**
 * Converte o zoom do Leaflet em profundidade maxima da Quadtree.
 *
 * Em zoom baixo, o usuario observa uma area extensa e poucos quadrantes sao
 * suficientes. Em zoom alto, uma profundidade maior cria celulas menores e
 * revela mais detalhes espaciais. Isso representa uma mudanca de nivel de
 * detalhe sem alterar os dados originais.
 */
function zoomParaProfundidade(zoom) {
  if (zoom <= 7) return 3;
  if (zoom <= 11) return 5;
  return 7;
}

function sincronizarProfundidadeComZoom() {
  const zoom = map.getZoom();
  const profundidade = zoomParaProfundidade(zoom);

  document.querySelector('#profundidade-maxima').value = profundidade;
  document.querySelector('#detalhe-zoom').textContent =
    `Zoom ${zoom}: profundidade automatica ${profundidade}.`;

  return profundidade;
}

/**
 * Debounce adia a requisicao ate o usuario terminar a sequencia de zooms.
 * Assim, varios movimentos rapidos geram apenas uma chamada ao backend.
 */
function debounce(callback, delay) {
  return (...args) => {
    clearTimeout(temporizadorZoom);
    temporizadorZoom = setTimeout(() => callback(...args), delay);
  };
}

function formatarNumero(valor) {
  if (valor === null || valor === undefined) return 'Sem dados';
  return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

// Transforma um valor em uma cor entre azul claro e azul escuro.
function obterCor(valor, minimo, maximo) {
  if (valor === null || valor === undefined) return '#d9e0e8';

  const intervalo = maximo - minimo;
  const proporcao = intervalo === 0 ? 1 : (valor - minimo) / intervalo;
  const proporcaoLimitada = Math.max(0, Math.min(1, proporcao));
  return `hsl(205 85% ${88 - proporcaoLimitada * 56}%)`;
}

function criarPopupQuadrante(no) {
  return `
    <strong>Quadrante da Quadtree</strong><br>
    Profundidade: ${no.profundidade}<br>
    Quantidade de pontos: ${no.quantidadePontos}<br>
    Soma: ${formatarNumero(no.somaValores)}<br>
    Media: ${formatarNumero(no.mediaValores)}<br>
    Minimo: ${formatarNumero(no.minimoValor)}<br>
    Maximo: ${formatarNumero(no.maximoValor)}
  `;
}

// Percorre a arvore recursivamente e desenha um retangulo para cada no.
function desenharNo(no, metadata) {
  const limites = no.limites;
  const possuiFilhos = no.filhos.length > 0;
  const cor = obterCor(no.mediaValores, metadata.valorMinimo, metadata.valorMaximo);
  const retangulo = L.rectangle(
    [
      [limites.minLatitude, limites.minLongitude],
      [limites.maxLatitude, limites.maxLongitude]
    ],
    {
      color: cor,
      weight: possuiFilhos ? 2 : 1,
      opacity: 0.9,
      fillColor: cor,
      fillOpacity: possuiFilhos ? 0.08 : no.quantidadePontos > 0 ? 0.55 : 0.12
    }
  );

  retangulo.bindPopup(criarPopupQuadrante(no));
  retangulo.addTo(camadaQuadrantes);
  no.filhos.forEach((filho) => desenharNo(filho, metadata));
}

function atualizarLegenda(minimo, maximo) {
  document.querySelector('#valor-minimo').textContent = formatarNumero(minimo);
  document.querySelector('#valor-maximo').textContent = formatarNumero(maximo);
}

function atualizarResumo(rotuloPrimario, valorPrimario, rotuloSecundario, valorSecundario) {
  document.querySelector('#rotulo-total-primario').textContent = rotuloPrimario;
  document.querySelector('#total-primario').textContent = valorPrimario;
  document.querySelector('#rotulo-total-secundario').textContent = rotuloSecundario;
  document.querySelector('#total-secundario').textContent = valorSecundario;
}

function obterIndicador() {
  return document.querySelector('#indicador').value.trim();
}

function limparCamadas() {
  camadaQuadrantes.clearLayers();
  camadaMunicipios.clearLayers();
  camadaPontos.clearLayers();
  camadaConcentracao.clearLayers();
}

function definirMensagemUpload(texto, erro = false) {
  uploadMensagem.textContent = texto;
  uploadMensagem.classList.toggle('erro', erro);
}

function renderizarPreviaCsv(colunas, registros) {
  const thead = uploadPrevia.querySelector('thead');
  const tbody = uploadPrevia.querySelector('tbody');
  thead.textContent = '';
  tbody.textContent = '';

  if (!registros || registros.length === 0) {
    return;
  }

  const colunasDaPrevia = colunas.filter((coluna) => coluna in registros[0]);
  const linhaCabecalho = document.createElement('tr');

  colunasDaPrevia.forEach((coluna) => {
    const th = document.createElement('th');
    th.textContent = coluna;
    linhaCabecalho.appendChild(th);
  });

  thead.appendChild(linhaCabecalho);

  registros.forEach((registro) => {
    const linha = document.createElement('tr');

    colunasDaPrevia.forEach((coluna) => {
      const td = document.createElement('td');
      td.textContent = registro[coluna] ?? '';
      linha.appendChild(td);
    });

    tbody.appendChild(linha);
  });
}

function atualizarDetalhesUpload(resultado) {
  uploadDetalhes.classList.remove('oculto');
  uploadResumo.textContent =
    `${resultado.registrosLidos} linhas lidas, ` +
    `${resultado.registrosValidos} registros validos e ` +
    `${resultado.registrosInvalidos} registros ignorados.`;
  uploadColunas.textContent = `Colunas encontradas: ${resultado.colunas.join(', ')}.`;
  renderizarPreviaCsv(resultado.colunas, resultado.previa);
}

async function enviarCsv(event) {
  event.preventDefault();

  const arquivo = arquivoCsv.files[0];
  if (!arquivo) {
    definirMensagemUpload('Selecione um arquivo CSV antes de enviar.', true);
    return;
  }

  const extensaoCsv = arquivo.name.toLowerCase().endsWith('.csv');
  if (!extensaoCsv) {
    definirMensagemUpload('O arquivo selecionado precisa ter extensao .csv.', true);
    return;
  }

  const formData = new FormData();
  formData.append('arquivoCsv', arquivo);

  botaoEnviarCsv.disabled = true;
  definirMensagemUpload('Enviando CSV...');

  try {
    const resposta = await fetch('/api/upload-csv', {
      method: 'POST',
      body: formData
    });
    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.detalhe || 'Nao foi possivel enviar o CSV.');
    }

    definirMensagemUpload(resultado.mensagem);
    atualizarDetalhesUpload(resultado);
    primeiraCarga = true;
    await carregarVisualizacao();
  } catch (error) {
    definirMensagemUpload(error.message, true);
    uploadDetalhes.classList.add('oculto');
    console.error(error);
  } finally {
    botaoEnviarCsv.disabled = false;
  }
}

async function carregarQuadtree() {
  const profundidadeMaxima = sincronizarProfundidadeComZoom();
  const parametros = new URLSearchParams({
    capacidade: document.querySelector('#capacidade').value,
    profundidadeMaxima
  });
  const indicador = obterIndicador();
  if (indicador) parametros.set('indicador', indicador);

  const resposta = await fetch(`/api/quadtree?${parametros.toString()}`);
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.detalhe || 'Erro ao carregar a Quadtree.');

  profundidadeQuadtreeAtual = dados.metadata.profundidadeMaximaUsada;

  limparCamadas();
  desenharNo(dados.quadtree, dados.metadata);
  atualizarLegenda(dados.metadata.valorMinimo, dados.metadata.valorMaximo);
  atualizarResumo(
    'Pontos',
    dados.metadata.totalPontos,
    'Quadrantes',
    dados.metadata.quantidadeTotalQuadrantes
  );

  const limites = dados.quadtree.limites;
  return {
    mensagem:
      `${dados.metadata.quantidadeTotalQuadrantes} quadrantes exibidos ` +
      `na profundidade ${dados.metadata.profundidadeMaximaUsada}.`,
    bounds: [
      [limites.minLatitude, limites.minLongitude],
      [limites.maxLatitude, limites.maxLongitude]
    ]
  };
}

function criarPopupMunicipio(municipio) {
  return `
    <strong>${municipio.municipio}</strong><br>
    Quantidade de registros: ${municipio.quantidade}<br>
    Soma: ${formatarNumero(municipio.soma)}<br>
    Media: ${formatarNumero(municipio.media)}<br>
    Minimo: ${formatarNumero(municipio.minimo)}<br>
    Maximo: ${formatarNumero(municipio.maximo)}
  `;
}

async function carregarMunicipios() {
  const parametros = new URLSearchParams();
  const indicador = obterIndicador();
  if (indicador) parametros.set('indicador', indicador);

  const query = parametros.toString();
  const resposta = await fetch(`/api/municipios${query ? `?${query}` : ''}`);
  const municipios = await resposta.json();
  if (!resposta.ok) throw new Error(municipios.detalhe || 'Erro ao carregar municipios.');

  limparCamadas();
  const medias = municipios.map((municipio) => municipio.media);
  const minimo = Math.min(...medias);
  const maximo = Math.max(...medias);
  const bounds = [];

  municipios.forEach((municipio) => {
    const coordenada = [municipio.latitude, municipio.longitude];
    bounds.push(coordenada);

    // O raio cresce com a quantidade de registros, mantendo um minimo visivel.
    const circulo = L.circleMarker(coordenada, {
      radius: Math.min(18, 7 + Math.sqrt(municipio.quantidade) * 2),
      color: '#173b57',
      weight: 1,
      fillColor: obterCor(municipio.media, minimo, maximo),
      fillOpacity: 0.8
    });

    circulo.bindPopup(criarPopupMunicipio(municipio));
    circulo.addTo(camadaMunicipios);
  });

  atualizarLegenda(minimo, maximo);
  atualizarResumo(
    'Municipios',
    municipios.length,
    'Registros',
    municipios.reduce((total, municipio) => total + municipio.quantidade, 0)
  );

  return { mensagem: `${municipios.length} municipios exibidos.`, bounds };
}

function criarPopupPonto(ponto) {
  return `
    <strong>${ponto.municipio}</strong><br>
    CEP: ${ponto.cep || 'Nao informado'}<br>
    Indicador: ${ponto.indicador}<br>
    Valor: ${formatarNumero(ponto.valor)}<br>
    Quantidade: ${formatarNumero(ponto.quantidade)}<br>
    Latitude: ${formatarNumero(ponto.latitude)}<br>
    Longitude: ${formatarNumero(ponto.longitude)}
  `;
}

async function carregarPontos() {
  const parametros = new URLSearchParams();
  const indicador = obterIndicador();
  const municipio = document.querySelector('#municipio').value.trim();
  const valorMin = document.querySelector('#valor-min').value;
  const valorMax = document.querySelector('#valor-max').value;

  if (indicador) parametros.set('indicador', indicador);
  if (municipio) parametros.set('municipio', municipio);
  if (valorMin !== '') parametros.set('valorMin', valorMin);
  if (valorMax !== '') parametros.set('valorMax', valorMax);

  const query = parametros.toString();
  const resposta = await fetch(`/api/pontos${query ? `?${query}` : ''}`);
  const pontos = await resposta.json();
  if (!resposta.ok) throw new Error(pontos.detalhe || 'Erro ao carregar pontos.');

  limparCamadas();

  if (pontos.length === 0) {
    atualizarLegenda(null, null);
    atualizarResumo('Pontos', 0, 'Municipios', 0);
    return { mensagem: 'Nenhum ponto encontrado para os filtros informados.', bounds: [] };
  }

  const valores = pontos.map((ponto) => ponto.valor);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const municipios = new Set();
  const bounds = [];

  pontos.forEach((ponto) => {
    const coordenada = [ponto.latitude, ponto.longitude];
    const intervalo = maximo - minimo;
    const proporcao = intervalo === 0 ? 1 : (ponto.valor - minimo) / intervalo;
    const raio = 6 + Math.max(0, Math.min(1, proporcao)) * 10;

    bounds.push(coordenada);
    municipios.add(ponto.municipio);

    // Cor e tamanho representam o valor estatistico do registro individual.
    const circulo = L.circleMarker(coordenada, {
      radius: raio,
      color: '#173b57',
      weight: 1,
      fillColor: obterCor(ponto.valor, minimo, maximo),
      fillOpacity: 0.82
    });

    circulo.bindPopup(criarPopupPonto(ponto));
    circulo.addTo(camadaPontos);
  });

  atualizarLegenda(minimo, maximo);
  atualizarResumo('Pontos', pontos.length, 'Municipios', municipios.size);
  return { mensagem: `${pontos.length} pontos exibidos.`, bounds };
}

function criarPopupConcentracao(item) {
  return `
    <strong>${item.municipio}</strong><br>
    Total de registros: ${item.totalRegistros}<br>
    Soma dos valores: ${formatarNumero(item.somaValores)}<br>
    Media dos valores: ${formatarNumero(item.mediaValores)}<br>
    Intensidade: ${formatarNumero(item.intensidadeConcentracao)}
  `;
}

async function carregarConcentracao() {
  const criterio = document.querySelector('#criterio-concentracao').value;
  const parametros = new URLSearchParams({ criterio });
  const indicador = obterIndicador();
  if (indicador) parametros.set('indicador', indicador);

  const resposta = await fetch(`/api/concentracao?${parametros.toString()}`);
  const concentracoes = await resposta.json();
  if (!resposta.ok) {
    throw new Error(concentracoes.detalhe || 'Erro ao carregar concentracao.');
  }

  limparCamadas();
  const intensidades = concentracoes.map((item) => item.intensidadeConcentracao);
  const medias = concentracoes.map((item) => item.mediaValores);
  const intensidadeMinima = Math.min(...intensidades);
  const intensidadeMaxima = Math.max(...intensidades);
  const mediaMinima = Math.min(...medias);
  const mediaMaxima = Math.max(...medias);
  const bounds = [];

  concentracoes.forEach((item) => {
    const coordenada = [item.latitude, item.longitude];
    const intervalo = intensidadeMaxima - intensidadeMinima;
    const proporcao =
      intervalo === 0
        ? 0.5
        : (item.intensidadeConcentracao - intensidadeMinima) / intervalo;

    // A raiz quadrada reduz diferencas extremas sem perder a ordem dos valores.
    const raio = 8 + Math.sqrt(Math.max(0, Math.min(1, proporcao))) * 22;
    const circulo = L.circleMarker(coordenada, {
      radius: raio,
      color: '#8b2f20',
      weight: 1.5,
      fillColor: obterCor(item.mediaValores, mediaMinima, mediaMaxima),
      fillOpacity: 0.55
    });

    bounds.push(coordenada);
    circulo.bindPopup(criarPopupConcentracao(item));
    circulo.addTo(camadaConcentracao);
  });

  atualizarLegenda(mediaMinima, mediaMaxima);
  atualizarResumo(
    'Municipios',
    concentracoes.length,
    'Registros',
    concentracoes.reduce((total, item) => total + item.totalRegistros, 0)
  );

  const descricao =
    criterio === 'soma'
      ? 'O raio representa a soma dos valores de cada municipio.'
      : 'O raio representa a quantidade de registros de cada municipio.';
  document.querySelector('#descricao-concentracao').textContent = descricao;

  return { mensagem: `${concentracoes.length} concentracoes exibidas.`, bounds };
}

async function carregarVisualizacao() {
  botaoRecarregar.disabled = true;
  mensagem.textContent = 'Carregando visualizacao...';
  mensagem.classList.remove('erro');

  try {
    let resultado;
    if (seletorModo.value === 'municipios') {
      resultado = await carregarMunicipios();
    } else if (seletorModo.value === 'pontos') {
      resultado = await carregarPontos();
    } else if (seletorModo.value === 'concentracao') {
      resultado = await carregarConcentracao();
    } else {
      resultado = await carregarQuadtree();
    }

    apiStatus.textContent = 'API conectada';
    apiStatus.classList.remove('erro');
    apiStatus.classList.add('ok');
    mensagem.textContent = resultado.mensagem;

    if (primeiraCarga && resultado.bounds.length > 0) {
      map.fitBounds(resultado.bounds, { padding: [20, 20] });
      primeiraCarga = false;
    }
  } catch (error) {
    apiStatus.textContent = 'API indisponivel';
    apiStatus.classList.remove('ok');
    apiStatus.classList.add('erro');
    mensagem.textContent = error.message;
    mensagem.classList.add('erro');
    console.error(error);
  } finally {
    botaoRecarregar.disabled = false;
  }
}

seletorModo.addEventListener('change', () => {
  const exibirQuadtree = seletorModo.value === 'quadtree';
  const exibirPontos = seletorModo.value === 'pontos';
  const exibirConcentracao = seletorModo.value === 'concentracao';
  controlesQuadtree.classList.toggle('oculto', !exibirQuadtree);
  controlesPontos.classList.toggle('oculto', !exibirPontos);
  controlesConcentracao.classList.toggle('oculto', !exibirConcentracao);
  legendaConcentracao.classList.toggle('oculto', !exibirConcentracao);
  carregarVisualizacao();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  carregarVisualizacao();
});

uploadForm.addEventListener('submit', enviarCsv);

const atualizarQuadtreeNoZoom = debounce(() => {
  if (seletorModo.value !== 'quadtree') return;

  const novaProfundidade = sincronizarProfundidadeComZoom();

  // Permanecer na mesma faixa de zoom nao muda o nivel de detalhe da arvore.
  if (novaProfundidade === profundidadeQuadtreeAtual) return;

  carregarVisualizacao();
}, 400);

// zoomend ocorre depois que a animacao termina, evitando atualizacoes intermediarias.
map.on('zoomend', atualizarQuadtreeNoZoom);

sincronizarProfundidadeComZoom();
carregarVisualizacao();
