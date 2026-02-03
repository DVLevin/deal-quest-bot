import '@/app/globals.css';
import { createRoot } from 'react-dom/client';
import { initTelegramSDK } from '@/lib/telegram';
import App from '@/app/App';

// Enable mobile debug console (temporarily for production debugging)
import('eruda').then((m) => m.default.init());

// Initialize Telegram SDK with error handling
try {
  initTelegramSDK();
} catch (err) {
  console.error('Telegram SDK init failed:', err);
  document.body.innerHTML = `<pre style="color:red;padding:1rem;">${err}</pre>`;
  throw err;
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(<App />);
