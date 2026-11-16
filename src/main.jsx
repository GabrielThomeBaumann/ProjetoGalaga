import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './contexts/AuthContext';
import { PendingScoreProvider } from './contexts/PendingScoreContext';
import { applyTheme, getStoredTheme } from './theme/theme';
import './styles/global.css';

applyTheme(getStoredTheme());

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root não encontrado');

createRoot(container).render(
  <StrictMode>
    <AuthProvider>
      <PendingScoreProvider>
        <RouterProvider router={router} />
      </PendingScoreProvider>
    </AuthProvider>
  </StrictMode>,
);