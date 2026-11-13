import { useState } from 'react';
import { getSpriteUrl } from '../game/sprites';
import styles from './HUD.module.css';

function formatScore(value) {
  return String(value).padStart(2, '0'); // "00" no início, como no original
}

// Ícone de vida: usa a imagem da nave (player); se não existir, um triângulo.
function LifeIcon() {
  const [failed, setFailed] = useState(false);
  const src = getSpriteUrl('player');

  if (failed || !src) {
    return <span className={styles.lifeFallback} aria-hidden="true" />;
  }
  return (
    <img
      className={styles.lifeIcon}
      src={src}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

export default function HUD({ score, highScore, lives }) {
  return (
    <aside className={styles.hud}>
      <div className={styles.block}>
        <div className={styles.label}>HIGH</div>
        <div className={styles.label}>SCORE</div>
        <div className={styles.value}>{formatScore(highScore)}</div>
      </div>

      <div className={styles.block}>
        <div className={styles.label}>1UP</div>
        <div className={styles.value}>{formatScore(score)}</div>
      </div>

      <div className={styles.lives} aria-label={`Vidas: ${lives}`}>
        {Array.from({ length: lives }, (_, i) => (
          <LifeIcon key={i} />
        ))}
      </div>
    </aside>
  );
}