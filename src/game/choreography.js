// Coreografia dos inimigos (inspirada no Galaga arcade de 1981).
//
// Tudo aqui é DADO + funções puras de geometria; o engine só consome.
//
// ESPAÇO VIRTUAL: os caminhos são escritos em 224x288 (proporção da tela do arcade,
// em pé) e mapeados para o canvas com escala uniforme, centralizado. Pontos fora
// de 0..224 em X ficam fora da área "arcade", mas ainda dentro do canvas largo;
// por isso entradas laterais começam em X = -130 / 354 (fora do canvas de 800px).
//
// FIDELIDADE: composição das ondas (5 x 8), formação 4/16/20 e a regra de
// "entrada -> formação -> mergulho só depois de todos formados" vêm de fontes
// textuais. A FORMA exata de cada curva é APROXIMADA (não havia dados de ROM);
// ajuste os arrays CURVES / padrões abaixo se tiver referência melhor.

import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants';

/* ----------------------------- Espaço virtual ----------------------------- */

export const VIRTUAL_W = 224;
export const VIRTUAL_H = 288;
const SCALE = CANVAS_HEIGHT / VIRTUAL_H;
const OFFSET_X = (CANVAS_WIDTH - VIRTUAL_W * SCALE) / 2;

const toCanvasPoint = ([x, y]) => [OFFSET_X + x * SCALE, y * SCALE];

/* ----------------------------- Bézier + arco ----------------------------- */

function cubic(p0, c1, c2, p1, t) {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0],
    a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1],
  ];
}

const SAMPLES_PER_SEGMENT = 28;

/**
 * Converte segmentos Bézier cúbicos [[p0,c1,c2,p1], ...] em um caminho
 * parametrizado por comprimento de arco (velocidade constante, como no arcade).
 */
export function buildPath(segments) {
  const pts = [];
  let d = 0;
  for (const [p0, c1, c2, p1] of segments) {
    for (let i = 0; i <= SAMPLES_PER_SEGMENT; i++) {
      if (i === 0 && pts.length) continue;
      const [x, y] = cubic(p0, c1, c2, p1, i / SAMPLES_PER_SEGMENT);
      const prev = pts[pts.length - 1];
      if (prev) d += Math.hypot(x - prev.x, y - prev.y);
      pts.push({ x, y, d });
    }
  }
  return { pts, total: d };
}

/** Amostra posição e tangente (unitária) a `dist` px do início do caminho. */
export function samplePath(path, dist, out = { x: 0, y: 0, tx: 0, ty: 1 }) {
  const { pts, total } = path;
  const dd = Math.min(Math.max(dist, 0), total);
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].d <= dd) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const u = (dd - a.d) / (b.d - a.d || 1);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  out.x = a.x + (b.x - a.x) * u;
  out.y = a.y + (b.y - a.y) * u;
  out.tx = (b.x - a.x) / len;
  out.ty = (b.y - a.y) / len;
  return out;
}

export function cubicPoint(p0, c1, c2, p1, t) {
  return cubic(p0, c1, c2, p1, t);
}

/** Catmull-Rom -> Bézier: curva suave passando por todos os pontos. */
export function smoothThrough(points) {
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    segs.push([
      p1,
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    ]);
  }
  return segs;
}

/* ----------------------------- Curvas de entrada ----------------------------- */
// chain([x0,y0], [c1x,c1y,c2x,c2y,x1,y1], ...) — cada segmento começa onde o anterior terminou.

function chain(start, ...segs) {
  const out = [];
  let cur = start;
  for (const [a, b, c, d, e, f] of segs) {
    const end = [e, f];
    out.push([cur, [a, b], [c, d], end]);
    cur = end;
  }
  return out;
}

// Versões "esquerda"; a direita é o espelho em X.
const ENTRY_CURVES = {
  // Desce do topo, abre para a esquerda e faz um laço no meio da tela.
  TOP_LOOP: chain(
    [104, -20],
    [104, 36, 84, 70, 58, 96],
    [30, 124, 22, 176, 56, 188],
    [88, 198, 116, 168, 100, 138],
    [92, 120, 82, 108, 72, 106],
  ),
  // Entra pelo topo mais perto da borda e faz um laço fechado pelo lado.
  TOP_EDGE: chain(
    [170, -20],
    [170, 40, 196, 70, 192, 104],
    [188, 140, 156, 156, 134, 134],
    [118, 118, 126, 98, 140, 98],
  ),
  // Sobe pela lateral inferior, cruza a tela e faz um arco por cima.
  LOW_ARC: chain(
    [-130, 238],
    [-50, 256, 40, 256, 92, 222],
    [140, 190, 150, 130, 112, 112],
    [84, 98, 56, 118, 72, 148],
  ),
  // Varredura lateral alta em fila única, com laço no centro.
  SIDE_SWEEP: chain(
    [-130, 56],
    [-40, 34, 40, 34, 92, 66],
    [138, 94, 152, 142, 120, 160],
    [88, 178, 52, 150, 74, 118],
  ),
};

