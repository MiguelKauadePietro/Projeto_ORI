# Utilizacao de Quadtree para Mapeamento de Dados Estatisticos em Nivel Estadual

Projeto academico desenvolvido para a disciplina de **Organizacao e Recuperacao
da Informacao (ORI)**. A aplicacao permite carregar dados estatisticos de um
arquivo CSV e representa-los em um mapa interativo do estado de Sao Paulo.

## Integrantes

- Nome do integrante 1 - RA: __________
- Nome do integrante 2 - RA: __________
- Nome do integrante 3 - RA: __________

> Substitua os campos acima pelos nomes e registros academicos da equipe.

## Objetivo

O objetivo do projeto e demonstrar a aplicacao de uma **Quadtree** na
organizacao, agregacao e recuperacao de dados georreferenciados. O sistema
permite analisar informacoes estatisticas em diferentes niveis de detalhe e
comparar a divisao espacial da Quadtree com agrupamentos por municipio, pontos
individuais e concentracoes de registros.

## Descricao da Aplicacao

A aplicacao le o arquivo `data/dados.csv` como base inicial, permite enviar um
novo CSV pela interface, normaliza os registros e disponibiliza os dados por
meio de uma API REST. O frontend utiliza Leaflet.js para exibir um mapa
interativo com zoom e pan.

O usuario pode alternar entre quatro modos de visualizacao:

- **Quadtree:** mostra os quadrantes gerados pela estrutura espacial.
- **Municipios:** agrupa os valores estatisticos pelo municipio.
- **Pontos:** mostra individualmente os registros por CEP ou coordenadas.
- **Concentracao:** destaca municipios com maior quantidade de registros ou
  maior soma de valores.

## Estrutura de Dados: Quadtree

A Quadtree e uma estrutura de dados em arvore utilizada para particionar um
espaco bidimensional. Cada no representa uma regiao retangular e pode possuir
quatro filhos:

1. Noroeste.
2. Nordeste.
3. Sudoeste.
4. Sudeste.

Cada registro do projeto e convertido em um ponto, no qual a longitude
representa o eixo horizontal e a latitude representa o eixo vertical.

### Funcionamento Simplificado

1. A raiz da arvore representa toda a area geografica dos dados.
2. Os pontos sao inseridos na raiz.
3. Quando um no ultrapassa sua capacidade, ele e dividido em quatro regioes.
4. Os pontos sao redistribuidos entre os filhos correspondentes.
5. O processo continua ate que os pontos caibam nos nos ou a profundidade
   maxima seja atingida.
6. Cada no calcula quantidade, soma, media, minimo e maximo dos valores sob sua
   responsabilidade.

A consulta espacial pode descartar rapidamente ramos que nao possuem intersecao
com a regiao pesquisada.

### Justificativa

Dados geograficos podem conter muitos registros distribuidos de forma desigual.
Renderizar todos os pontos e regioes com o mesmo nivel de detalhe pode causar
poluicao visual e processamento desnecessario.

A Quadtree foi escolhida porque:

- organiza os dados de acordo com sua posicao geografica;
- subdivide com maior detalhe as regioes que necessitam;
- permite consultas por regiao sem percorrer toda a base;
- reduz a quantidade de elementos exibidos em zooms distantes;
- possibilita aumentar a resolucao quando o usuario aproxima o mapa;
- permite calcular estatisticas agregadas por quadrante.

## Tecnologias Utilizadas

- **Node.js:** ambiente de execucao do backend.
- **Express:** servidor HTTP e definicao da API REST.
- **JavaScript:** implementacao do backend, frontend e Quadtree.
- **Leaflet.js:** mapa, zoom, pan, retangulos, marcadores e circulos.
- **csv-parser:** leitura e conversao do arquivo CSV.
- **Multer:** recebimento de arquivos CSV enviados pelo frontend.
- **CSV:** armazenamento inicial dos dados estatisticos.
- **OpenStreetMap:** camada cartografica de fundo.
- **Nodemon:** reinicializacao do servidor durante o desenvolvimento.

