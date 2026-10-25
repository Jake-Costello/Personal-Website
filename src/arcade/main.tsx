import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/space-grotesk';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import ArcadeHub from './ArcadeHub';
import './arcade.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ArcadeHub />
  </React.StrictMode>,
);
