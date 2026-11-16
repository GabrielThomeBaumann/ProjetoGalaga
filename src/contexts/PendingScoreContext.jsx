import { createContext, useContext, useState } from 'react';

const PendingScoreContext = createContext(null);

export function PendingScoreProvider({ children }) {
  const [pendingScore, setPendingScore] = useState(null); // null = nada pendente
  return (
    <PendingScoreContext.Provider value={{ pendingScore, setPendingScore }}>
      {children}
    </PendingScoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePendingScore = () => useContext(PendingScoreContext);