D3.js e Plotly.js nao sao utilizados na versao atual. As escalas de cores e
tamanhos foram implementadas diretamente em JavaScript e aplicadas pelo
Leaflet.js.

## Funcionalidades

- Leitura do arquivo CSV no backend.
- Upload de CSV pela interface web.
- Uso automatico do CSV enviado mais recentemente.
- Fallback para `data/dados.csv` quando nenhum upload foi feito.
- Normalizacao de cabecalhos, CEPs e valores numericos.
- Descarte de registros invalidos.
- Filtro por indicador.
- Visualizacao agregada por municipio.
- Visualizacao individual por CEP ou coordenadas.
- Filtros de pontos por municipio, indicador e faixa de valor.
- Visualizacao de concentracao por quantidade ou soma.
- Construcao configuravel da Quadtree.
- Estatisticas por no: quantidade, soma, media, minimo e maximo.
- Retangulos coloridos conforme a media estatistica.
- Popups com informacoes dos quadrantes e registros.
- Zoom e pan no mapa.
- Atualizacao da profundidade da Quadtree conforme o zoom.
- Debounce para evitar requisicoes excessivas durante o zoom.

## Resolucao Dinamica

O frontend converte o zoom do Leaflet em profundidade maxima da Quadtree:

| Zoom do mapa | Profundidade maxima |
|---|---:|
| Ate 7 | 3 |
| De 8 a 11 | 5 |
| Acima de 11 | 7 |

Em um zoom distante, poucos quadrantes representam uma area extensa. Quando o
usuario aproxima o mapa, uma arvore mais profunda permite quadrantes menores e
maior nivel de detalhe. O evento `zoomend` utiliza debounce de 400 ms e somente
faz uma nova requisicao quando a faixa de profundidade muda.

## Estrutura do Projeto

```text
projeto_ORI/
├── backend/
│   ├── server.js
│   ├── src/
│   │   ├── app.js
│   │   ├── routes/
│   │   │   └── apiRoutes.js
│   │   ├── services/
│   │   │   ├── csvService.js
│   │   │   ├── dadosService.js
│   │   │   ├── municipioService.js
│   │   │   ├── pontoService.js
│   │   │   ├── concentracaoService.js
│   │   │   └── quadtreeService.js
│   │   └── structures/
│   │       └── Quadtree.js
│   └── tests/
├── data/
│   └── dados.csv
├── uploads/
│   └── .gitkeep
├── frontend/
│   ├── index.html
│   ├── css/styles.css
│   └── js/main.js
├── package.json
└── README.md
```

## Como Executar

### Pre-requisitos

- Node.js 18 ou superior.
- npm.
- Conexao com a internet para carregar Leaflet e os mapas do OpenStreetMap.

### Instalacao

```bash
npm install
```

### Ambiente de desenvolvimento

```bash
npm run dev
```

A aplicacao estara disponivel em:

```text
http://localhost:3000
```

### Execucao sem Nodemon

```bash
npm start
```

### Testes

```bash
npm test
```

## Formato do CSV

O arquivo padrao fica em `data/dados.csv`. Pela interface web, tambem e
possivel enviar um novo arquivo `.csv`; nesse caso, o backend salva o arquivo em
`uploads/` e as visualizacoes passam a usar o CSV enviado mais recentemente.

O CSV deve utilizar, no minimo, as seguintes colunas:

```csv
municipio,cep,latitude,longitude,indicador,valor,quantidade
```

Exemplo:

```csv
municipio,cep,latitude,longitude,indicador,valor,quantidade
Sao Paulo,01001000,-23.5505,-46.6333,Indice de desenvolvimento,82.5,120
Campinas,13010000,-22.9056,-47.0608,Indice de desenvolvimento,79.3,85
```

| Campo | Descricao |
|---|---|
| `municipio` | Obrigatoria. Nome do municipio associado ao registro. |
| `cep` | Opcional. CEP mantido como texto para preservar zeros a esquerda. |
| `latitude` | Obrigatoria. Coordenada geografica entre -90 e 90. |
| `longitude` | Obrigatoria. Coordenada geografica entre -180 e 180. |
| `indicador` | Obrigatoria. Categoria ou indicador estatistico. |
| `valor` | Obrigatoria. Valor numerico utilizado nas estatisticas. |
| `quantidade` | Obrigatoria. Quantidade ou frequencia associada ao registro. |