/* ----------------------------- Curvas de Challenging Stage ----------------------------- */
// Terminam FORA da tela: no Challenging Stage ninguém entra em formação.

const CHALLENGE_CURVES = {
  // Zigue-zague em cascata (entra pelo topo, sai pela direita embaixo).
  ZIGZAG: chain(
    [30, -20],
    [30, 50, 194, 40, 194, 104],
    [194, 160, 30, 150, 30, 214],
    [30, 262, 130, 276, 354, 262],
  ),
  // Desce, faz um laço grande e foge pela lateral.
  LOOP_DROP: chain(
    [112, -20],
    [112, 60, 168, 100, 146, 144],
    [124, 182, 68, 172, 74, 128],
    [80, 88, 154, 96, 164, 160],
    [172, 210, 260, 232, 354, 236],
  ),
  // Sobe pela lateral esquerda, passa por cima e sai pelo topo.
  ARC_UP: chain(
    [-130, 252],
    [-20, 274, 90, 232, 112, 150],
    [128, 80, 196, 56, 204, 104],
    [212, 152, 150, 196, 116, 160],
    [100, 134, 84, 40, 100, -60],
  ),
  // Onda larga cruzando a tela inteira.
  SIDE_WEAVE: chain(
    [-130, 120],
    [0, 52, 62, 52, 112, 118],
    [160, 184, 226, 184, 354, 112],
  ),
  // Círculo grande (entra pela direita, rodeia o centro e sai pela esquerda).
  BIG_CIRCLE: chain(
    [354, 40],
    [250, 36, 204, 62, 164, 104],
    [124, 146, 122, 206, 162, 214],
    [204, 224, 232, 172, 190, 130],
    [150, 90, 96, 98, -130, 230],
  ),
};

const pathCache = new Map();

/** Caminho (em px do canvas) de uma curva nomeada, opcionalmente espelhado. */
export function getCurve(name, mirror = false) {
  const key = `${name}:${mirror ? 'R' : 'L'}`;
  let path = pathCache.get(key);
  if (!path) {
    const virtual = ENTRY_CURVES[name] ?? CHALLENGE_CURVES[name];
    const segs = virtual.map((seg) =>
      seg.map(([x, y]) => toCanvasPoint([mirror ? VIRTUAL_W - x : x, y])),
    );
    path = buildPath(segs);
    pathCache.set(key, path);
  }
  return path;
}

/* ----------------------------- Formação (4 / 16 / 20) ----------------------------- */

export const SLOT_DX = 50;
export const SLOT_DY = 40;
export const SLOT_TOP = 64;
export const FORMATION_COLS = 10;

/** Centro (sem balanço/respiração) do slot da formação. */
export function slotCenter(row, col) {
  return {
    x: CANVAS_WIDTH / 2 + (col - (FORMATION_COLS - 1) / 2) * SLOT_DX,
    y: SLOT_TOP + row * SLOT_DY,
  };
}

// Composição das 5 ondas de 8 (como no arcade):
//  onda 1: 4 borboletas (vermelhas) + 4 abelhas (amarelas)  (topo, centro)
//  onda 2: 4 bosses + 4 borboletas                          (lateral inferior esquerda)
//  onda 3: 8 borboletas                                     (lateral inferior direita)
//  onda 4: 8 abelhas                                        (topo, direita)
//  onda 5: 8 abelhas                                        (topo, esquerda)
// Total: 4 bosses (linha 0), 16 borboletas (linhas 1-2), 20 abelhas (linhas 3-4).
// A ordem da lista é a ordem de saída: numa onda 'split', a 1ª metade forma uma
// coluna e a 2ª metade a outra (onda 1 = 4 vermelhas numa coluna, 4 amarelas na outra).
// OBS: a distribuição por slot dentro de cada onda é aproximada.
export const WAVE_COMPOSITION = [
  [
    { type: 'butterfly', row: 1, cols: [3, 4, 5, 6] },
    { type: 'bee', row: 3, cols: [4, 5] },
    { type: 'bee', row: 4, cols: [4, 5] },
  ],
  [
    { type: 'boss', row: 0, cols: [3, 4, 5, 6] },
    { type: 'butterfly', row: 1, cols: [1, 2, 7, 8] },
  ],
  [{ type: 'butterfly', row: 2, cols: [1, 2, 3, 4, 5, 6, 7, 8] }],
  [{ type: 'bee', row: 3, cols: [0, 1, 2, 3, 6, 7, 8, 9] }],
  [{ type: 'bee', row: 4, cols: [0, 1, 2, 3, 6, 7, 8, 9] }],
];

