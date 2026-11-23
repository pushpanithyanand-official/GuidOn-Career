import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthGate from './auth/AuthGate';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>,
);
