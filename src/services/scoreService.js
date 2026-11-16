import { supabase } from './supabaseClient';

/** Ranking público, ordenado do maior para o menor. */
export async function fetchRanking(limit = 20) {
  const { data, error } = await supabase
    .from('scores')
    .select('user_id, display_name, best_score, updated_at')
    .order('best_score', { ascending: false })
    .order('updated_at', { ascending: true }) // desempate: quem chegou primeiro
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Recorde do usuário logado (ou null se nunca jogou). */
export async function fetchMyHighScore(userId) {
  const { data, error } = await supabase
    .from('scores')
    .select('best_score')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.best_score ?? 0;
}

/** Cria o registro ou atualiza o recorde se a nova pontuação for maior. */
export async function submitScore(score) {
  const { data, error } = await supabase.rpc('submit_score', { p_score: score });
  if (error) throw error;
  return data;
}