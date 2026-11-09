import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GameCanvas from '../components/GameCanvas';
import HUD from '../components/HUD';
import StarfieldBackground from '../components/StarfieldBackground';
import { PLAYER_LIVES } from '../game/constants';
import { getHighScore, saveHighScore } from '../game/highScore';
import { useGame } from '../game/useGame';
import styles from './GamePage.module.css';

const INITIAL_HUD = {
  score: 0,
  lives: PLAYER_LIVES,
  status: 'playing',
  stage: 1,
  isChallengeStage: false,
};

export default function GamePage() {
  const navigate = useNavigate();
  const [hud, setHud] = useState(INITIAL_HUD);
  const [showMessage, setShowMessage] = useState(true);
  const [storedHighScore] = useState(getHighScore);

  // Se o jogador passa o recorde, ele sobe junto com a pontuação (como no original).
  const highScore = Math.max(storedHighScore, hud.score);

  const handleHudChange = useCallback((snapshot) => {
    setHud(snapshot);
  }, []);

  const { canvasRef, restart, togglePause } = useGame({ onHudChange: handleHudChange });

  useEffect(() => {
    if (hud.status === 'playing') {
      setShowMessage(true);
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [hud.stage, hud.status]);

  // Fim de jogo: ponto de entrada para salvar a pontuação no futuro.
  useEffect(() => {
    if (hud.status === 'lost') saveHighScore(hud.score);
  }, [hud.status, hud.score]);

  let overlay = null;

  if (hud.status === 'paused') {
    overlay = (
      <div className={styles.overlay}>
        <h2>JOGO PAUSADO</h2>
        <button type="button" className={styles.button} onClick={togglePause}>
          Continuar
        </button>
        <button type="button" className={styles.button} onClick={() => navigate('/')}>
          Voltar ao Menu
        </button>
      </div>
    );
  } else if (hud.status !== 'playing') {
    overlay = (
      <div className={styles.overlay}>
        <h2 className={hud.status === 'won' ? styles.win : styles.lose}>
          {hud.status === 'won' ? 'VITÓRIA!' : 'GAME OVER'}
        </h2>
        <p>Score final: {hud.score} · Fase Alcançada: {hud.stage}</p>
        <button type="button" className={styles.button} onClick={restart}>
          Reiniciar
        </button>
      </div>
    );
  }

  return (
    <section className={styles.page}>
      {/* Mesmo fundo de estrelas da tela inicial */}
      <StarfieldBackground />

      <div className={styles.layout}>
        <GameCanvas
          ref={canvasRef}
          overlay={
            <>
              {overlay}
              {/* Mensagem flutuante que some sozinha */}
              {showMessage && hud.status === 'playing' && (
                <div className={styles.stageMessage}>
                  <h1 className={styles.stageText}>
                    {hud.isChallengeStage ? 'CHALLENGE STAGE' : `STAGE ${hud.stage}`}
                  </h1>
                </div>
              )}
            </>
          }
        />

        {/* Painel lateral: recorde, pontuação e vidas */}
        <HUD
          score={hud.score}
          highScore={highScore}
          lives={hud.lives}
          onExit={() => navigate('/')}
        />
      </div>

      <p className={styles.help}>← → / A D: mover · Espaço: atirar · ESC: Pausar</p>
    </section>
  );
}