Os nomes das colunas sao normalizados pelo backend. Por isso, diferencas de
maiusculas, minusculas, espacos e acentos sao aceitas. Por exemplo,
`Município`, `MUNICIPIO` e `municipio` sao tratados como a mesma coluna.

Linhas com coordenadas invalidas, valores numericos invalidos ou campos
obrigatorios vazios sao ignoradas. Depois do upload, a tela informa quantas
linhas foram lidas, quantos registros validos foram carregados, quantos foram
ignorados, quais colunas foram encontradas e mostra uma previa dos primeiros
registros validos.

## Upload de CSV

1. Execute a aplicacao com `npm run dev` ou `npm start`.
2. Acesse `http://localhost:3000`.
3. No painel lateral, use a area **Arquivo CSV**.
4. Selecione um arquivo com extensao `.csv`.
5. Clique em **Enviar CSV**.

Quando o upload e concluido com sucesso, o mapa e recarregado automaticamente no
modo de visualizacao atual. As rotas `GET /api/dados`, `GET /api/quadtree`,
`GET /api/municipios`, `GET /api/pontos` e `GET /api/concentracao` passam a
usar o CSV enviado mais recentemente.

Se nenhum upload tiver sido feito, todas as rotas continuam usando
`data/dados.csv`. Nao ha banco de dados nesta versao; os arquivos enviados ficam
armazenados em `uploads/`.

O upload afeta diretamente a Quadtree e as visualizacoes:

- **Quadtree:** os quadrantes sao reconstruidos com os registros validos do CSV
  atual.
- **Municipios:** as agregacoes por municipio sao recalculadas.
- **Pontos:** somente pontos com coordenadas validas sao exibidos.
- **Concentracao:** as intensidades por municipio sao recalculadas pelo criterio
  selecionado.

Os cabecalhos sao normalizados para letras minusculas e sem acentos. Campos
numericos sao convertidos para `Number`. Linhas invalidas sao ignoradas.

## Endpoints da API

### Verificacao do servidor

```http
GET /api/health
```

Retorna o estado do backend.

### Dados normalizados

```http
GET /api/dados
```

Retorna os registros validos do CSV e informacoes sobre linhas ignoradas.

### Quadtree

```http
GET /api/quadtree
```

Parametros opcionais:

| Parametro | Descricao | Padrao |
|---|---|---:|
| `capacidade` | Quantidade maxima de pontos por no. | 4 |
| `profundidadeMaxima` | Limite de profundidade da arvore. | 8 |
| `indicador` | Filtra os registros por indicador. | Todos |

Exemplo:

```http
GET /api/quadtree?capacidade=2&profundidadeMaxima=5&indicador=Indice%20de%20desenvolvimento
```

A resposta possui `metadata` e `quadtree`. Os metadados informam total de
pontos, configuracao usada, quantidade de quadrantes, minimo e maximo. A arvore
contem limites, profundidade, estatisticas e filhos de cada no.

### Municipios

```http
GET /api/municipios?indicador=Indice%20de%20desenvolvimento
```

Agrupa os registros por municipio e retorna quantidade, soma, media, minimo,
maximo e coordenadas medias.

### Pontos

```http
GET /api/pontos
```

Parametros opcionais:

- `indicador`;
- `municipio`;
- `valorMin`;
- `valorMax`.

Exemplo:

```http
GET /api/pontos?municipio=Sao%20Carlos&valorMin=70&valorMax=90
```

### Concentracao

```http
GET /api/concentracao
```

Parametros opcionais:

| Parametro | Descricao | Padrao |
|---|---|---|
| `indicador` | Filtra por indicador. | Todos |
| `criterio` | Define a intensidade como `quantidade` ou `soma`. | `quantidade` |

Exemplo:

```http
GET /api/concentracao?criterio=soma
```

