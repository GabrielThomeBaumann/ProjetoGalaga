import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { usePendingScore } from '../contexts/PendingScoreContext';
import { useAfterAuth } from '../hooks/useAfterAuth';
import { signIn } from '../services/authService';
import formStyles from '../styles/AuthForm.module.css';
import { loginSchema, validate } from '../validation/authSchemas';

export default function LoginPage() {
  const afterAuth = useAfterAuth();
  const { pendingScore } = usePendingScore();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((current) => ({ ...current, [name]: value }));
    // Limpa o erro do campo assim que a pessoa volta a digitar nele.
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const result = validate(loginSchema, values);
    setErrors(result.errors);
    if (!result.success) return;

    setSubmitting(true);
    try {
      await signIn(result.data);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
      return;
    }

    try {
      await afterAuth();
    } catch {
      setSubmitError(
        'Você entrou, mas não foi possível registrar a pontuação. Envie o formulário de novo para tentar outra vez.',
      );
      setSubmitting(false);
    }
  };

  const notice =
    pendingScore !== null ? (
      <>
        Você fez <strong>{pendingScore}</strong> pontos. Entre para registrar no
        ranking.
      </>
    ) : null;

  return (
    <AuthLayout
      title="Login"
      notice={notice}
      footer={
        <>
          <p>
            Ainda não tem conta?{' '}
            <Link className={formStyles.link} to="/register">
              Criar conta
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
          id="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          autoFocus
          value={values.email}
          onChange={handleChange}
          error={errors.email}
        />

        <FormField
          id="password"
          label="Senha"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
        />

        {submitError && (
          <p className={formStyles.formError} role="alert">
            {submitError}
          </p>
        )}

        <button type="submit" className={formStyles.submit} disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </AuthLayout>
  );
}