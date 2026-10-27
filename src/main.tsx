// Self-hosted font (no request to Google Fonts: visitors' IP addresses are not sent to a third party).
import '@fontsource-variable/inter';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
