import { useLocation, useNavigate } from 'react-router-dom';
import { usePendingScore } from '../contexts/PendingScoreContext';
import { submitScore } from '../services/scoreService';

/**
 * Passo final de login/cadastro.
 * - Se há uma pontuação pendente (partida jogada sem conta), grava no Supabase,
 *   limpa a pendência e leva ao ranking.
 * - Se não, volta para a página que a pessoa tentava acessar (ou para o início).
 *
 * Se a gravação falhar, lança o erro e MANTÉM a pontuação pendente em memória.
 */
export function useAfterAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingScore, setPendingScore } = usePendingScore();
  const from = location.state?.from ?? '/';

  return async function afterAuth() {
    if (pendingScore !== null) {
      await submitScore(pendingScore);
      setPendingScore(null);
      navigate('/leaderboard', { replace: true });
      return;
    }
    navigate(from, { replace: true });
  };
}