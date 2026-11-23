import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameCanvas from '../components/GameCanvas';
import HUD from '../components/HUD';
import StarfieldBackground from '../components/StarfieldBackground';
import TouchControls from '../components/TouchControls';
import { useAuth } from '../contexts/AuthContext';
import { usePendingScore } from '../contexts/PendingScoreContext';
import { PLAYER_LIVES } from '../game/constants';
import { getHighScore } from '../game/highScore';
import { formatTime } from '../game/scoring';
import { useGame } from '../game/useGame';
import { submitScore } from '../services/scoreService';
import styles from './GamePage.module.css';

const INITIAL_HUD = {
  score: 0,
  lives: PLAYER_LIVES,
  status: 'playing',
  stage: 1,
  isChallengeStage: false,
  elapsedMs: 0,
  timeBonus: 0,
  lifeBonus: 0,
  finalScore: 0,
};

// Situação do envio da pontuação ao ranking.
// status: 'idle' | 'saving' | 'saved' | 'error' | 'pending'
//   pending = partida sem sessão; a pontuação está em memória (contexto).
const INITIAL_SAVE = { status: 'idle', best: null };

export default function GamePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setPendingScore } = usePendingScore();

  const [hud, setHud] = useState(INITIAL_HUD);
  const [showMessage, setShowMessage] = useState(true);
  const [save, setSave] = useState(INITIAL_SAVE);

  // Recorde global vindo do Supabase (0 enquanto carrega ou se falhar).
  const [storedHighScore, setStoredHighScore] = useState(0);

  // Estado para navegação por teclado nos menus
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Garante que o fim de cada partida seja tratado uma única vez.
  const endHandledRef = useRef(false);

  // Na vitória, a pontuação exibida já inclui os bônus de tempo e vidas.
  const displayScore = hud.status === 'won' ? hud.finalScore : hud.score;
  const highScore = Math.max(storedHighScore, displayScore);

  useEffect(() => {
    let cancelled = false;
    getHighScore().then((value) => {
      if (!cancelled) setStoredHighScore(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleHudChange = useCallback((snapshot) => {
    setHud(snapshot);
    // Quando entra em pause, game over ou vitória, reseta a seleção
    if (snapshot.status !== 'playing') {
      setSelectedIndex(0);
    }
  }, []);

  const { canvasRef, restart, togglePause, setInput } = useGame({
    onHudChange: handleHudChange,
  });

  useEffect(() => {
    if (hud.status === 'playing') {
      setShowMessage(true);
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [hud.stage, hud.status]);

  // Envia a pontuação ao Supabase (exige sessão). O RPC só atualiza o recorde
  // se a nova pontuação for maior e devolve a linha atual do jogador.
  const saveScore = useCallback(async (score) => {
    setSave({ status: 'saving', best: null });
    try {
      const row = await submitScore(score);
      setSave({ status: 'saved', best: row.best_score });
      setStoredHighScore((prev) => Math.max(prev, row.best_score));
    } catch (err) {
      console.error('[ranking] falha ao salvar a pontuação', err);
      setSave({ status: 'error', best: null });
    }
  }, []);

  // Fim de partida: com sessão, grava no ranking; sem sessão, guarda a
  // pontuação em memória (PendingScoreContext) e oferece login/cadastro.
  useEffect(() => {
    const ended = hud.status === 'lost' || hud.status === 'won';

    if (!ended) {
      // Nova partida: libera o tratamento do próximo fim de jogo.
      if (hud.status === 'playing') {
        endHandledRef.current = false;
        setSave(INITIAL_SAVE);
      }
      return;
    }

    if (authLoading || endHandledRef.current) return;
    endHandledRef.current = true;

    if (hud.finalScore <= 0) return; // nada a registrar

    if (user) {
      saveScore(hud.finalScore);
    } else {
      // Mantém a maior pontuação pendente (em memória, sem localStorage).
      setPendingScore((prev) => Math.max(prev ?? 0, hud.finalScore));
      setSave({ status: 'pending', best: null });
    }
  }, [hud.status, hud.finalScore, user, authLoading, saveScore, setPendingScore]);

  // Ações do menu dependendo do status
  let menuActions = [];
  if (hud.status === 'paused') {
    menuActions = [
      { label: 'Continuar', action: togglePause },
      { label: 'Voltar ao Menu', action: () => navigate('/') },
    ];
  } else if (hud.status === 'won' || hud.status === 'lost') {
    menuActions = [{ label: 'Reiniciar', action: restart }];

    if (save.status === 'pending') {
      menuActions.push(
        { label: 'Entrar', action: () => navigate('/login') },
        { label: 'Criar conta', action: () => navigate('/register') },
      );
    }
    if (save.status === 'saved') {
      menuActions.push({
        label: 'Ver Ranking',
        action: () => navigate('/leaderboard'),
      });
    }
    if (save.status === 'error') {
      menuActions.push({
        label: 'Tentar de novo',
        action: () => saveScore(hud.finalScore),
      });
    }

    menuActions.push({ label: 'Voltar ao Menu', action: () => navigate('/') });
  }

  // Escuta as teclas para navegar no menu
  useEffect(() => {
    if (menuActions.length === 0) return;

    const handleMenuKeys = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (e.code === 'ArrowUp')
            return prev > 0 ? prev - 1 : menuActions.length - 1;
          return prev < menuActions.length - 1 ? prev + 1 : 0;
        });
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        menuActions[selectedIndex]?.action();
      }
    };

    window.addEventListener('keydown', handleMenuKeys);
    return () => window.removeEventListener('keydown', handleMenuKeys);
  }, [menuActions, selectedIndex]);

  // Mensagem sobre o envio ao ranking (classes já existem em GamePage.module.css).
  let saveMessage = null;
  let saveClass = styles.info;
  if (save.status === 'saving') {
    saveMessage = 'Salvando no ranking...';
  } else if (save.status === 'saved') {
    if (save.best > hud.finalScore) {
      saveMessage = `Seu recorde continua ${save.best}.`;
    } else {
      saveMessage = 'Novo recorde salvo no ranking!';
      saveClass = styles.ok;
    }
  } else if (save.status === 'error') {
    saveMessage = 'Não foi possível salvar a pontuação.';
    saveClass = styles.error;
  } else if (save.status === 'pending') {
    saveMessage = 'Entre ou crie uma conta para registrar no ranking.';
  }

  let overlay = null;

  if (hud.status !== 'playing') {
    overlay = (
      <div className={styles.overlay}>
        <h2
          className={
            hud.status === 'won'
              ? styles.win
              : hud.status === 'lost'
                ? styles.lose
                : ''
          }
        >
          {hud.status === 'won'
            ? 'VOCÊ VENCEU!'
            : hud.status === 'lost'
              ? 'GAME OVER'
              : 'JOGO PAUSADO'}
        </h2>

        {hud.status === 'won' && (
          <>
            <p>Pontos: {hud.score}</p>
            <p>
              Bônus de tempo ({formatTime(hud.elapsedMs)}): +{hud.timeBonus}
            </p>
            <p>
              Bônus de vidas (x{hud.lives}): +{hud.lifeBonus}
            </p>
            <p>Score final: {hud.finalScore}</p>
          </>
        )}

        {hud.status === 'lost' && (
          <p>
            Score final: {hud.score} · Fase: {hud.stage}
          </p>
        )}

        {saveMessage && (
          <p className={`${styles.saveMessage} ${saveClass}`} role="status">
            {saveMessage}
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
                    {hud.isChallengeStage
                      ? 'CHALLENGE STAGE'
                      : `STAGE ${hud.stage}`}
                  </h1>
                </div>
              )}
            </>
          }
        />

        <HUD
          score={displayScore}
          highScore={highScore}
          lives={hud.lives}
          elapsedMs={hud.elapsedMs}
        />
      </div>

      <TouchControls onInput={setInput} onPause={togglePause} />

      <p className={styles.help}>
        ← → / A D: mover · Espaço: atirar · ESC: Pausar
      </p>
    </section>
  );
}