/* ----------------------------- Padrões de entrada ----------------------------- */
// Fileiras normais: FILA ÚNICA de 8 inimigos (uma coluna por vez); a onda seguinte só
// começa depois que a anterior terminou de entrar.
// mode 'split': DUAS colunas ao mesmo tempo, cada uma com 4 (1ª metade da lista numa
// coluna, 2ª metade na outra, espelhada). Só aparece em algumas ondas.
// mirror: usa a curva espelhada (direita) quando true.

export const ENTRY_PATTERNS = [
  // Padrão A (fase 1) — onda 1 em duas colunas de 4: 4 vermelhas + 4 amarelas.
  [
    { curve: 'TOP_LOOP', mode: 'split', mirror: false },
    { curve: 'LOW_ARC', mode: 'single', mirror: false },
    { curve: 'LOW_ARC', mode: 'single', mirror: true },
    { curve: 'TOP_EDGE', mode: 'single', mirror: true },
    { curve: 'TOP_EDGE', mode: 'single', mirror: false },
  ],
  // Padrão B — pelo topo, com as abelhas da onda 4 em duas colunas de 4.
  [
    { curve: 'TOP_LOOP', mode: 'single', mirror: false },
    { curve: 'TOP_LOOP', mode: 'single', mirror: true },
    { curve: 'TOP_EDGE', mode: 'single', mirror: false },
    { curve: 'TOP_EDGE', mode: 'split', mirror: false },
    { curve: 'TOP_LOOP', mode: 'single', mirror: false },
  ],
  // Padrão C — varreduras laterais, com a última onda em duas colunas de 4.
  [
    { curve: 'SIDE_SWEEP', mode: 'single', mirror: false },
    { curve: 'SIDE_SWEEP', mode: 'single', mirror: true },
    { curve: 'LOW_ARC', mode: 'single', mirror: false },
    { curve: 'LOW_ARC', mode: 'single', mirror: true },
    { curve: 'SIDE_SWEEP', mode: 'split', mirror: false },
  ],
];

// Challenging Stages: cada um com sua coreografia; 5 grupos de 8 (40 no total), sem formação.
// `kind` é o inimigo "comum" do estágio (4 bosses entram na onda 2, como no arcade).
// Cada Challenging Stage tem uma onda em duas colunas de 4 (mode 'split').
export const CHALLENGE_WAVE_SIZE = 8;
export const CHALLENGE_TOTAL = CHALLENGE_WAVE_SIZE * 5;

export const CHALLENGE_PATTERNS = [
  {
    kind: 'bee',
    waves: [
      { curve: 'ZIGZAG', mode: 'single', mirror: false },
      { curve: 'ZIGZAG', mode: 'single', mirror: true },
      { curve: 'LOOP_DROP', mode: 'single', mirror: false },
      { curve: 'LOOP_DROP', mode: 'single', mirror: true },
      { curve: 'SIDE_WEAVE', mode: 'split', mirror: false },
    ],
  },
  {
    kind: 'butterfly',
    waves: [
      { curve: 'ARC_UP', mode: 'single', mirror: false },
      { curve: 'ARC_UP', mode: 'single', mirror: true },
      { curve: 'SIDE_WEAVE', mode: 'split', mirror: true },
      { curve: 'BIG_CIRCLE', mode: 'single', mirror: false },
      { curve: 'BIG_CIRCLE', mode: 'single', mirror: true },
    ],
  },
  {
    kind: 'bee',
    waves: [
      { curve: 'BIG_CIRCLE', mode: 'single', mirror: false },
      { curve: 'ZIGZAG', mode: 'split', mirror: true },
      { curve: 'ARC_UP', mode: 'single', mirror: true },
      { curve: 'LOOP_DROP', mode: 'single', mirror: false },
      { curve: 'SIDE_WEAVE', mode: 'single', mirror: true },
    ],
  },
  {
    kind: 'butterfly',
    waves: [
      { curve: 'LOOP_DROP', mode: 'split', mirror: true },
      { curve: 'SIDE_WEAVE', mode: 'single', mirror: false },
      { curve: 'ARC_UP', mode: 'single', mirror: false },
      { curve: 'ZIGZAG', mode: 'single', mirror: true },
      { curve: 'BIG_CIRCLE', mode: 'single', mirror: false },
    ],
  },
];

