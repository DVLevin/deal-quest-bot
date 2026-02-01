import '@/app/globals.css';
import { createRoot } from 'react-dom/client';
import { initTelegramSDK } from '@/lib/telegram';
import App from '@/app/App';

// Initialize Telegram SDK before rendering
initTelegramSDK();

// Initialize mobile debugging console in development
if (import.meta.env.DEV) {
  import('eruda').then((m) => m.default.init());
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(<App />);
