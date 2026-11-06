import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameCanvas from '../components/GameCanvas';
import HUD from '../components/HUD';
import { PLAYER_LIVES } from '../game/constants';
import { useGame } from '../game/useGame';
import styles from './GamePage.module.css';

const INITIAL_HUD = {
  score: 0,
  lives: PLAYER_LIVES,
  status: 'playing',
};

export default function GamePage() {
  const navigate = useNavigate();
  const [hud, setHud] = useState(INITIAL_HUD);

  const handleHudChange = useCallback((snapshot) => {
    setHud(snapshot);
  }, []);

  const { canvasRef, restart } = useGame({ onHudChange: handleHudChange });

  const overlay =
    hud.status === 'playing' ? null : (
      <div className={styles.overlay}>
        <h2 className={hud.status === 'won' ? styles.win : styles.lose}>
          {hud.status === 'won' ? 'VITÓRIA!' : 'GAME OVER'}
        </h2>
        <p>Score final: {hud.score}</p>
        <button type="button" className={styles.button} onClick={restart}>
          Reiniciar
        </button>
      </div>
    );

  return (
    <section className={styles.page}>
      <HUD
        score={hud.score}
        lives={hud.lives}
        onExit={() => navigate('/')} // antes: '/login'
      />
      <GameCanvas ref={canvasRef} overlay={overlay} />
      <p className={styles.help}>← → / A D: mover · Espaço: atirar</p>
    </section>
  );
}