import { supabase } from './supabaseClient';

// Traduz os erros do Supabase Auth para mensagens que a pessoa entende.
function translateError(error) {
  const message = (error?.message ?? '').toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    return 'Este e-mail já tem uma conta. Entre com ela.';
  }
  if (message.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada.';
  }
  if (error?.status === 429 || message.includes('rate limit')) {
    return 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.';
  }
  if (message.includes('sending confirmation email')) {
    return 'Não foi possível enviar o e-mail de confirmação. Tente novamente em alguns minutos.';
  }
  if (message.includes('signups not allowed') || message.includes('signup is disabled')) {
    return 'Novos cadastros estão desativados no momento.';
  }
  if (message.includes('email address') && message.includes('invalid')) {
    return 'Este e-mail foi recusado. Use um endereço real.';
  }
  if (message.includes('password') && message.includes('characters')) {
    return 'A senha é curta demais.';
  }
  if (message.includes('database error')) {
    return 'Erro no banco ao criar a conta. Verifique os triggers da tabela auth.users.';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}

function fail(error) {
  // Mostra o erro original para facilitar o diagnóstico.
  console.error('[auth]', error?.status, error?.code, error?.message, error);
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
