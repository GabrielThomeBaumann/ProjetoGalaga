import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import formStyles from '../styles/AuthForm.module.css';

export default function NotFoundPage() {
  return (
    <AuthLayout
      title="404"
      subtitle="Essa página não existe ou foi movida."
    >
      <Link className={formStyles.submit} to="/">
        Voltar ao menu
      </Link>
    </AuthLayout>
  );
}