// Bônus por onda inteira abatida (8 de 8) (1ª-2ª CS: 1000, 3ª-4ª: 1500, 5ª-6ª: 2000, 7ª em diante: 3000).
export const CHALLENGE_WAVE_BONUS = [1000, 1000, 1500, 1500, 2000, 2000, 3000];
export const CHALLENGE_PERFECT_BONUS = 10000;
export const CHALLENGE_KILL_SCORE = 100;

/* ----------------------------- Mergulhos (dives) ----------------------------- */

export const CAPTURE_Y = 300; // altura onde o Boss para para abrir o tractor beam

function mirrorAbout(x0, dir, pts) {
  return pts.map(([x, y]) => [x0 + dir * (x - x0), y]);
}

/**
 * Monta os segmentos (px do canvas, em coordenadas de CENTRO do sprite) de um mergulho.
 *  kind: 'bee' | 'butterfly' | 'boss' | 'capture' | 'exit'
 *  x0,y0: posição atual; dir: +1/-1 (lado da curva); tx: X do alvo (jogador).
 */
export function buildDiveSegments(kind, { x0, y0, dir, tx }) {
  const H = CANVAS_HEIGHT;
  const bottom = H + 70;

  if (kind === 'bee') {
    // ABELHA: sobe/abre e faz um laço circular (3/4 de círculo) antes de cair sobre o jogador.
    const R = 38;
    const cx = x0 + R;
    const cy = y0;
    const k = 0.5523 * R;
    // início no ponto da esquerda do círculo (ângulo 180°), sentido horário na tela.
    const arc = [
      [[x0, cy], [x0, cy - k], [cx - k, cy - R], [cx, cy - R]], // esquerda -> topo
      [[cx, cy - R], [cx + k, cy - R], [cx + R, cy - k], [cx + R, cy]], // topo -> direita
      [[cx + R, cy], [cx + R, cy + k], [cx + k, cy + R], [cx, cy + R]], // direita -> base
    ];
    const mirroredArc = arc.map((seg) => mirrorAbout(x0, dir, seg));
    // Fim do laço (base do círculo), já espelhado; ali a abelha segue para o lado -dir.
    const bx = x0 + dir * (cx - x0);
    const by = cy + R;
    const tail = [
      [bx, by],
      [bx - dir * 70, by + 6],
      [tx + (tx - bx) * 0.1, H - 220],
      [tx, bottom],
    ];
    return [...mirroredArc, tail];
  }

  if (kind === 'butterfly') {
    // BORBOLETA: zigue-zague descendente em direção ao jogador.
    const n = 4;
    const pts = [[x0, y0]];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const xmid = x0 + (tx - x0) * t;
      const swing = (i % 2 === 1 ? dir : -dir) * 92 * (1 - 0.15 * i);
      pts.push([xmid + swing, y0 + (bottom - y0) * t]);
    }
    return smoothThrough(pts);
  }

  if (kind === 'boss') {
    // BOSS: arco largo e lento em direção ao jogador.
    return smoothThrough([
      [x0, y0],
      [x0 + dir * 70, y0 + 54],
      [x0 + dir * 120, y0 + 150],
      [(x0 + tx) / 2, y0 + 270],
      [tx, H - 120],
      [tx + (tx > CANVAS_WIDTH / 2 ? -26 : 26), bottom],
    ]);
  }

  if (kind === 'capture') {
    // BOSS (tractor beam): desce em arco e para acima do jogador.
    return smoothThrough([
      [x0, y0],
      [x0 + dir * 70, y0 + 60],
      [x0 + (tx - x0) * 0.7, y0 + 150],
      [tx, CAPTURE_Y],
    ]);
  }

  // 'exit': saída reta/curva para fora da tela por baixo (Boss sem captura).
  return smoothThrough([
    [x0, y0],
    [x0 + dir * 40, y0 + 90],
    [x0 - dir * 30, H - 110],
    [x0, bottom],
  ]);
}