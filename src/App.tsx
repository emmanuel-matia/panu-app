import React from 'react';

/**
 * Composant principal de routage PANU (PWA & Web).
 * Charge immédiatement la page d'accueil sans renvoyer d'erreur 404.
 */
export const App: React.FC = () => {
  return (
    <div style={{ backgroundColor: '#121214', color: '#F8F9FA', minHeight: '100vh', padding: '20px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '20px' }}>
        <h1 style={{ color: '#E5A93C', fontSize: '24px', fontWeight: 900 }}>PANU</h1>
        <span>Studio Créatif & VOD Afrique</span>
      </header>
      <main>
        <h2>Fil des Créateurs</h2>
        <p>Bienvenue sur PANU. L'application charge directement l'accueil sans erreur 404.</p>
      </main>
    </div>
  );
};

export default App;
