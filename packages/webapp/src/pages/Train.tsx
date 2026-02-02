import { Card } from '@/shared/ui';
import { useAuthStore } from '@/features/auth/store';

export default function Train() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return (
    <div className="space-y-4 px-4 pt-4">
      <h1 className="text-xl font-bold text-text">Train</h1>
      <Card>
        <p className="text-sm text-text-hint">
          Telegram ID: <span className="font-mono text-text">{telegramId}</span>
        </p>
      </Card>
      <Card>
        <p className="text-sm text-text-hint">
          Role-play scenarios and practice simulations will appear here.
        </p>
      </Card>
    </div>
  );
}
