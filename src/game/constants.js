export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const COLORS = {
  background: '#000000',
  player: '#4dd0e1',
  playerBullet: '#ffeb3b',
  enemy: '#ef5350',
  enemyBullet: '#ff9800',
};

// Jogador
export const PLAYER_WIDTH = 48;
export const PLAYER_HEIGHT = 36;
export const PLAYER_SPEED = 320; // px/s
export const PLAYER_Y_MARGIN = 20;
export const PLAYER_LIVES = 3;
export const PLAYER_SHOOT_COOLDOWN_MS = 400;
export const PLAYER_HITBOX_WIDTH = 40;
export const PLAYER_HITBOX_HEIGHT = 30;

// Projéteis
export const PLAYER_BULLET_WIDTH = 10;
export const PLAYER_BULLET_HEIGHT = 32;
export const PLAYER_BULLET_SPEED = 520; // px/s (para cima)
export const ENEMY_BULLET_WIDTH = 10;
export const ENEMY_BULLET_HEIGHT = 28;
export const ENEMY_BULLET_SPEED = 240; // px/s (para baixo)

// Inimigos
export const ENEMY_COLS = 5;
export const ENEMY_ROWS = 4;
export const ENEMY_WIDTH = 40;
export const ENEMY_HEIGHT = 32;
export const ENEMY_GAP_X = 60;
export const ENEMY_GAP_Y = 20;
export const ENEMY_START_Y = 50;
export const ENEMY_DESCENT_SPEED = 12; // px/s
export const ENEMY_SWAY_AMPLITUDE = 70; // px
export const ENEMY_SWAY_FREQUENCY = 1.2; // rad/s
export const ENEMY_SHOOT_INTERVAL_MS = 1200;
export const ENEMY_KILL_SCORE = 10;

// Controle de Fases
export const CHALLENGE_STAGE_FREQUENCY = 3; // A cada 3 fases, uma é Challenge
export const MAX_STAGE = 6;

// Controle de Entrada (Acrobacias)
export const ENTRY_DURATION_MS = 3500; // Tempo que leva para fazer a curva e entrar na formação
export const FORMATION_SWAY_SPEED = 1.0; // Velocidade do zigue-zague na formação
export const FORMATION_DESCENT_SPEED = 5; // Velocidade que a formação desce

// Bônus de vitória
export const WIN_LIFE_BONUS = 500; // por vida restante
export const WIN_TIME_BONUS_MAX = 3000; // bônus máximo de tempo
export const WIN_TIME_FAST_S = 90; // até aqui: bônus máximo
export const WIN_TIME_SLOW_S = 360; // a partir daqui: bônus zero

// Tipos de inimigo (coreografia estilo Galaga arcade)
// - bee (abelha, amarela): corpo oval e asas pequenas; mergulha fazendo um laço circular
// - butterfly (borboleta, vermelha): asas largas; mergulha em zigue-zague
// - boss (Boss Galaga): 2 de vida, leva escoltas e pode abrir o tractor beam
export const ENEMY_TYPES = {
  bee: {
    hp: 1,
    scoreFormation: 50,
    scoreDive: 100,
    diveSpeed: 330, // px/s
    color: '#ffd54f', // amarela, asas azuis
    accent: '#4fc3f7',
    fireMarks: [0.55], // frações do mergulho em que atira
  },
  butterfly: {
    hp: 1,
    scoreFormation: 80,
    scoreDive: 160,
    diveSpeed: 300,
    color: '#ef5350', // vermelha, asas largas
    accent: '#ffcdd2',
    fireMarks: [0.3, 0.62],
  },
  boss: {
    hp: 2,
    scoreFormation: 150,
    scoreDive: 400, // 800 com 1 escolta viva, 1600 com 2
    diveSpeed: 260,
    color: '#66bb6a', // verde, com chifres
    accent: '#ffd54f',
    hitColor: '#7e57c2', // cor depois do primeiro tiro
    fireMarks: [0.4],
  },
};

// Entrada e formação
export const ENTRY_SPEED = 400; // px/s no caminho de entrada
export const CHALLENGE_SPEED = 470; // px/s nos Challenging Stages
export const ENTRY_START_DELAY_MS = 600;
export const SINGLE_GAP_MS = 160; // fila indiana (espaço entre inimigos)
export const PAIR_GAP_MS = 150; // entre pares
export const PAIR_OFFSET = 16; // px de cada lado do caminho (pares lado a lado)
export const WAVE_SETTLE_MS = 400; // pausa entre o fim de uma onda e o início da próxima
export const CHALLENGE_WAVE_OVERLAP = 0.75; // Challenging Stage: próxima onda sai quando a anterior cumpriu 75% do caminho
export const FORMATION_SWAY_AMPLITUDE = 60; // px
export const FORMATION_SWAY_RATE = 0.9; // rad/s
export const FORMATION_BREATH_AMOUNT = 0.07; // +7% de expansão
export const FORMATION_BREATH_RATE = 1.1; // rad/s

// Mergulhos
export const FIRST_DIVE_DELAY_MS = 1000; // pausa depois que todos formaram
export const DIVE_BLEND_MS = 450; // escolta "entra" no caminho do Boss
export const ESCORT_LAG_PX = 38;
export const ESCORT_LANE_PX = 28;
export const BOSS_ATTACK_CHANCE = 0.4;
// Tractor beam só acontece em situação específica (não é sorteio):
// poucos inimigos vivos E pelo menos 2 inimigos VERMELHOS (borboletas) vivos.
export const CAPTURE_MAX_ENEMIES = 12;
export const CAPTURE_MIN_REDS = 2;

// Tractor beam (captura simplificada: custa 1 vida; resgatar o Boss devolve a vida)
export const BEAM_OPEN_MS = 350;
export const BEAM_DURATION_MS = 2400;
export const BEAM_TOP_HALF_WIDTH = 16;
export const BEAM_BOTTOM_HALF_WIDTH = 74;
export const RESCUE_SCORE = 1000;

// Nave dupla (upgrade ao resgatar a nave capturada): duas naves lado a lado,
// cada uma com seu tiro. Acertar a dupla desfaz o upgrade (não custa vida).
export const DUAL_GAP = 4; // px entre as duas naves
export const DUAL_WIDTH = PLAYER_WIDTH * 2 + DUAL_GAP;
export const DUAL_HITBOX_WIDTH = PLAYER_HITBOX_WIDTH * 2 + DUAL_GAP;
export const RESCUE_SPIN_MIN_S = 2.5; // a nave solta rodopia pelo menos isso
export const RESCUE_MAX_SPIN_S = 8; // limite: depois disso ela se encaixa mesmo com inimigos no ar
export const RESCUE_SPIN_RATE = 9; // rad/s
export const RESCUE_DOCK_S = 1.3; // tempo da descida até se encaixar ao lado do jogador
// true = só resgata se o Boss for abatido fora da formação (como no arcade);
// abatido na formação, a nave capturada se perde.
export const RESCUE_ONLY_OUTSIDE_FORMATION = true;