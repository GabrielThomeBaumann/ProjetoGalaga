import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email, password) {
  const errors = {};
  if (!EMAIL_REGEX.test(email)) errors.email = 'Informe um e-mail válido.';
  if (password.length < 6) {
    errors.password = 'A senha deve ter ao menos 6 caracteres.';
  }
  return errors;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate(email, password);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      // Mock: sem backend nesta fase.
      navigate('/');
    }
  };

  return (
    <section className={styles.page}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>Login</h1>

        <label className={styles.label} htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        {errors.email && <span className={styles.error}>{errors.email}</span>}

        <label className={styles.label} htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {errors.password && (
          <span className={styles.error}>{errors.password}</span>
        )}

        <button type="submit" className={styles.button}>
          Entrar
        </button>
      </form>
    </section>
  );
}