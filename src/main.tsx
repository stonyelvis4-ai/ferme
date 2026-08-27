import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AppErrorBoundary from './components/AppErrorBoundary.tsx';
import './index.css';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

if ('serviceWorker' in navigator && viteEnv?.MODE === 'production') {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
