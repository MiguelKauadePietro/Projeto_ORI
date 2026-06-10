/**
 * Um ponto espacial usa longitude no eixo X e latitude no eixo Y.
 * O campo data preserva as demais informacoes do registro original.
 */
class Point {
  constructor(longitude, latitude, data = {}) {
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      throw new TypeError('Latitude e longitude do ponto devem ser numeros validos.');
    }

    this.x = longitude;
    this.y = latitude;
    this.longitude = longitude;
    this.latitude = latitude;
    this.data = data;
    this.value = Number(data.valor ?? data.value);

    if (!Number.isFinite(this.value)) {
      throw new TypeError('O valor estatistico do ponto deve ser um numero valido.');
    }
  }

  toJSON() {
    return {
      longitude: this.longitude,
      latitude: this.latitude,
      ...this.data
    };
  }
}

/**
 * Retangulo geografico descrito pelos seus valores minimos e maximos.
 */
class Boundary {
  constructor(minLongitude, minLatitude, maxLongitude, maxLatitude) {
    const limites = [minLongitude, minLatitude, maxLongitude, maxLatitude];

    if (!limites.every(Number.isFinite)) {
      throw new TypeError('Os limites geograficos devem ser numeros validos.');
    }

    if (minLongitude >= maxLongitude || minLatitude >= maxLatitude) {
      throw new RangeError('Os limites minimos devem ser menores que os maximos.');
    }

    this.minLongitude = minLongitude;
    this.minLatitude = minLatitude;
    this.maxLongitude = maxLongitude;
    this.maxLatitude = maxLatitude;
  }

  get centerLongitude() {
    return (this.minLongitude + this.maxLongitude) / 2;
  }

  get centerLatitude() {
    return (this.minLatitude + this.maxLatitude) / 2;
  }

  contains(point) {
    return (
      point.longitude >= this.minLongitude &&
      point.longitude <= this.maxLongitude &&
      point.latitude >= this.minLatitude &&
      point.latitude <= this.maxLatitude
    );
  }

  intersects(other) {
    return !(
      other.minLongitude > this.maxLongitude ||
      other.maxLongitude < this.minLongitude ||
      other.minLatitude > this.maxLatitude ||
      other.maxLatitude < this.minLatitude
    );
  }

  toJSON() {
    return {
      minLongitude: this.minLongitude,
      minLatitude: this.minLatitude,
      maxLongitude: this.maxLongitude,
      maxLatitude: this.maxLatitude
    };
  }
}

class Quadtree {
  constructor(boundary, options = {}, depth = 0) {
    if (!(boundary instanceof Boundary)) {
      throw new TypeError('A Quadtree deve receber uma instancia de Boundary.');
    }

    const capacity = options.capacity ?? 4;
    const maxDepth = options.maxDepth ?? 8;

    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError('A capacidade deve ser um inteiro maior que zero.');
    }

    if (!Number.isInteger(maxDepth) || maxDepth < 0) {
      throw new RangeError('A profundidade maxima deve ser um inteiro nao negativo.');
    }

    this.boundary = boundary;
    this.capacity = capacity;
    this.maxDepth = maxDepth;
    this.depth = depth;
    this.points = [];
    this.children = [];

    // Estatisticas agregadas de todos os pontos contidos neste no e descendentes.
    this.count = 0;
    this.sum = 0;
    this.min = null;
    this.max = null;
  }

  get isDivided() {
    return this.children.length > 0;
  }

  get average() {
    return this.count === 0 ? null : this.sum / this.count;
  }

  insert(point) {
    if (!(point instanceof Point)) {
      throw new TypeError('Somente instancias de Point podem ser inseridas.');
    }

    if (!this.boundary.contains(point)) {
      return false;
    }

    // Folhas com espaco, ou na profundidade limite, armazenam o ponto diretamente.
    if (!this.isDivided && (this.points.length < this.capacity || this.depth >= this.maxDepth)) {
      this.points.push(point);
      this.updateStatistics(point.value);
      return true;
    }

    if (!this.isDivided) {
      this.subdivide();
    }

    const child = this.getChildForPoint(point);
    const inserted = child.insert(point);

    if (inserted) {
      this.updateStatistics(point.value);
    }

    return inserted;
  }

  /**
   * Divide o no em noroeste, nordeste, sudoeste e sudeste. Os pontos que
   * estavam na folha sao redistribuidos e deixam de ficar no no pai.
   */
  subdivide() {
    if (this.isDivided || this.depth >= this.maxDepth) {
      return;
    }

    const b = this.boundary;
    const midX = b.centerLongitude;
    const midY = b.centerLatitude;
    const childOptions = { capacity: this.capacity, maxDepth: this.maxDepth };

    this.children = [
      new Quadtree(new Boundary(b.minLongitude, midY, midX, b.maxLatitude), childOptions, this.depth + 1),
      new Quadtree(new Boundary(midX, midY, b.maxLongitude, b.maxLatitude), childOptions, this.depth + 1),
      new Quadtree(new Boundary(b.minLongitude, b.minLatitude, midX, midY), childOptions, this.depth + 1),
      new Quadtree(new Boundary(midX, b.minLatitude, b.maxLongitude, midY), childOptions, this.depth + 1)
    ];

    const previousPoints = this.points;
    this.points = [];

    // As estatisticas do pai ja incluem estes pontos; somente os filhos as calculam novamente.
    for (const point of previousPoints) {
      this.getChildForPoint(point).insert(point);
    }
  }

  getChildForPoint(point) {
    const east = point.longitude >= this.boundary.centerLongitude;
    const north = point.latitude >= this.boundary.centerLatitude;

    if (north && !east) return this.children[0];
    if (north && east) return this.children[1];
    if (!north && !east) return this.children[2];
    return this.children[3];
  }

  updateStatistics(value) {
    this.count += 1;
    this.sum += value;
    this.min = this.min === null ? value : Math.min(this.min, value);
    this.max = this.max === null ? value : Math.max(this.max, value);
  }

  /**
   * Retorna os pontos encontrados dentro de um retangulo de consulta.
   * Nos sem intersecao sao descartados sem visitar seus descendentes.
   */
  query(range, found = []) {
    if (!(range instanceof Boundary)) {
      throw new TypeError('A consulta deve receber uma instancia de Boundary.');
    }

    if (!this.boundary.intersects(range)) {
      return found;
    }

    for (const point of this.points) {
      if (range.contains(point)) {
        found.push(point);
      }
    }

    for (const child of this.children) {
      child.query(range, found);
    }

    return found;
  }

  toJSON() {
    return {
      limites: this.boundary.toJSON(),
      profundidade: this.depth,
      quantidadePontos: this.count,
      somaValores: Number(this.sum.toFixed(10)),
      mediaValores: this.average === null ? null : Number(this.average.toFixed(10)),
      minimoValor: this.min,
      maximoValor: this.max,
      filhos: this.children.map((child) => child.toJSON())
    };
  }
}

module.exports = { Point, Boundary, Quadtree };
