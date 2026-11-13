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

  // Estado para navegação por teclado nos menus
  const [selectedIndex, setSelectedIndex] = useState(0);

  const highScore = Math.max(storedHighScore, hud.score);

  const handleHudChange = useCallback((snapshot) => {
    setHud(snapshot);
    // Quando entra em pause, game over ou vitória, reseta a seleção
    if (snapshot.status !== 'playing') {
      setSelectedIndex(0);
    }
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

  // Fim de jogo: salva a pontuação no recorde se perder OU se ganhar.
  useEffect(() => {
    if (hud.status === 'lost' || hud.status === 'won') {
      saveHighScore(hud.score);
    }
  }, [hud.status, hud.score]);

  // Ações do menu dependendo do status
  let menuActions = [];
  if (hud.status === 'paused') {
    menuActions = [
      { label: 'Continuar', action: togglePause },
      { label: 'Voltar ao Menu', action: () => navigate('/') },
    ];
  } else if (hud.status === 'won' || hud.status === 'lost') {
    menuActions = [
      { label: 'Reiniciar', action: restart },
      { label: 'Voltar ao Menu', action: () => navigate('/') },
    ];
  }

  // Escuta as teclas para navegar no menu
  useEffect(() => {
    if (menuActions.length === 0) return;

    const handleMenuKeys = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (e.code === 'ArrowUp') return prev > 0 ? prev - 1 : menuActions.length - 1;
          return prev < menuActions.length - 1 ? prev + 1 : 0;
        });
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        menuActions[selectedIndex].action();
      }
    };

    window.addEventListener('keydown', handleMenuKeys);
    return () => window.removeEventListener('keydown', handleMenuKeys);
  }, [menuActions, selectedIndex]);

  let overlay = null;

  if (hud.status !== 'playing') {
    overlay = (
      <div className={styles.overlay}>
        <h2
          className={
            hud.status === 'won' ? styles.win : hud.status === 'lost' ? styles.lose : ''
          }
        >
          {hud.status === 'won'
            ? 'VOCÊ VENCEU!'
            : hud.status === 'lost'
              ? 'GAME OVER'
              : 'JOGO PAUSADO'}
        </h2>

        {hud.status !== 'paused' && (
          <p>
            Score final: {hud.score} · Fase: {hud.stage}
          </p>
        )}

        <nav className={styles.menu} aria-label="Menu do jogo">
          {menuActions.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={styles.item}
              data-selected={index === selectedIndex}
              onClick={item.action}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className={styles.arrow} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <StarfieldBackground />

      <div className={styles.layout}>
        <GameCanvas
          ref={canvasRef}
          overlay={
            <>
              {overlay}
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

        <HUD score={hud.score} highScore={highScore} lives={hud.lives} />
      </div>

      <p className={styles.help}>← → / A D: mover · Espaço: atirar · ESC: Pausar</p>
    </section>
  );
}