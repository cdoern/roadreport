import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Capture the PWA install prompt so it can be triggered by the UI.
// The event fires on Android Chrome; iOS Safari uses a different flow.
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e as BeforeInstallPromptEvent;
  // Dispatch a custom event so App.tsx can react without direct coupling.
  window.dispatchEvent(new CustomEvent('pwa-install-ready'));
});

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredInstallPrompt;
}

export function clearDeferredInstallPrompt(): void {
  deferredInstallPrompt = null;
}

// Minimal type augmentation — the BeforeInstallPromptEvent is not in lib.dom.d.ts yet.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

// React.StrictMode intentionally double-invokes effects in development.
// react-leaflet v4 does not clean up the Leaflet instance between cycles,
// so StrictMode causes "Map container is already initialized" and crashes
// the app in dev mode. Removed here; production behaviour is unaffected.
ReactDOM.createRoot(root).render(<App />);
