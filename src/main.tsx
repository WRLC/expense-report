import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

// A deployment can replace lazy-loaded chunks while an installed PWA still has
// an older page open. Refresh once when Vite reports that stale chunk failure.
const staleChunkReloadKey = 'wrlc-stale-chunk-reload';
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  if (sessionStorage.getItem(staleChunkReloadKey)) {
    sessionStorage.removeItem(staleChunkReloadKey);
    window.alert('The app was updated, but a file is still unavailable. Please close and reopen the app, or try again in a moment.');
    return;
  }
  sessionStorage.setItem(staleChunkReloadKey, '1');
  void navigator.serviceWorker?.getRegistration().then((registration) => registration?.update()).catch(() => undefined).finally(() => {
    window.location.reload();
  });
});

registerSW({ immediate: true });
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
