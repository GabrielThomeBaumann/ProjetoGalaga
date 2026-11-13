// Imagens do jogo.
// Coloque os arquivos em src/assets/sprites/ com estes nomes (qualquer extensão:
// png, jpg, jpeg, webp, gif ou svg):
//   player.png        -> nave do jogador
//   enemy.png         -> inimigo
//   player-bullet.png -> tiro do jogador
//   enemy-bullet.png  -> tiro do inimigo
//
// Versões opcionais para o TEMA CLARO (mesmo nome + "-light"):
//   player-light.png, enemy-light.png, player-bullet-light.png, enemy-bullet-light.png
// No tema claro, se a versão "-light" existir, ela é usada no lugar da normal.
//
// Se não achar nada em src/assets/sprites/, tenta public/images/<nome>.png.
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

function load(name, { optional = false } = {}) {
  const src = findAsset(name) ?? `${BASE}images/${name}.png`;
  const img = new Image();
  img.onload = () => {
    ready[name] = true;
  };
  img.onerror = () => {
    if (!optional) {
      console.warn(`[sprites] Não consegui carregar "${name}" em: ${src}`);
    }
  };
  img.src = src;
  sprites[name] = img;
}

const BASE_NAMES = ['player', 'enemy', 'player-bullet', 'enemy-bullet'];

if (typeof Image !== 'undefined') {
  for (const name of BASE_NAMES) {
    load(name);
    load(`${name}-light`, { optional: true }); // opcional: sem aviso se faltar
  }
}

function isLightTheme() {
  return document.documentElement.dataset.theme === 'light';
}

/** Retorna o nome da versão "-light" se estiver no tema claro e ela existir. */
function resolveName(name) {
  const lightName = `${name}-light`;
  if (isLightTheme() && ready[lightName]) return lightName;
  return name;
}

/** Retorna a imagem pronta para desenhar, ou null se ainda não carregou / não existe. */
export function getSprite(name) {
  const resolved = resolveName(name);
  return ready[resolved] ? sprites[resolved] : null;
}

/** URL da imagem (para usar em <img>), mesmo antes de ela terminar de carregar. */
export function getSpriteUrl(name) {
  const lightName = `${name}-light`;
  // No tema claro, usa a versão escura se ela existir (na pasta de sprites ou já carregada).
  if (isLightTheme() && (findAsset(lightName) || ready[lightName])) {
    return sprites[lightName]?.src ?? null;
  }
  return sprites[name]?.src ?? null;
}