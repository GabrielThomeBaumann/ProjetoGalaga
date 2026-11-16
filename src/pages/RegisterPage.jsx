import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { usePendingScore } from '../contexts/PendingScoreContext';
import { useAfterAuth } from '../hooks/useAfterAuth';
import { signUp } from '../services/authService';
import formStyles from '../styles/AuthForm.module.css';
import {
  DISPLAY_NAME_MAX,
  registerSchema,
  validate,
} from '../validation/authSchemas';

const INITIAL_VALUES = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterPage() {
  const afterAuth = useAfterAuth();
  const { pendingScore } = usePendingScore();

  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const result = validate(registerSchema, values);
    setErrors(result.errors);
    if (!result.success) return;

    const { displayName, email, password } = result.data;

    setSubmitting(true);
    let data;
    try {
      data = await signUp({ displayName, email, password });
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
      return;
    }

    // Com "Confirm email" ligado no Supabase, o cadastro não cria sessão.
    if (!data.session) {
      setNeedsConfirmation(true);
      setSubmitting(false);
      return;
    }

    try {
      await afterAuth();
    } catch {
      setSubmitError(
        'Conta criada, mas não foi possível registrar a pontuação. Entre pela tela de login para tentar de novo.',
      );
      setSubmitting(false);
    }
  };

  if (needsConfirmation) {
    return (
      <AuthLayout
        title="Confirme seu e-mail"
        footer={
          <Link className={formStyles.link} to="/login">
            Ir para o login
          </Link>
        }
      >
        <p className={formStyles.success} role="status">
          Conta criada! Enviamos um link de confirmação para {values.email.trim()}.
          Depois de confirmar, entre para jogar
          {pendingScore !== null ? ' e registrar sua pontuação.' : '.'}
        </p>
      </AuthLayout>
    );
  }

  const notice =
    pendingScore !== null ? (
      <>
        Você fez <strong>{pendingScore}</strong> pontos. Crie uma conta para
        registrar no ranking.
      </>
    ) : null;

  return (
    <AuthLayout
      title="Criar conta"
      notice={notice}
      footer={
        <>
          <p>
            Já tem conta?{' '}
            <Link className={formStyles.link} to="/login">
              Entrar
            </Link>
          </p>
          <Link className={formStyles.link} to="/">
            Voltar ao menu
          </Link>
        </>
      }
    >
      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        <FormField
          id="displayName"
          label="Nome no ranking"
          type="text"
          autoComplete="nickname"
          autoFocus
          maxLength={DISPLAY_NAME_MAX + 10}
          value={values.displayName}
          onChange={handleChange}
          error={errors.displayName}
        />

        <FormField
          id="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange}
          error={errors.email}
        />

        <FormField
          id="password"
          label="Senha"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
        />

        <FormField
          id="confirmPassword"
          label="Repita a senha"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />

        {submitError && (
          <p className={formStyles.formError} role="alert">
            {submitError}
          </p>
        )}

        <button type="submit" className={formStyles.submit} disabled={submitting}>
          {submitting ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
    </AuthLayout>
  );
}