import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import styles from './styles/App.module.css';

// Só estas rotas usam a navbar. As demais (menu, jogo, configurações, login,
// cadastro, conta e 404) são telas cheias com fundo de estrelas.
const ROUTES_WITH_NAVBAR = ['/leaderboard', '/achievements'];

function linkClass({ isActive }) {
  return isActive ? `${styles.link} ${styles.active}` : styles.link;
}

export default function App() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const showNavbar = ROUTES_WITH_NAVBAR.includes(pathname);

  return (
    <div className={styles.shell}>
      {showNavbar && (
        <nav className={styles.nav}>
          <NavLink to="/" end className={linkClass}>
            Início
          </NavLink>
          <NavLink to="/game" className={linkClass}>
            Jogo
          </NavLink>
          <NavLink to="/leaderboard" className={linkClass}>
            Leaderboard
          </NavLink>
          <NavLink to="/achievements" className={linkClass}>
            Conquistas
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            Configurações
          </NavLink>
          {user ? (
            <NavLink to="/account" className={linkClass}>
              Conta
            </NavLink>
          ) : (
            <NavLink to="/login" className={linkClass}>
              Login
            </NavLink>
          )}
        </nav>
      )}
      <main
        className={
          showNavbar ? styles.main : `${styles.main} ${styles.mainCentered}`
        }
      >
        <Outlet />
      </main>
    </div>
  );
}