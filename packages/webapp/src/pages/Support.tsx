import { Card } from '@/shared/ui';
import { useAuthStore } from '@/features/auth/store';

export default function Support() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return (
    <div className="space-y-4 px-4 pt-4">
      <h1 className="text-xl font-bold text-text">Support</h1>
      <Card>
        <p className="text-sm text-text-hint">
          Telegram ID: <span className="font-mono text-text">{telegramId}</span>
        </p>
      </Card>
      <Card>
        <p className="text-sm text-text-hint">
          AI deal support and coaching assistance will appear here.
        </p>
      </Card>
    </div>
  );
}
