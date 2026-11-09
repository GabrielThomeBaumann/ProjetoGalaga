// Imagens do jogo. Coloque os arquivos em public/images/:
//   player.png  -> nave do jogador
//   enemy.png   -> inimigo
// Se um arquivo não existir, o jogo desenha o triângulo antigo no lugar.

const BASE = import.meta.env.BASE_URL;

const SOURCES = {
  player: `${BASE}images/player.png`,
  enemy: `${BASE}images/enemy.png`,
};

const sprites = {};

if (typeof Image !== 'undefined') {
  for (const [name, src] of Object.entries(SOURCES)) {
    const img = new Image();
    img.src = src;
    sprites[name] = img;
  }
}

/** Retorna a imagem pronta para desenhar, ou null se ainda não carregou / não existe. */
export function getSprite(name) {
  const img = sprites[name];
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}