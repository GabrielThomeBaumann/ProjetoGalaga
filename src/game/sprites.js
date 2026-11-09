// Imagens do jogo.
// Coloque os arquivos em src/assets/sprites/ com estes nomes (qualquer extensão:
// png, jpg, jpeg, webp, gif ou svg):
//   player.png        -> nave do jogador
//   enemy.png         -> inimigo
//   player-bullet.png -> tiro do jogador
//   enemy-bullet.png  -> tiro do inimigo
// Se não achar nada lá, tenta public/images/player.png e public/images/enemy.png.
// Se nenhum existir, o jogo desenha o triângulo antigo.

const BASE = import.meta.env.BASE_URL;

// O Vite lista os arquivos existentes na pasta (sem erro se estiver vazia).
const assets = import.meta.glob('../assets/sprites/*.{png,jpg,jpeg,webp,gif,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

function findAsset(name) {
  for (const [path, url] of Object.entries(assets)) {
    const file = path.split('/').pop().toLowerCase();
    if (file.startsWith(`${name}.`)) return url;
  }
  return null;
}

const sprites = {};
const ready = {};

function load(name) {
  const src = findAsset(name) ?? `${BASE}images/${name}.png`;
  const img = new Image();
  img.onload = () => {
    ready[name] = true;
  };
  img.onerror = () => {
    console.warn(`[sprites] Não consegui carregar "${name}" em: ${src}`);
  };
  img.src = src;
  sprites[name] = img;
}

if (typeof Image !== 'undefined') {
  load('player');
  load('enemy');
  load('player-bullet');
  load('enemy-bullet');
}

/** Retorna a imagem pronta para desenhar, ou null se ainda não carregou / não existe. */
export function getSprite(name) {
  return ready[name] ? sprites[name] : null;
}

/** URL da imagem (para usar em <img>), mesmo antes de ela terminar de carregar. */
export function getSpriteUrl(name) {
  return sprites[name]?.src ?? null;
}