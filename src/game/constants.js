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
export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 30;
export const PLAYER_SPEED = 320; // px/s
export const PLAYER_Y_MARGIN = 20;
export const PLAYER_LIVES = 3;
export const PLAYER_SHOOT_COOLDOWN_MS = 500;

// Projéteis
export const PLAYER_BULLET_WIDTH = 4;
export const PLAYER_BULLET_HEIGHT = 14;
export const PLAYER_BULLET_SPEED = 520; // px/s (para cima)
export const ENEMY_BULLET_WIDTH = 4;
export const ENEMY_BULLET_HEIGHT = 12;
export const ENEMY_BULLET_SPEED = 240; // px/s (para baixo)

// Inimigos
export const ENEMY_COLS = 5;
export const ENEMY_ROWS = 4;
export const ENEMY_WIDTH = 36;
export const ENEMY_HEIGHT = 28;
export const ENEMY_GAP_X = 60;
export const ENEMY_GAP_Y = 20;
export const ENEMY_START_Y = 50;
export const ENEMY_DESCENT_SPEED = 12; // px/s
export const ENEMY_SWAY_AMPLITUDE = 70; // px
export const ENEMY_SWAY_FREQUENCY = 1.2; // rad/s
export const ENEMY_SHOOT_INTERVAL_MS = 1200;
export const ENEMY_KILL_SCORE = 10;