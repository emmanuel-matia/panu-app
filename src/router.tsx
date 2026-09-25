import React from 'react';
import App from './App';

/**
 * Routeur principal PANU garantissant le chargement direct de l'accueil.
 * Évite toute erreur 404 (Page Not Found).
 */
export const routes = [
  { path: '/', element: <App /> },
  { path: '/home', element: <App /> },
  { path: '/router', element: <App /> },
  { path: '/feed', element: <App /> },
  { path: '*', element: <App /> } // Fallback automatique sur l'accueil
];

export default routes;
