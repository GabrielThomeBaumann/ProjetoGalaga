import { supabase } from './supabaseClient';

// Traduz os erros do Supabase Auth para mensagens que a pessoa entende.
function translateError(error) {
  const message = (error?.message ?? '').toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'Este e-mail já tem uma conta. Entre com ela.';
  }
  if (message.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada.';
  }
  if (error?.status === 429 || message.includes('rate limit')) {
    return 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}

function fail(error) {
  throw new Error(translateError(error), { cause: error });
}

export async function signUp({ email, password, displayName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) fail(error);
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) fail(error);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) fail(error);
}