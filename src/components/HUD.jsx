import styles from './HUD.module.css';

export default function HUD({ score, lives, onExit }) {
  return (
    <div className={styles.hud}>
      <span>Score: {score}</span>
      <span>Vidas: {lives}</span>
      <button type="button" className={styles.exit} onClick={onExit}>
        Sair
      </button>
    </div>
  );
}