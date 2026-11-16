import { z } from 'zod';

// Limites iguais aos do banco (supabase/schema.sql: display_name entre 3 e 20).
export const DISPLAY_NAME_MIN = 3;
export const DISPLAY_NAME_MAX = 20;
export const PASSWORD_MIN = 6;

const emailField = z
  .string()
  .trim()
  .min(1, 'Informe seu e-mail.')
  .pipe(z.email('Informe um e-mail válido.'));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Informe sua senha.'),
});

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(
        DISPLAY_NAME_MIN,
        `O nome deve ter ao menos ${DISPLAY_NAME_MIN} caracteres.`,
      )
      .max(
        DISPLAY_NAME_MAX,
        `O nome deve ter no máximo ${DISPLAY_NAME_MAX} caracteres.`,
      )
      .refine(
        (value) => !value.includes('@'),
        'Não use um e-mail como nome: ele aparece no ranking.',
      ),
    email: emailField,
    password: z
      .string()
      .min(PASSWORD_MIN, `A senha deve ter ao menos ${PASSWORD_MIN} caracteres.`),
    confirmPassword: z.string().min(1, 'Repita a senha.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'As senhas não são iguais.',
    path: ['confirmPassword'],
  });

/**
 * Executa um schema Zod e devolve os erros por campo (primeira mensagem de cada).
 * @returns {{ success: boolean, data: any, errors: Record<string, string> }}
 */
export function validate(schema, values) {
  const result = schema.safeParse(values);
  if (result.success) {
    return { success: true, data: result.data, errors: {} };
  }

  const errors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { success: false, data: null, errors };
}